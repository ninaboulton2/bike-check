import { NextRequest, NextResponse } from "next/server";
import { getSession, getValidStravaToken } from "@/lib/auth";
import { db, bikes, components } from "@bike-check/db";
import { eq, and, inArray } from "drizzle-orm";
import { getAthlete, getBikeTemplate } from "@bike-check/core";
import { createBikeSchema, type ComponentTemplate } from "@bike-check/shared";

/** GET /api/bikes — list user's bikes. Use ?inactive=trainer to get deactivated trainers. */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const inactive = request.nextUrl.searchParams.get("inactive");

  if (inactive === "trainer") {
    const inactiveTrainers = await db
      .select()
      .from(bikes)
      .where(
        and(
          eq(bikes.userId, session.userId),
          eq(bikes.isTrainer, true),
          eq(bikes.isActive, false),
        ),
      );
    return NextResponse.json(inactiveTrainers);
  }

  if (inactive === "bike") {
    const inactiveBikes = await db
      .select()
      .from(bikes)
      .where(
        and(
          eq(bikes.userId, session.userId),
          eq(bikes.isTrainer, false),
          eq(bikes.isActive, false),
        ),
      );
    return NextResponse.json(inactiveBikes);
  }

  const withComponents = request.nextUrl.searchParams.get("withComponents") === "true";

  const userBikes = await db
    .select()
    .from(bikes)
    .where(eq(bikes.userId, session.userId));

  if (withComponents) {
    const bikeIds = userBikes.map((b) => b.id);
    const allComponents = bikeIds.length > 0
      ? await db
          .select()
          .from(components)
          .where(inArray(components.bikeId, bikeIds))
      : [];
    const bikeMap = new Map(userBikes.map((b) => [b.id, { ...b, components: [] as typeof allComponents }]));
    for (const comp of allComponents) {
      bikeMap.get(comp.bikeId)?.components.push(comp);
    }
    return NextResponse.json(Array.from(bikeMap.values()));
  }

  return NextResponse.json(userBikes);
}

/** POST /api/bikes — create a bike (manual or from Strava import) */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createBikeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const [bike] = await db
    .insert(bikes)
    .values({
      userId: session.userId,
      ...parsed.data,
    })
    .returning();

  // If a template is requested, auto-create components
  if (body.applyTemplate !== false) {
    const template = getBikeTemplate(parsed.data.type as any);
    if (template.length > 0) {
      await db.insert(components).values(
        template.map((t: ComponentTemplate) => ({
          bikeId: bike.id,
          type: t.type,
          name: t.name,
          installDate: body.installDate ?? new Date().toISOString().split("T")[0],
          thresholdDistanceKm: t.thresholdDistanceKm?.toString() ?? null,
          thresholdHours: t.thresholdHours?.toString() ?? null,
          thresholdDays: t.thresholdDays ?? null,
          wearOnIndoor: t.wearOnIndoor,
          indoorWearMultiplier: t.indoorWearMultiplier.toString(),
        })),
      );
    }
  }

  return NextResponse.json(bike, { status: 201 });
}
