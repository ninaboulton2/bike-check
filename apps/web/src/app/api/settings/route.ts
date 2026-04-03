import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db, users } from "@bike-check/db";
import { eq } from "drizzle-orm";
import { updateSettingsSchema } from "@bike-check/shared";

/** PATCH /api/settings — update user settings */
export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = updateSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.trainerType !== undefined)
    updateData.trainerType = parsed.data.trainerType;
  if (parsed.data.alertEmail !== undefined)
    updateData.alertEmail = parsed.data.alertEmail;
  if (parsed.data.alertLevels !== undefined)
    updateData.alertLevels = parsed.data.alertLevels;
  if (parsed.data.currency !== undefined)
    updateData.currency = parsed.data.currency;
  if (parsed.data.theme !== undefined)
    updateData.theme = parsed.data.theme;
  if (parsed.data.language !== undefined)
    updateData.language = parsed.data.language;
  if (parsed.data.email !== undefined)
    updateData.email = parsed.data.email;

  await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, session.userId));

  return NextResponse.json({ ok: true });
}
