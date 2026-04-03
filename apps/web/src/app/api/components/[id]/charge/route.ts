import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db, components, maintenanceEvents, bikes } from "@bike-check/db";
import { eq, and } from "drizzle-orm";

/** POST /api/components/:id/charge — mark battery as charged, reset hours to 0 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: componentId } = await params;

  // Verify component belongs to user and has battery tracking enabled
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

  if (!comp.components.batteryTracking) {
    return NextResponse.json(
      { error: "Battery tracking not enabled for this component" },
      { status: 400 },
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  // Log charge event in maintenance
  await db.insert(maintenanceEvents).values({
    componentId,
    bikeId: comp.components.bikeId,
    eventType: "charged",
    date: today,
    hoursAtEvent: comp.components.currentHours,
  });

  // Reset hours to 0
  await db
    .update(components)
    .set({
      currentHours: "0",
      updatedAt: new Date(),
    })
    .where(eq(components.id, componentId));

  return NextResponse.json({ success: true });
}
