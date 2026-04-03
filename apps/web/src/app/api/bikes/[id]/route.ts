import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db, bikes, components } from "@bike-check/db";
import { eq, and } from "drizzle-orm";
import { updateBikeSchema } from "@bike-check/shared";

/** GET /api/bikes/:id — get bike with components */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const [bike] = await db
    .select()
    .from(bikes)
    .where(and(eq(bikes.id, id), eq(bikes.userId, session.userId)))
    .limit(1);

  if (!bike) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const bikeComponents = await db
    .select()
    .from(components)
    .where(eq(components.bikeId, id));

  return NextResponse.json({ ...bike, components: bikeComponents });
}

/** PATCH /api/bikes/:id — update bike */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateBikeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const [bike] = await db
    .select()
    .from(bikes)
    .where(and(eq(bikes.id, id), eq(bikes.userId, session.userId)))
    .limit(1);

  if (!bike) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.update(bikes).set(parsed.data).where(eq(bikes.id, id));

  return NextResponse.json({ ok: true });
}

/** DELETE /api/bikes/:id — soft-delete (deactivate) any bike so it can be reactivated later */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  // Verify ownership
  const [bike] = await db
    .select()
    .from(bikes)
    .where(and(eq(bikes.id, id), eq(bikes.userId, session.userId)))
    .limit(1);

  if (!bike) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Soft-delete: deactivate the bike so it can be reactivated later
  // without duplicating kms or losing ride/component history.
  await db.update(bikes).set({ isActive: false }).where(eq(bikes.id, id));

  return NextResponse.json({ ok: true });
}
