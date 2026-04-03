import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db, bikes, components, rideLogs } from "@bike-check/db";
import { eq, and, gte, or, isNull } from "drizzle-orm";
import { createComponentSchema } from "@bike-check/shared";
import { calculateWearDistance } from "@bike-check/core";
import type { TrainerType, ComponentType, BrakeType, Condition } from "@bike-check/shared";

/** GET /api/bikes/:id/components — list components for a bike */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  // Verify bike belongs to user
  const [bike] = await db
    .select()
    .from(bikes)
    .where(and(eq(bikes.id, id), eq(bikes.userId, session.userId)))
    .limit(1);

  if (!bike) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const bikeComponents = await db
    .select()
    .from(components)
    .where(eq(components.bikeId, id));

  return NextResponse.json(bikeComponents);
}

/** POST /api/bikes/:id/components — add a component */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: bikeId } = await params;

  // Verify bike belongs to user
  const [bike] = await db
    .select()
    .from(bikes)
    .where(and(eq(bikes.id, bikeId), eq(bikes.userId, session.userId)))
    .limit(1);

  if (!bike) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = createComponentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const [component] = await db
    .insert(components)
    .values({
      bikeId,
      type: parsed.data.type,
      name: parsed.data.name,
      brand: parsed.data.brand,
      model: parsed.data.model,
      installDate: parsed.data.installDate,
      currentDistanceKm: parsed.data.currentDistanceKm?.toFixed(2) ?? "0",
      currentHours: parsed.data.currentHours?.toFixed(2) ?? "0",
      thresholdDistanceKm: parsed.data.thresholdDistanceKm?.toString() ?? null,
      thresholdHours: parsed.data.thresholdHours?.toString() ?? null,
      thresholdDays: parsed.data.thresholdDays ?? null,
      costCents: parsed.data.costCents ?? null,
      wearOnIndoor: parsed.data.wearOnIndoor,
      indoorWearMultiplier: parsed.data.indoorWearMultiplier.toString(),
      batteryTracking: parsed.data.batteryTracking ?? false,
      batteryLifeHours: parsed.data.batteryLifeHours?.toString() ?? null,
      careTracking: parsed.data.careTracking ?? false,
      careIntervalKm: parsed.data.careIntervalKm?.toString() ?? null,
      careIntervalHours: parsed.data.careIntervalHours?.toString() ?? null,
      notes: parsed.data.notes,
    })
    .returning();

  // ── Calculate initial km from ride history after install date ──────────
  if (component.installDate) {
    const updated = await calculateComponentKmFromRides(
      component,
      bike,
      session.userId,
    );
    if (updated) return NextResponse.json(updated, { status: 201 });
  }

  return NextResponse.json(component, { status: 201 });
}

// ── Calculate component km from ride logs ────────────────────────────────

async function calculateComponentKmFromRides(
  comp: typeof components.$inferSelect,
  bike: typeof bikes.$inferSelect,
  userId: string,
) {
  if (bike.isTrainer) {
    return calculateTrainerComponentKm(comp, bike, userId);
  }
  return calculateOutdoorComponentKm(comp, bike, userId);
}

async function calculateTrainerComponentKm(
  comp: typeof components.$inferSelect,
  bike: typeof bikes.$inferSelect,
  userId: string,
) {
  const multiplier = parseFloat(comp.indoorWearMultiplier?.toString() ?? "1");

  const rides = await db
    .select({
      distanceKm: rideLogs.distanceKm,
      movingTimeSeconds: rideLogs.movingTimeSeconds,
    })
    .from(rideLogs)
    .where(
      and(
        eq(rideLogs.userId, userId),
        eq(rideLogs.isIndoor, true),
        gte(rideLogs.date, comp.installDate),
        or(
          bike.linkedBikeId
            ? eq(rideLogs.bikeId, bike.linkedBikeId)
            : undefined,
          eq(rideLogs.bikeId, bike.id),
          isNull(rideLogs.bikeId),
        ),
      ),
    );

  if (rides.length === 0) return null;

  let totalKm = parseFloat(comp.currentDistanceKm);
  let totalHours = parseFloat(comp.currentHours);

  for (const ride of rides) {
    totalKm += parseFloat(ride.distanceKm) * multiplier;
    totalHours += ((ride.movingTimeSeconds ?? 0) / 3600) * multiplier;
  }

  const [updated] = await db
    .update(components)
    .set({
      currentDistanceKm: totalKm.toFixed(2),
      currentHours: totalHours.toFixed(2),
      updatedAt: new Date(),
    })
    .where(eq(components.id, comp.id))
    .returning();

  return updated;
}

async function calculateOutdoorComponentKm(
  comp: typeof components.$inferSelect,
  bike: typeof bikes.$inferSelect,
  userId: string,
) {
  const { users } = await import("@bike-check/db");
  const [user] = await db
    .select({ trainerType: users.trainerType })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const trainerType = (user?.trainerType ?? "none") as TrainerType;
  const brakeType = (bike.brakeType as BrakeType) ?? undefined;

  const rides = await db
    .select({
      distanceKm: rideLogs.distanceKm,
      movingTimeSeconds: rideLogs.movingTimeSeconds,
      isIndoor: rideLogs.isIndoor,
      conditions: rideLogs.conditions,
    })
    .from(rideLogs)
    .where(
      and(
        eq(rideLogs.bikeId, bike.id),
        gte(rideLogs.date, comp.installDate),
      ),
    );

  if (rides.length === 0) return null;

  let totalKm = parseFloat(comp.currentDistanceKm);
  let totalHours = parseFloat(comp.currentHours);

  for (const ride of rides) {
    const wear = calculateWearDistance({
      rideDistanceKm: parseFloat(ride.distanceKm),
      rideTimeSeconds: ride.movingTimeSeconds ?? 0,
      isIndoor: ride.isIndoor ?? false,
      conditions: (ride.conditions as Condition) ?? "dry",
      trainerType: ride.isIndoor ? trainerType : ("none" as TrainerType),
      componentType: comp.type as ComponentType,
      brakeType,
    });
    totalKm += wear.effectiveDistanceKm;
    totalHours += wear.effectiveHours;
  }

  const [updated] = await db
    .update(components)
    .set({
      currentDistanceKm: totalKm.toFixed(2),
      currentHours: totalHours.toFixed(2),
      updatedAt: new Date(),
    })
    .where(eq(components.id, comp.id))
    .returning();

  return updated;
}
