import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@bike-check/core";
import { db, users } from "@bike-check/db";
import { eq } from "drizzle-orm";
import { redirectWithSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      new URL("/?error=strava_denied", request.url),
    );
  }

  try {
    // Exchange code for tokens + athlete info
    const { athlete, tokens } = await exchangeCodeForTokens(code);

    // Upsert user in database
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.stravaId, athlete.id))
      .limit(1);

    let userId: string;

    if (existing.length > 0) {
      // Update existing user tokens
      userId = existing[0].id;
      await db
        .update(users)
        .set({
          name: `${athlete.firstname} ${athlete.lastname}`,
          avatarUrl: athlete.profile,
          stravaAccessToken: tokens.accessToken,
          stravaRefreshToken: tokens.refreshToken,
          stravaTokenExpires: tokens.expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    } else {
      // Create new user
      const [newUser] = await db
        .insert(users)
        .values({
          stravaId: athlete.id,
          name: `${athlete.firstname} ${athlete.lastname}`,
          email: athlete.email ?? null,
          avatarUrl: athlete.profile,
          stravaAccessToken: tokens.accessToken,
          stravaRefreshToken: tokens.refreshToken,
          stravaTokenExpires: tokens.expiresAt,
        })
        .returning();
      userId = newUser.id;
    }

    // Redirect with session cookie: new user → onboarding, existing → dashboard
    const destination = existing.length > 0 ? "/dashboard" : "/onboarding";
    return await redirectWithSession(
      {
        userId,
        stravaId: athlete.id,
        plan: existing[0]?.plan ?? "free",
      },
      new URL(destination, request.url),
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Strava OAuth callback error:", msg);
    return NextResponse.redirect(
      new URL(`/?error=auth_failed&detail=${encodeURIComponent(msg)}`, request.url),
    );
  }
}
