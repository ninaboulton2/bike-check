import { NextResponse } from "next/server";
import { getSession, clearSession } from "@/lib/auth";
import { db, users } from "@bike-check/db";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
      plan: users.plan,
      trainerType: users.trainerType,
      alertEmail: users.alertEmail,
      alertLevels: users.alertLevels,
      currency: users.currency,
      theme: users.theme,
      language: users.language,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function DELETE() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // CASCADE on the users table will delete bikes, components, ride_logs, maintenance_events, etc.
  await db.delete(users).where(eq(users.id, session.userId));
  await clearSession();

  return NextResponse.json({ ok: true });
}
