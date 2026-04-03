import { NextResponse } from "next/server";
import { getSession, getValidStravaToken } from "@/lib/auth";
import { db, bikes, components } from "@bike-check/db";
import { eq, and } from "drizzle-orm";
import { getAthlete, getActivities } from "@bike-check/core";

/** POST /api/bikes/import — fetch bikes from Strava, match with existing DB records */
export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const accessToken = await getValidStravaToken(session.userId);
    const athlete = await getAthlete(accessToken);

    const bikeGear = athlete.bikes ?? [];
    if (bikeGear.length === 0) {
      return NextResponse.json(
        { error: "No bikes found on your Strava account. Add a bike in Strava first." },
        { status: 404 },
      );
    }

    // Build a set of gear IDs we care about
    const gearIds = new Set(bikeGear.map((g) => g.id));

    // Fetch all activities to find the earliest date per gear_id.
    // Strava returns newest-first, so we paginate through everything.
    const firstDateByGear: Record<string, string> = {};
    let page = 1;
    const maxPages = 100; // safety limit: 100 * 200 = 20,000 activities
    let hasMore = true;

    while (hasMore && page <= maxPages) {
      const activities = await getActivities(accessToken, {
        after: 0,
        page,
        perPage: 200,
      });

      for (const activity of activities) {
        if (activity.gear_id && gearIds.has(activity.gear_id)) {
          const dateStr = activity.start_date_local.split("T")[0];
          const existing = firstDateByGear[activity.gear_id];
          if (!existing || dateStr < existing) {
            firstDateByGear[activity.gear_id] = dateStr;
          }
        }
      }

      hasMore = activities.length === 200;
      page++;
    }

    const result: Array<{
      id?: string;
      stravaGearId: string;
      name: string;
      distance: number;
      firstActivityDate?: string;
      existsInDb: boolean;
      isActive: boolean;
      componentCount: number;
    }> = [];

    for (const gear of bikeGear) {
      // Check if this Strava bike already exists in our DB
      const existing = await db
        .select()
        .from(bikes)
        .where(
          and(
            eq(bikes.userId, session.userId),
            eq(bikes.stravaGearId, gear.id),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        const bike = existing[0];
        // Only count components for active bikes — inactive bikes are treated as fresh
        let componentCount = 0;
        if (bike.isActive) {
          const existingComponents = await db
            .select()
            .from(components)
            .where(and(eq(components.bikeId, bike.id), eq(components.status, "active")));
          componentCount = existingComponents.length;
        }
        result.push({
          id: bike.id,
          stravaGearId: gear.id,
          name: gear.name,
          distance: gear.distance ?? 0,
          firstActivityDate: firstDateByGear[gear.id],
          existsInDb: true,
          isActive: bike.isActive,
          componentCount,
        });
      } else {
        // Don't create the bike yet — just return the Strava data
        result.push({
          stravaGearId: gear.id,
          name: gear.name,
          distance: gear.distance ?? 0,
          firstActivityDate: firstDateByGear[gear.id],
          existsInDb: false,
          isActive: false,
          componentCount: 0,
        });
      }
    }

    return NextResponse.json({ bikes: result });
  } catch (err) {
    console.error("Bike import error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to import bikes" },
      { status: 500 },
    );
  }
}
