import { NextRequest, NextResponse } from "next/server";
import { db, users, bikes, components, rideLogs } from "@bike-check/db";
import { eq, and } from "drizzle-orm";
import {
  getActivity,
  isIndoorRide,
  calculateWearDistance,
  refreshTokens,
} from "@bike-check/core";
import type { TrainerType, ComponentType, BrakeType } from "@bike-check/shared";

/**
 * GET /api/webhooks/strava — Webhook verification (Strava challenge)
 */
export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.STRAVA_WEBHOOK_VERIFY_TOKEN) {
    return NextResponse.json({ "hub.challenge": challenge });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

/**
 * POST /api/webhooks/strava — Receive activity events
 */
export async function POST(request: NextRequest) {
  const body = await request.json();

  // We only care about new or updated activities
  if (body.object_type !== "activity") {
    return NextResponse.json({ ok: true });
  }

  if (body.aspect_type !== "create" && body.aspect_type !== "update") {
    return NextResponse.json({ ok: true });
  }

  const stravaActivityId = body.object_id as number;
  const stravaAthleteId = body.owner_id as number;

  // Process asynchronously — for now we do it inline.
  // TODO: move to a queue (Inngest/QStash) for production.
  try {
    await processWebhookActivity(stravaActivityId, stravaAthleteId);
  } catch (err) {
    console.error("Webhook processing error:", err);
    // Still return 200 so Strava doesn't retry endlessly
  }

  return NextResponse.json({ ok: true });
}

async function processWebhookActivity(
  stravaActivityId: number,
  stravaAthleteId: number,
) {
  // Find user by Strava ID
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.stravaId, stravaAthleteId))
    .limit(1);

  if (!user) return; // Unknown user

  // Check for duplicate
  const existing = await db
    .select({ id: rideLogs.id })
    .from(rideLogs)
    .where(eq(rideLogs.stravaActivityId, stravaActivityId))
    .limit(1);

  if (existing.length > 0) return; // Already processed

  // Get valid access token
  let accessToken = user.stravaAccessToken!;
  if (user.stravaTokenExpires && user.stravaTokenExpires < new Date()) {
    const newTokens = await refreshTokens(user.stravaRefreshToken!);
    await db
      .update(users)
      .set({
        stravaAccessToken: newTokens.accessToken,
        stravaRefreshToken: newTokens.refreshToken,
        stravaTokenExpires: newTokens.expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));
    accessToken = newTokens.accessToken;
  }

  // Fetch activity from Strava
  const activity = await getActivity(stravaActivityId, accessToken);

  // Only process rides
  if (!activity.type.includes("Ride") && !activity.sport_type.includes("Ride")) {
    return;
  }

  // Find the bike
  if (!activity.gear_id) return;

  const [bike] = await db
    .select()
    .from(bikes)
    .where(
      and(eq(bikes.userId, user.id), eq(bikes.stravaGearId, activity.gear_id)),
    )
    .limit(1);

  if (!bike) return; // Ride on untracked bike

  const distanceKm = activity.distance / 1000;
  const indoor = isIndoorRide(activity);

  // Create ride log
  await db.insert(rideLogs).values({
    userId: user.id,
    bikeId: bike.id,
    stravaActivityId: activity.id,
    date: activity.start_date_local.split("T")[0],
    distanceKm: distanceKm.toFixed(2),
    movingTimeSeconds: activity.moving_time,
    isIndoor: indoor,
    conditions: "dry",
    source: "strava",
  });

  // Update component distances
  const trainerType = (user.trainerType ?? "none") as TrainerType;
  const bikeComponents = await db
    .select()
    .from(components)
    .where(and(eq(components.bikeId, bike.id), eq(components.status, "active")));

  for (const comp of bikeComponents) {
    const wear = calculateWearDistance({
      rideDistanceKm: distanceKm,
      rideTimeSeconds: activity.moving_time,
      isIndoor: indoor,
      conditions: "dry",
      trainerType,
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

  // TODO: check thresholds and send alerts (Phase 4)
}
