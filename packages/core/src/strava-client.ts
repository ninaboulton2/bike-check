// ---------------------------------------------------------------------------
// Strava API client
// Handles token refresh, rate limits, and typed responses.
// ---------------------------------------------------------------------------

const STRAVA_API_BASE = "https://www.strava.com/api/v3";
const STRAVA_OAUTH_URL = "https://www.strava.com/oauth/token";

export interface StravaTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface StravaAthlete {
  id: number;
  firstname: string;
  lastname: string;
  profile: string; // avatar URL
  email?: string;
  bikes?: StravaGear[];
}

export interface StravaGear {
  id: string;
  name: string;
  distance: number; // in meters
  primary: boolean;
}

export interface StravaActivity {
  id: number;
  name: string;
  distance: number; // meters
  moving_time: number; // seconds
  elapsed_time: number; // seconds
  type: string;
  sport_type: string;
  start_date: string; // ISO
  start_date_local: string;
  trainer: boolean;
  gear_id: string | null;
  average_speed: number;
  start_latlng: [number, number] | null;
}

// ---------------------------------------------------------------------------
// Token exchange & refresh
// ---------------------------------------------------------------------------

export async function exchangeCodeForTokens(
  code: string,
): Promise<{ athlete: StravaAthlete; tokens: StravaTokens }> {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  const res = await fetch(STRAVA_OAUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: Number(clientId),
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Strava token exchange failed: ${res.status} ${body} (client_id: ${clientId ? "set" : "MISSING"}, client_secret: ${clientSecret ? "set" : "MISSING"})`,
    );
  }

  const data = await res.json();
  return {
    athlete: data.athlete,
    tokens: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(data.expires_at * 1000),
    },
  };
}

export async function refreshTokens(
  refreshToken: string,
): Promise<StravaTokens> {
  const res = await fetch(STRAVA_OAUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: Number(process.env.STRAVA_CLIENT_ID),
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Strava token refresh failed: ${res.status} ${body}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(data.expires_at * 1000),
  };
}

// ---------------------------------------------------------------------------
// Authenticated API calls
// ---------------------------------------------------------------------------

async function stravaFetch<T>(
  path: string,
  accessToken: string,
  params?: Record<string, string>,
): Promise<T> {
  const url = new URL(`${STRAVA_API_BASE}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Strava API error ${path}: ${res.status} ${body}`);
  }

  return res.json() as Promise<T>;
}

export async function getAthlete(
  accessToken: string,
): Promise<StravaAthlete> {
  return stravaFetch<StravaAthlete>("/athlete", accessToken);
}

export async function getActivity(
  activityId: number,
  accessToken: string,
): Promise<StravaActivity> {
  return stravaFetch<StravaActivity>(
    `/activities/${activityId}`,
    accessToken,
  );
}

export async function getActivities(
  accessToken: string,
  options: {
    after?: number; // epoch seconds
    before?: number;
    page?: number;
    perPage?: number;
  } = {},
): Promise<StravaActivity[]> {
  const params: Record<string, string> = {};
  if (options.after) params.after = String(options.after);
  if (options.before) params.before = String(options.before);
  if (options.page) params.page = String(options.page);
  params.per_page = String(options.perPage ?? 100);

  return stravaFetch<StravaActivity[]>(
    "/athlete/activities",
    accessToken,
    params,
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Check if a Strava activity is an indoor ride.
 *
 *  Strava sends `trainer` as an integer (0/1) in JSON, not a boolean, so we
 *  use a truthy check rather than strict equality.  We also treat missing GPS
 *  as an indoor signal — outdoor rides always have coordinates.
 */
export function isIndoorRide(activity: StravaActivity): boolean {
  if (!!activity.trainer) return true;
  if (
    activity.type === "VirtualRide" ||
    activity.sport_type === "VirtualRide" ||
    activity.type === "IndoorCycling" ||
    activity.sport_type === "IndoorCycling"
  )
    return true;
  // No GPS recorded → no start location → almost certainly indoor.
  // Strava returns [] for GPS-less activities; the TS type says [number,number]
  // but the actual payload can be an empty array, so cast to any[].
  if (
    !activity.start_latlng ||
    (activity.start_latlng as unknown as unknown[]).length === 0
  )
    return true;
  return false;
}

/** Build the Strava OAuth authorization URL */
export function getStravaAuthUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "read,activity:read,profile:read_all",
    approval_prompt: "auto",
  });
  return `https://www.strava.com/oauth/authorize?${params.toString()}`;
}
