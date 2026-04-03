import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db, components, maintenanceEvents, bikes, rideLogs } from "@bike-check/db";
import { eq, and, gte, lt } from "drizzle-orm";
import { createMaintenanceEventSchema } from "@bike-check/shared";
import type { TrainerType, ComponentType, BrakeType } from "@bike-check/shared";
import { calculateWearDistance } from "@bike-check/core";

/** POST /api/components/:id/replace — mark a component as replaced */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: componentId } = await params;
  const body = await request.json();
  const parsed = createMaintenanceEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

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

  const replaceDate = parsed.data.date;
  const today = new Date().toISOString().split("T")[0];
  const isBackdated = replaceDate < today;

  // When replacement date is in the past, recalculate km so that:
  // - distanceAtEvent = km from component installDate → replaceDate (old part's real usage)
  // - new component starts with km from replaceDate → today (rides done on the new part)
  let distanceAtEvent = comp.components.currentDistanceKm;
  let hoursAtEvent = comp.components.currentHours;
  let newDistanceKm = "0";
  let newHours = "0";

  if (isBackdated) {
    const { users } = await import("@bike-check/db");
    const [user] = await db
      .select({ trainerType: users.trainerType })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);
    const trainerType = (user?.trainerType ?? "none") as TrainerType;
    const bikeData = comp.bikes;
    const componentType = comp.components.type as ComponentType;
    const brakeType = (bikeData.brakeType as BrakeType) ?? undefined;
    const isTrainerHardware = bikeData.isTrainer;

    // Rides from replaceDate onward (these belong to the NEW component)
    const ridesAfter = await db
      .select({
        distanceKm: rideLogs.distanceKm,
        movingTimeSeconds: rideLogs.movingTimeSeconds,
        isIndoor: rideLogs.isIndoor,
        conditions: rideLogs.conditions,
      })
      .from(rideLogs)
      .where(
        and(
          eq(rideLogs.bikeId, comp.components.bikeId),
          gte(rideLogs.date, replaceDate),
        ),
      );

    let afterKm = 0;
    let afterHours = 0;
    for (const ride of ridesAfter) {
      const dist = parseFloat(ride.distanceKm);
      const time = ride.movingTimeSeconds ?? 0;
      if (isTrainerHardware) {
        const mult = parseFloat(comp.components.indoorWearMultiplier?.toString() ?? "1");
        afterKm += dist * mult;
        afterHours += (time / 3600) * mult;
      } else {
        const wear = calculateWearDistance({
          rideDistanceKm: dist,
          rideTimeSeconds: time,
          isIndoor: ride.isIndoor,
          conditions: ride.conditions as any,
          trainerType,
          componentType,
          brakeType,
        });
        afterKm += wear.effectiveDistanceKm;
        afterHours += wear.effectiveHours;
      }
    }

    // Old component's real usage = total current - rides after replacement
    const oldTotalKm = parseFloat(comp.components.currentDistanceKm);
    const oldTotalHours = parseFloat(comp.components.currentHours);
    distanceAtEvent = Math.max(0, oldTotalKm - afterKm).toFixed(2);
    hoursAtEvent = Math.max(0, oldTotalHours - afterHours).toFixed(2);
    newDistanceKm = afterKm.toFixed(2);
    newHours = afterHours.toFixed(2);
  }

  // Create maintenance event (snapshot old component's usage up to replacement)
  await db.insert(maintenanceEvents).values({
    componentId,
    eventType: parsed.data.eventType,
    date: replaceDate,
    distanceAtEvent,
    hoursAtEvent,
    costCents: parsed.data.costCents,
    notes: parsed.data.notes,
    newBrand: parsed.data.newBrand,
    newModel: parsed.data.newModel,
  });

  // Reset component with correct starting km for the new part
  await db
    .update(components)
    .set({
      currentDistanceKm: newDistanceKm,
      currentHours: newHours,
      installDate: replaceDate,
      brand: parsed.data.newBrand ?? comp.components.brand,
      model: parsed.data.newModel ?? comp.components.model,
      updatedAt: new Date(),
    })
    .where(eq(components.id, componentId));

  return NextResponse.json({ ok: true });
}
