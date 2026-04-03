import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db, components, maintenanceEvents, bikes } from "@bike-check/db";
import { eq, and } from "drizzle-orm";

/** POST /api/components/:id/care — mark component care as done, reset care counters */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: componentId } = await params;

  const [comp] = await db
    .select()
    .from(components)
    .innerJoin(bikes, eq(bikes.id, components.bikeId))
    .where(
      and(eq(components.id, componentId), eq(bikes.userId, session.userId)),
    )
    .limit(1);

  if (!comp) {
    return NextResponse.json({ error: "Component not found" }, { status: 404 });
  }

  if (!comp.components.careTracking) {
    return NextResponse.json(
      { error: "Care tracking not enabled for this component" },
      { status: 400 },
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  // Log care event in maintenance
  await db.insert(maintenanceEvents).values({
    componentId,
    bikeId: comp.components.bikeId,
    eventType: "cared",
    date: today,
    distanceAtEvent: comp.components.currentDistanceKm,
    hoursAtEvent: comp.components.currentHours,
  });

  // Reset care counters to current values
  await db
    .update(components)
    .set({
      lastCareKm: comp.components.currentDistanceKm,
      lastCareHours: comp.components.currentHours,
      updatedAt: new Date(),
    })
    .where(eq(components.id, componentId));

  return NextResponse.json({ success: true });
}
