import { NextRequest, NextResponse } from "next/server";
import { getSession, getValidStravaToken } from "@/lib/auth";
import { db, bikes, components, rideLogs } from "@bike-check/db";
import { eq, and } from "drizzle-orm";
import {
  getActivities,
  isIndoorRide,
  calculateWearDistance,
} from "@bike-check/core";
import type { TrainerType, ComponentType, BrakeType } from "@bike-check/shared";

/** POST /api/sync — sync recent Strava activities and update component distances */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const afterEpoch: number = body.after ?? Math.floor(Date.now() / 1000) - 90 * 24 * 3600;
  // When true, insert ride logs but don't apply wear to components.
  // Used by onboarding: components already have Strava's total km as base.
  const skipWear: boolean = body.skipWear === true;
  // When a deep/full re-sync is requested (after === 0 or very old date),
  // allow up to 100 pages (10 000 activities) so historical rides aren't cut off.
  const maxPages = afterEpoch < Math.floor(Date.now() / 1000) - 365 * 24 * 3600 ? 100 : 10;

  const accessToken = await getValidStravaToken(session.userId);

  // Load all user bikes
  const userBikes = await db
    .select()
    .from(bikes)
    .where(eq(bikes.userId, session.userId));

  // Outdoor bikes indexed by Strava gear ID (trainer bikes excluded)
  const bikesByGearId = new Map(
    userBikes
      .filter((b) => b.stravaGearId && !b.isTrainer)
      .map((b) => [b.stravaGearId!, b]),
  );

  // Home trainer bike (there should be at most one active trainer)
  const trainerBike = userBikes.find((b) => b.isTrainer && b.isActive);

  // The outdoor bike currently mounted on the trainer (for wear + ride attribution)
  const linkedBike = trainerBike?.linkedBikeId
    ? userBikes.find((b) => b.id === trainerBike.linkedBikeId && b.isActive)
    : undefined;

  // Fetch activities page by page
  let page = 1;
  let totalSynced = 0;
  let hasMore = true;

  while (hasMore) {
    const activities = await getActivities(accessToken, {
      after: afterEpoch,
      page,
      perPage: 100,
    });

    if (activities.length === 0) {
      hasMore = false;
      break;
    }

    for (const activity of activities) {
      const isRideType =
        activity.type.includes("Ride") ||
        activity.sport_type.includes("Ride") ||
        activity.type === "IndoorCycling" ||
        activity.sport_type === "IndoorCycling";
      if (!isRideType) continue;

      const indoor = isIndoorRide(activity);

      // --- Determine which bike owns this ride ---
      let rideOwnerBike: typeof userBikes[0] | undefined;

      if (indoor) {
        // Indoor rides belong to the linked outdoor bike (so they appear in its
        // history and accumulate wear on its components via the trainer wear matrix).
        // Fall back to the trainer bike itself if no linked bike is set.
        rideOwnerBike = linkedBike ?? trainerBike;
      } else {
        // Outdoor rides matched by Strava gear ID
        rideOwnerBike = activity.gear_id
          ? bikesByGearId.get(activity.gear_id)
          : undefined;
      }

      // Skip outdoor rides we can't attribute; allow unattributed indoor rides
      if (!indoor && !rideOwnerBike) continue;

      // De-duplicate — skip already synced activities
      const existing = await db
        .select({ id: rideLogs.id, isIndoor: rideLogs.isIndoor, bikeId: rideLogs.bikeId })
        .from(rideLogs)
        .where(eq(rideLogs.stravaActivityId, activity.id))
        .limit(1);

      if (existing.length > 0) {
        // Correct stale indoor flag or bike attribution without re-applying wear
        const needsUpdate =
          existing[0].isIndoor !== indoor ||
          existing[0].bikeId !== (rideOwnerBike?.id ?? null);
        if (needsUpdate) {
          await db
            .update(rideLogs)
            .set({
              isIndoor: indoor,
              bikeId: rideOwnerBike?.id ?? null,
            })
            .where(eq(rideLogs.id, existing[0].id));
        }
        continue;
      }

      const distanceKm = activity.distance / 1000;

      // Persist the ride log under the ride-owner bike
      await db.insert(rideLogs).values({
        userId: session.userId,
        bikeId: rideOwnerBike?.id ?? null,
        stravaActivityId: activity.id,
        date: activity.start_date_local.split("T")[0],
        distanceKm: distanceKm.toFixed(2),
        movingTimeSeconds: activity.moving_time,
        isIndoor: indoor,
        conditions: "dry",
        source: "strava",
      });

      // Apply wear to components — skipped during onboarding initial sync
      // (components already have Strava total as base km).
      if (!skipWear) {
        if (indoor) {
          // (A) Apply wear to the LINKED outdoor bike's components.
          //     calculateWearDistance with isIndoor=true uses the TRAINER_WEAR_MATRIX,
          //     correctly giving chain/chainrings/BB/pulleys/cleats their indoor wear
          //     and zero-rating what isn't used (e.g., cassette on direct-drive).
          if (linkedBike) {
            await updateComponentDistances(
              linkedBike.id,
              distanceKm,
              activity.moving_time,
              true,           // isIndoor
              "dry",
              session.userId,
              linkedBike.brakeType as BrakeType | null,
              false,          // isTrainerBike — use wear matrix
            );
          }

          // (B) Apply wear to the TRAINER bike's own hardware components
          //     (e.g., the direct-drive trainer's cassette) at 1.0× directly.
          if (trainerBike) {
            await updateComponentDistances(
              trainerBike.id,
              distanceKm,
              activity.moving_time,
              true,
              "dry",
              session.userId,
              null,
              true,           // isTrainerBike — use component's indoorWearMultiplier directly
            );
          }
        } else if (rideOwnerBike) {
          // Outdoor ride — standard wear calculation
          await updateComponentDistances(
            rideOwnerBike.id,
            distanceKm,
            activity.moving_time,
            false,
            "dry",
            session.userId,
            rideOwnerBike.brakeType as BrakeType | null,
            false,
          );
        }
      }

      totalSynced++;
    }

    page++;
    if (page > maxPages) hasMore = false;
  }

  return NextResponse.json({ synced: totalSynced });
}

