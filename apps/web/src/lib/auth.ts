import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db, users } from "@bike-check/db";
import { eq } from "drizzle-orm";
import { refreshTokens } from "@bike-check/core";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-me",
);
const COOKIE_NAME = "bc_session";

interface JWTPayload {
  userId: string;
  stravaId: number;
  plan: string;
}

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 7, // 7 days
  path: "/",
};

export async function createSessionToken(payload: JWTPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(JWT_SECRET);
}

export async function setSessionCookie(payload: JWTPayload): Promise<void> {
  const token = await createSessionToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, COOKIE_OPTIONS);
}

/**
 * Create a redirect response with the session cookie set on it.
 * Use this in route handlers where cookies().set() doesn't persist on redirects.
 */
export async function redirectWithSession(
  payload: JWTPayload,
  url: URL,
): Promise<Response> {
  const token = await createSessionToken(payload);
  const response = NextResponse.redirect(url);
  response.cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS);
  return response;
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Get a valid Strava access token for a user, refreshing if needed.
 */
export async function getValidStravaToken(userId: string): Promise<string> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user?.stravaAccessToken || !user?.stravaRefreshToken) {
    throw new Error("User has no Strava tokens");
  }

  // If token is still valid (with 5 min buffer), return it
  if (user.stravaTokenExpires && user.stravaTokenExpires > new Date(Date.now() + 5 * 60 * 1000)) {
    return user.stravaAccessToken;
  }

  // Refresh the token
  const newTokens = await refreshTokens(user.stravaRefreshToken);
  await db
    .update(users)
    .set({
      stravaAccessToken: newTokens.accessToken,
      stravaRefreshToken: newTokens.refreshToken,
      stravaTokenExpires: newTokens.expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  return newTokens.accessToken;
}
