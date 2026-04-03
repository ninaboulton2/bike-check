import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db, rideLogs, bikes, components } from "@bike-check/db";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { calculateWearDistance } from "@bike-check/core";
import type { TrainerType, ComponentType, BrakeType } from "@bike-check/shared";

/** GET /api/rides — list user's rides, optionally filtered by bikeId.
 *
 *  Special case: if bikeId belongs to a trainer bike, returns indoor rides
 *  from its linked outdoor bike (those are the rides that count for the
 *  trainer's usage), not rides attributed directly to the trainer entity.
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const bikeId = request.nextUrl.searchParams.get("bikeId");
  const limitParam = request.nextUrl.searchParams.get("limit");
  const maxRows = limitParam ? Math.min(parseInt(limitParam, 10) || 200, 200) : 200;

  let effectiveBikeId = bikeId;
  let indoorOnly = false;

  if (bikeId) {
    // Check whether this is a trainer bike — if so, redirect to its linked bike's
    // indoor rides, because that's where the activity records actually live.
    const [bike] = await db
      .select({ isTrainer: bikes.isTrainer, linkedBikeId: bikes.linkedBikeId })
      .from(bikes)
      .where(and(eq(bikes.id, bikeId), eq(bikes.userId, session.userId)))
      .limit(1);

    if (bike?.isTrainer) {
      if (bike.linkedBikeId) {
        // Return indoor rides attributed to the linked outdoor bike
        effectiveBikeId = bike.linkedBikeId;
        indoorOnly = true;
      } else {
        // Trainer with no linked bike: return all user indoor rides
        effectiveBikeId = null;
        indoorOnly = true;
      }
    }
  }

  const conditions = [eq(rideLogs.userId, session.userId)];
  if (effectiveBikeId) conditions.push(eq(rideLogs.bikeId, effectiveBikeId));
  if (indoorOnly) conditions.push(eq(rideLogs.isIndoor, true));

  const rides = await db
    .select()
    .from(rideLogs)
    .where(and(...conditions))
    .orderBy(desc(rideLogs.date))
    .limit(maxRows);

  return NextResponse.json(rides);
}

// ---------------------------------------------------------------------------
// POST /api/rides — create a manual ride
// ---------------------------------------------------------------------------

const createRideSchema = z.object({
  bikeId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  distanceKm: z.number().positive(),
  conditions: z.enum(["dry", "wet", "muddy", "dusty", "winter"]),
  movingTimeSeconds: z.number().int().positive().optional(),
  isIndoor: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createRideSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { bikeId, date, distanceKm, conditions, movingTimeSeconds, isIndoor } =
    parsed.data;

  // Verify bike belongs to user
  const [bike] = await db
    .select()
    .from(bikes)
    .where(and(eq(bikes.id, bikeId), eq(bikes.userId, session.userId)))
    .limit(1);

  if (!bike) {
    return NextResponse.json({ error: "Bike not found" }, { status: 404 });
  }

  // Create ride log
  const [ride] = await db
    .insert(rideLogs)
    .values({
      userId: session.userId,
      bikeId,
      date,
      distanceKm: distanceKm.toFixed(2),
      movingTimeSeconds: movingTimeSeconds ?? null,
      isIndoor,
      conditions,
      source: "manual",
    })
    .returning();

  // Update component distances
  const bikeComponents = await db
    .select()
    .from(components)
    .where(and(eq(components.bikeId, bikeId), eq(components.status, "active")));

  for (const comp of bikeComponents) {
    const wear = calculateWearDistance({
      rideDistanceKm: distanceKm,
      rideTimeSeconds: movingTimeSeconds,
      isIndoor,
      conditions,
      trainerType: "none" as TrainerType,
      componentType: comp.type as ComponentType,
      brakeType: (bike.brakeType as BrakeType) ?? undefined,
    });

    if (wear.effectiveDistanceKm > 0 || wear.effectiveHours > 0) {
      const newDistance =
        parseFloat(comp.currentDistanceKm) + wear.effectiveDistanceKm;
      const newHours = parseFloat(comp.currentHours) + wear.effectiveHours;

      await db
        .update(components)
        .set({
          currentDistanceKm: newDistance.toFixed(2),
          currentHours: newHours.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(components.id, comp.id));
    }
  }

  return NextResponse.json(ride, { status: 201 });
}