async function updateComponentDistances(
  bikeId: string,
  distanceKm: number,
  movingTimeSeconds: number,
  isIndoor: boolean,
  conditions: string,
  userId: string,
  brakeType: BrakeType | null,
  /** When true: use each component's indoorWearMultiplier directly (trainer hardware).
   *  When false: use calculateWearDistance / TRAINER_WEAR_MATRIX (outdoor bike on trainer). */
  isTrainerBike = false,
) {
  const { users } = await import("@bike-check/db");
  const [user] = await db
    .select({ trainerType: users.trainerType })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const trainerType = (user?.trainerType ?? "none") as TrainerType;

  const bikeComponents = await db
    .select()
    .from(components)
    .where(and(eq(components.bikeId, bikeId), eq(components.status, "active")));

  for (const comp of bikeComponents) {
    let effectiveDistanceKm: number;
    let effectiveHours: number;

    if (isTrainerBike) {
      // Trainer hardware (e.g., direct-drive cassette): always wears at its own multiplier
      const multiplier = parseFloat(comp.indoorWearMultiplier.toString());
      effectiveDistanceKm = distanceKm * multiplier;
      effectiveHours = (movingTimeSeconds / 3600) * multiplier;
    } else {
      // Outdoor bike (on a trainer or not): use the wear engine
      const wear = calculateWearDistance({
        rideDistanceKm: distanceKm,
        rideTimeSeconds: movingTimeSeconds,
        isIndoor,
        conditions: conditions as any,
        trainerType,
        componentType: comp.type as ComponentType,
        brakeType: brakeType ?? undefined,
      });
      effectiveDistanceKm = wear.effectiveDistanceKm;
      effectiveHours = wear.effectiveHours;
    }

    if (effectiveDistanceKm > 0 || effectiveHours > 0) {
      await db
        .update(components)
        .set({
          currentDistanceKm: (parseFloat(comp.currentDistanceKm) + effectiveDistanceKm).toFixed(2),
          currentHours: (parseFloat(comp.currentHours) + effectiveHours).toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(components.id, comp.id));
    }
  }
}
