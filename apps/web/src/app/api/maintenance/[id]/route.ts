import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db, maintenanceEvents, components, bikes } from "@bike-check/db";
import { eq, and } from "drizzle-orm";

async function getEventAndVerifyOwner(eventId: string, userId: string) {
  // Fetch event with ownership check via bike
  const [event] = await db
    .select({
      id: maintenanceEvents.id,
      componentId: maintenanceEvents.componentId,
      bikeId: maintenanceEvents.bikeId,
      title: maintenanceEvents.title,
      eventType: maintenanceEvents.eventType,
      date: maintenanceEvents.date,
      costCents: maintenanceEvents.costCents,
      notes: maintenanceEvents.notes,
    })
    .from(maintenanceEvents)
    .where(eq(maintenanceEvents.id, eventId))
    .limit(1);

  if (!event) return null;

  // Check ownership via bikeId (general) or componentId → bike → user
  if (event.bikeId) {
    const [bike] = await db
      .select()
      .from(bikes)
      .where(and(eq(bikes.id, event.bikeId), eq(bikes.userId, userId)))
      .limit(1);
    if (!bike) return null;
  } else if (event.componentId) {
    const [comp] = await db
      .select({ bikeId: components.bikeId })
      .from(components)
      .where(eq(components.id, event.componentId))
      .limit(1);
    if (!comp) return null;
    const [bike] = await db
      .select()
      .from(bikes)
      .where(and(eq(bikes.id, comp.bikeId), eq(bikes.userId, userId)))
      .limit(1);
    if (!bike) return null;
  } else {
    return null;
  }

  return event;
}

/** PATCH /api/maintenance/[id] — update a maintenance event */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const event = await getEventAndVerifyOwner(id, session.userId);
  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.title !== undefined) updates.title = body.title;
  if (body.date !== undefined) updates.date = body.date;
  if (body.costCents !== undefined) updates.costCents = body.costCents;
  if (body.notes !== undefined) updates.notes = body.notes;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(event);
  }

  const [updated] = await db
    .update(maintenanceEvents)
    .set(updates)
    .where(eq(maintenanceEvents.id, id))
    .returning();

  return NextResponse.json(updated);
}

/** DELETE /api/maintenance/[id] — remove a maintenance event */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const event = await getEventAndVerifyOwner(id, session.userId);
  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db
    .delete(maintenanceEvents)
    .where(eq(maintenanceEvents.id, id));

  return NextResponse.json({ ok: true });
}
