import { NextRequest, NextResponse } from "next/server";
import { getStravaAuthUrl } from "@bike-check/core";

export async function GET(request: NextRequest) {
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/strava/callback`;
  const authUrl = getStravaAuthUrl(redirectUri);
  return NextResponse.redirect(authUrl, { status: 302 });
}
