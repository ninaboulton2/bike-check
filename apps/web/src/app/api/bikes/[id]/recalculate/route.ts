import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db, bikes, components, rideLogs } from "@bike-check/db";
import { eq, and, or, isNull, gte } from "drizzle-orm";
import { calculateWearDistance } from "@bike-check/core";
import type { TrainerType, ComponentType, BrakeType, Condition } from "@bike-check/shared";

/**
 * POST /api/bikes/:id/recalculate
 *
 * Rebuilds component km/hours from scratch using ride logs in the DB.
 *
 * For trainer bikes: sums indoor rides using each component's indoorWearMultiplier.
 * For outdoor bikes: sums all attributed rides using the wear engine
 *   (respecting indoor/outdoor, conditions, trainer type).
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: bikeId } = await params;

  const [bike] = await db
    .select()
    .from(bikes)
    .where(and(eq(bikes.id, bikeId), eq(bikes.userId, session.userId)))
    .limit(1);

  if (!bike) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (bike.isTrainer) {
    return recalculateTrainer(bike, bikeId, session.userId);
  }
  return recalculateOutdoorBike(bike, bikeId, session.userId);
}

// ── Trainer bike recalculation ─────────────────────────────────────────────

async function recalculateTrainer(
  bike: typeof bikes.$inferSelect,
  bikeId: string,
  userId: string,
) {
  const trainerComponents = await db
    .select()
    .from(components)
    .where(and(eq(components.bikeId, bikeId), eq(components.status, "active")));

  if (trainerComponents.length === 0) {
    return NextResponse.json({ updated: 0, rides: 0 });
  }

  let totalRidesProcessed = 0;

  for (const comp of trainerComponents) {
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
            bike.linkedBikeId ? eq(rideLogs.bikeId, bike.linkedBikeId) : undefined,
            eq(rideLogs.bikeId, bikeId),
            isNull(rideLogs.bikeId),
          ),
        ),
      );

    if (rides.length === 0) continue;

    let totalDistanceKm = 0;
    let totalHours = 0;

    for (const ride of rides) {
      totalDistanceKm += parseFloat(ride.distanceKm) * multiplier;
      totalHours += ((ride.movingTimeSeconds ?? 0) / 3600) * multiplier;
    }

    await db
      .update(components)
      .set({
        currentDistanceKm: totalDistanceKm.toFixed(2),
        currentHours: totalHours.toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(components.id, comp.id));

    totalRidesProcessed = Math.max(totalRidesProcessed, rides.length);
  }

  return NextResponse.json({
    updated: trainerComponents.length,
    rides: totalRidesProcessed,
  });
}

// ── Outdoor bike: add indoor wear from trainer rides ───────────────────────
//
// Outdoor bike components already have the correct base km (from Strava total
// + incremental sync for new outdoor rides). This function ADDS the indoor
// wear adjustment for rides done on a linked trainer, using the trainer wear
// matrix. It does NOT overwrite — it computes the indoor delta and adds it.

async function recalculateOutdoorBike(
  bike: typeof bikes.$inferSelect,
  bikeId: string,
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

  const bikeComponents = await db
    .select()
    .from(components)
    .where(and(eq(components.bikeId, bikeId), eq(components.status, "active")));

  if (bikeComponents.length === 0) {
    return NextResponse.json({ updated: 0, rides: 0 });
  }

  // Only process INDOOR rides attributed to this outdoor bike
  let totalRidesProcessed = 0;

  for (const comp of bikeComponents) {
    const indoorRides = await db
      .select({
        distanceKm: rideLogs.distanceKm,
        movingTimeSeconds: rideLogs.movingTimeSeconds,
      })
      .from(rideLogs)
      .where(
        and(
          eq(rideLogs.bikeId, bikeId),
          eq(rideLogs.isIndoor, true),
          gte(rideLogs.date, comp.installDate),
        ),
      );

    if (indoorRides.length === 0) continue;

    let indoorWearKm = 0;
    let indoorWearHours = 0;

    for (const ride of indoorRides) {
      const wear = calculateWearDistance({
        rideDistanceKm: parseFloat(ride.distanceKm),
        rideTimeSeconds: ride.movingTimeSeconds ?? 0,
        isIndoor: true,
        conditions: "dry" as Condition,
        trainerType,
        componentType: comp.type as ComponentType,
        brakeType,
      });
      indoorWearKm += wear.effectiveDistanceKm;
      indoorWearHours += wear.effectiveHours;
    }

    if (indoorWearKm > 0 || indoorWearHours > 0) {
      // ADD indoor wear on top of existing km (don't overwrite)
      await db
        .update(components)
        .set({
          currentDistanceKm: (
            parseFloat(comp.currentDistanceKm) + indoorWearKm
          ).toFixed(2),
          currentHours: (
            parseFloat(comp.currentHours) + indoorWearHours
          ).toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(components.id, comp.id));
    }

    totalRidesProcessed = Math.max(totalRidesProcessed, indoorRides.length);
  }

  return NextResponse.json({
    updated: bikeComponents.length,
    rides: totalRidesProcessed,
  });
}
