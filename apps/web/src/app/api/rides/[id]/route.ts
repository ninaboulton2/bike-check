import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db, rideLogs } from "@bike-check/db";
import { eq, and } from "drizzle-orm";
import { updateRideConditionsSchema } from "@bike-check/shared";

/** PATCH /api/rides/:id — update ride conditions */
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
  const parsed = updateRideConditionsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.conditions !== undefined) {
    updates.conditions = parsed.data.conditions;
  }
  if (parsed.data.bikeId !== undefined) {
    updates.bikeId = parsed.data.bikeId;
  }

  await db
    .update(rideLogs)
    .set(updates)
    .where(and(eq(rideLogs.id, id), eq(rideLogs.userId, session.userId)));

  return NextResponse.json({ ok: true });
}

/** DELETE /api/rides/:id — delete a manual ride */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  // Only allow deleting manual rides
  const [ride] = await db
    .select()
    .from(rideLogs)
    .where(and(eq(rideLogs.id, id), eq(rideLogs.userId, session.userId)))
    .limit(1);

  if (!ride) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (ride.source !== "manual") {
    return NextResponse.json(
      { error: "Only manual rides can be deleted" },
      { status: 400 },
    );
  }

  await db.delete(rideLogs).where(eq(rideLogs.id, id));

  return NextResponse.json({ ok: true });
}
