import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db, maintenanceEvents, components, bikes } from "@bike-check/db";
import { eq, and, or, desc, like, not, isNull } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { createGeneralMaintenanceSchema } from "@bike-check/shared";

/** GET /api/maintenance — list maintenance events, optionally filtered by bikeId or componentId */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const bikeId = request.nextUrl.searchParams.get("bikeId");
  const componentId = request.nextUrl.searchParams.get("componentId");

  const conditions: SQL[] = [eq(bikes.userId, session.userId)];
  if (bikeId) conditions.push(eq(bikes.id, bikeId));
  if (componentId) conditions.push(eq(maintenanceEvents.componentId, componentId));

  const selectFields = {
    id: maintenanceEvents.id,
    componentId: maintenanceEvents.componentId,
    title: maintenanceEvents.title,
    eventType: maintenanceEvents.eventType,
    date: maintenanceEvents.date,
    distanceAtEvent: maintenanceEvents.distanceAtEvent,
    hoursAtEvent: maintenanceEvents.hoursAtEvent,
    costCents: maintenanceEvents.costCents,
    notes: maintenanceEvents.notes,
    newBrand: maintenanceEvents.newBrand,
    newModel: maintenanceEvents.newModel,
    relatedComponentIds: maintenanceEvents.relatedComponentIds,
    componentName: components.name,
    componentType: components.type,
    bikeName: bikes.name,
    bikeId: bikes.id,
  };

  // Use leftJoin on components so general events (componentId = null) are included.
  // For general events, bikeId is stored directly on the event.
  // For component events, bikeId comes from the component's bike.
  const events = await db
    .select(selectFields)
    .from(maintenanceEvents)
    .leftJoin(components, eq(components.id, maintenanceEvents.componentId))
    .innerJoin(
      bikes,
      or(
        eq(bikes.id, components.bikeId),
        eq(bikes.id, maintenanceEvents.bikeId),
      ),
    )
    .where(and(...conditions))
    .orderBy(desc(maintenanceEvents.date))
    .limit(100);

  // When filtering by componentId, also fetch general maintenance events whose
  // relatedComponentIds JSON array includes this component. These are events
  // where the component was replaced as part of a general maintenance session.
  if (componentId) {
    const generalConditions: SQL[] = [
      eq(bikes.userId, session.userId),
      isNull(maintenanceEvents.componentId),
      like(maintenanceEvents.relatedComponentIds, `%${componentId}%`),
    ];
    if (bikeId) generalConditions.push(eq(bikes.id, bikeId));

    const generalEvents = await db
      .select(selectFields)
      .from(maintenanceEvents)
      .leftJoin(components, eq(components.id, maintenanceEvents.componentId))
      .innerJoin(
        bikes,
        or(
          eq(bikes.id, components.bikeId),
          eq(bikes.id, maintenanceEvents.bikeId),
        ),
      )
      .where(and(...generalConditions))
      .orderBy(desc(maintenanceEvents.date))
      .limit(100);

    // Merge and deduplicate by event id
    const seenIds = new Set(events.map((e) => e.id));
    for (const ge of generalEvents) {
      if (!seenIds.has(ge.id)) {
        events.push(ge);
      }
    }

    // Re-sort by date descending after merge
    events.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
  }

  return NextResponse.json(events);
}

/** POST /api/maintenance — create a general bike maintenance event */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createGeneralMaintenanceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Verify bike belongs to user
  const [bike] = await db
    .select()
    .from(bikes)
    .where(and(eq(bikes.id, parsed.data.bikeId), eq(bikes.userId, session.userId)))
    .limit(1);

  if (!bike) {
    return NextResponse.json({ error: "Bike not found" }, { status: 404 });
  }

  // componentIds is an optional array of component IDs that were replaced as part of this maintenance
  const componentIds: string[] = body.componentIds ?? [];

  const [event] = await db
    .insert(maintenanceEvents)
    .values({
      bikeId: parsed.data.bikeId,
      componentId: null,
      title: parsed.data.title,
      eventType: "general",
      date: parsed.data.date,
      costCents: parsed.data.costCents ?? null,
      notes: parsed.data.notes ?? null,
      relatedComponentIds: componentIds.length > 0 ? JSON.stringify(componentIds) : null,
    })
    .returning();

  // Actually replace each component: reset distance/hours, update installDate,
  // and create a per-component "replaced" maintenance event.
  if (componentIds.length > 0) {
    for (const cId of componentIds) {
      await db
        .update(components)
        .set({
          currentDistanceKm: "0",
          currentHours: "0",
          installDate: parsed.data.date,
          updatedAt: new Date(),
        })
        .where(eq(components.id, cId));

      await db.insert(maintenanceEvents).values({
        componentId: cId,
        bikeId: parsed.data.bikeId,
        title: `Replaced (${parsed.data.title})`,
        eventType: "replaced",
        date: parsed.data.date,
        notes: `Component replaced as part of general maintenance: ${parsed.data.title}`,
      });
    }
  }

  return NextResponse.json(event, { status: 201 });
}
