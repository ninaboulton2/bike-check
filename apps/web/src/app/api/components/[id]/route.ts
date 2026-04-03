import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db, components, bikes, rideLogs } from "@bike-check/db";
import { eq, and, gte, or, isNull } from "drizzle-orm";
import { updateComponentSchema } from "@bike-check/shared";
import { calculateWearDistance } from "@bike-check/core";
import type { TrainerType, ComponentType, BrakeType, Condition } from "@bike-check/shared";

/** GET /api/components/:id — get a component with bike info */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: componentId } = await params;

  const [result] = await db
    .select({
      component: components,
      bikeName: bikes.name,
      bikeId: bikes.id,
      bikeType: bikes.type,
    })
    .from(components)
    .innerJoin(bikes, eq(bikes.id, components.bikeId))
    .where(and(eq(components.id, componentId), eq(bikes.userId, session.userId)))
    .limit(1);

  if (!result) {
    return NextResponse.json({ error: "Component not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...result.component,
    bikeName: result.bikeName,
    bikeId: result.bikeId,
    bikeType: result.bikeType,
  });
}

/** PATCH /api/components/:id — update a component */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: componentId } = await params;
  const body = await request.json();
  const parsed = updateComponentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Verify the component belongs to the user and get the bike
  const [result] = await db
    .select({ component: components, bike: bikes })
    .from(components)
    .innerJoin(bikes, eq(bikes.id, components.bikeId))
    .where(and(eq(components.id, componentId), eq(bikes.userId, session.userId)))
    .limit(1);

  if (!result) {
    return NextResponse.json({ error: "Component not found" }, { status: 404 });
  }

  const oldInstallDate = result.component.installDate;

  // Build update object, converting numbers to string for numeric DB columns
  const update: Record<string, unknown> = { updatedAt: new Date() };
  const d = parsed.data;
  if (d.brand !== undefined) update.brand = d.brand;
  if (d.model !== undefined) update.model = d.model;
  if (d.name !== undefined) update.name = d.name;
  if (d.installDate !== undefined) update.installDate = d.installDate;
  if (d.currentDistanceKm !== undefined) update.currentDistanceKm = d.currentDistanceKm.toFixed(2);
  if (d.currentHours !== undefined) update.currentHours = d.currentHours.toFixed(2);
  if (d.thresholdDistanceKm !== undefined) update.thresholdDistanceKm = d.thresholdDistanceKm.toString();
  if (d.thresholdHours !== undefined) update.thresholdHours = d.thresholdHours.toString();
  if (d.thresholdDays !== undefined) update.thresholdDays = d.thresholdDays;
  if (d.costCents !== undefined) update.costCents = d.costCents;
  if (d.notes !== undefined) update.notes = d.notes;
  if (d.wearOnIndoor !== undefined) update.wearOnIndoor = d.wearOnIndoor;
  if (d.indoorWearMultiplier !== undefined) update.indoorWearMultiplier = d.indoorWearMultiplier.toString();
  if (d.batteryTracking !== undefined) update.batteryTracking = d.batteryTracking;
  if (d.batteryLifeHours !== undefined) update.batteryLifeHours = d.batteryLifeHours.toString();
  if (d.careTracking !== undefined) update.careTracking = d.careTracking;
  if (d.careIntervalKm !== undefined) update.careIntervalKm = d.careIntervalKm.toString();
  if (d.careIntervalHours !== undefined) update.careIntervalHours = d.careIntervalHours.toString();

  // If install date changed, reset km to the user-provided base (or 0) so we
  // can recalculate from ride history with the new date.
  const installDateChanged =
    d.installDate !== undefined && d.installDate !== oldInstallDate;
  if (installDateChanged) {
    update.currentDistanceKm = d.currentDistanceKm?.toFixed(2) ?? "0";
    update.currentHours = d.currentHours?.toFixed(2) ?? "0";
  }

  await db
    .update(components)
    .set(update)
    .where(eq(components.id, componentId));

  // Recalculate km from ride history if install date changed
  if (installDateChanged && d.installDate) {
    const [updated] = await db
      .select()
      .from(components)
      .where(eq(components.id, componentId))
      .limit(1);

    if (updated) {
      await recalcComponentFromRides(updated, result.bike, session.userId);
    }
  }

  return NextResponse.json({ ok: true });
}

/** DELETE /api/components/:id — remove a component */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: componentId } = await params;

  // Verify the component belongs to the user
  const [comp] = await db
    .select()
    .from(components)
    .innerJoin(bikes, eq(bikes.id, components.bikeId))
    .where(and(eq(components.id, componentId), eq(bikes.userId, session.userId)))
    .limit(1);

  if (!comp) {
    return NextResponse.json({ error: "Component not found" }, { status: 404 });
  }

  await db.delete(components).where(eq(components.id, componentId));

  return NextResponse.json({ ok: true });
}

// ── Recalculate component km from ride logs ──────────────────────────────

async function recalcComponentFromRides(
  comp: typeof components.$inferSelect,
  bike: typeof bikes.$inferSelect,
  userId: string,
) {
  if (bike.isTrainer) {
    return recalcTrainerComponent(comp, bike, userId);
  }
  return recalcOutdoorComponent(comp, bike, userId);
}

async function recalcTrainerComponent(
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

  if (rides.length === 0) return;

  let totalKm = parseFloat(comp.currentDistanceKm);
  let totalHours = parseFloat(comp.currentHours);

  for (const ride of rides) {
    totalKm += parseFloat(ride.distanceKm) * multiplier;
    totalHours += ((ride.movingTimeSeconds ?? 0) / 3600) * multiplier;
  }

  await db
    .update(components)
    .set({
      currentDistanceKm: totalKm.toFixed(2),
      currentHours: totalHours.toFixed(2),
      updatedAt: new Date(),
    })
    .where(eq(components.id, comp.id));
}

async function recalcOutdoorComponent(
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

  if (rides.length === 0) return;

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

  await db
    .update(components)
    .set({
      currentDistanceKm: totalKm.toFixed(2),
      currentHours: totalHours.toFixed(2),
      updatedAt: new Date(),
    })
    .where(eq(components.id, comp.id));
}
