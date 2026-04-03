import { describe, it, expect, vi, afterEach } from "vitest";
import {
  calculateWearDistance,
  getComponentStatus,
  getBikeTemplate,
} from "../wear-engine";
import { isIndoorRide, type StravaActivity } from "../strava-client";

// ---------------------------------------------------------------------------
// Helper: build a minimal StravaActivity
// ---------------------------------------------------------------------------

function makeActivity(
  overrides: Partial<StravaActivity> = {},
): StravaActivity {
  return {
    id: 1,
    name: "Morning Ride",
    distance: 50000,
    moving_time: 3600,
    elapsed_time: 3700,
    type: "Ride",
    sport_type: "Ride",
    start_date: "2025-06-01T08:00:00Z",
    start_date_local: "2025-06-01T10:00:00Z",
    trainer: false,
    gear_id: "b12345",
    average_speed: 13.9,
    start_latlng: [48.8566, 2.3522],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1. calculateWearDistance
// ---------------------------------------------------------------------------

describe("calculateWearDistance", () => {
  describe("outdoor rides — condition multipliers", () => {
    const base = {
      rideDistanceKm: 100,
      rideTimeSeconds: 3600,
      isIndoor: false,
      trainerType: "none" as const,
      componentType: "chain" as const,
    };

    it("road chain, dry conditions → multiplier 1.0", () => {
      const result = calculateWearDistance({ ...base, conditions: "dry" });
      expect(result.effectiveDistanceKm).toBe(100);
      expect(result.multiplier).toBe(1.0);
    });

    it("road chain, wet conditions → multiplier 1.5", () => {
      const result = calculateWearDistance({ ...base, conditions: "wet" });
      expect(result.effectiveDistanceKm).toBe(150);
      expect(result.multiplier).toBe(1.5);
    });

    it("road chain, muddy conditions → multiplier 2.0", () => {
      const result = calculateWearDistance({ ...base, conditions: "muddy" });
      expect(result.effectiveDistanceKm).toBe(200);
      expect(result.multiplier).toBe(2.0);
    });

    it("road chain, winter conditions → multiplier 2.5", () => {
      const result = calculateWearDistance({ ...base, conditions: "winter" });
      expect(result.effectiveDistanceKm).toBe(250);
      expect(result.multiplier).toBe(2.5);
    });
  });

  describe("indoor rides — trainer wear matrix", () => {
    const base = {
      rideDistanceKm: 50,
      rideTimeSeconds: 3600,
      isIndoor: true,
      conditions: "dry" as const,
    };

    it("direct-drive trainer, cassette → 0 (no wear)", () => {
      const result = calculateWearDistance({
        ...base,
        trainerType: "direct_drive",
        componentType: "cassette",
      });
      expect(result.effectiveDistanceKm).toBe(0);
      expect(result.multiplier).toBe(0);
    });

    it("direct-drive trainer, chain → multiplier 1.0", () => {
      const result = calculateWearDistance({
        ...base,
        trainerType: "direct_drive",
        componentType: "chain",
      });
      expect(result.effectiveDistanceKm).toBe(50);
      expect(result.multiplier).toBe(1.0);
    });

    it("wheel-on trainer, rear_tire → multiplier 1.5", () => {
      const result = calculateWearDistance({
        ...base,
        trainerType: "wheel_on",
        componentType: "rear_tire",
      });
      expect(result.effectiveDistanceKm).toBe(75);
      expect(result.multiplier).toBe(1.5);
    });

    it("rollers, front_tire → multiplier 0.5", () => {
      const result = calculateWearDistance({
        ...base,
        trainerType: "rollers",
        componentType: "front_tire",
      });
      expect(result.effectiveDistanceKm).toBe(25);
      expect(result.multiplier).toBe(0.5);
    });

    it("smart bike, any component → 0 (no wear)", () => {
      const result = calculateWearDistance({
        ...base,
        trainerType: "smart_bike",
        componentType: "chain",
      });
      expect(result.effectiveDistanceKm).toBe(0);
      expect(result.multiplier).toBe(0);
    });
  });
});

// ---------------------------------------------------------------------------
// 2. getComponentStatus
// ---------------------------------------------------------------------------

describe("getComponentStatus", () => {
  const baseInput = {
    currentDistanceKm: 0,
    currentHours: 0,
    installDate: "2025-01-01",
    thresholdDistanceKm: 1000,
    thresholdHours: null,
    thresholdDays: null,
  };

  it('component at 50% of threshold → level "good"', () => {
    const status = getComponentStatus({
      ...baseInput,
      currentDistanceKm: 500,
    });
    expect(status.level).toBe("good");
    expect(status.percentUsed).toBe(50);
    expect(status.remainingKm).toBe(500);
  });

  it('component at 75% → level "approaching"', () => {
    const status = getComponentStatus({
      ...baseInput,
      currentDistanceKm: 750,
    });
    expect(status.level).toBe("approaching");
    expect(status.percentUsed).toBe(75);
    expect(status.remainingKm).toBe(250);
  });

  it('component at 90% → level "warning"', () => {
    const status = getComponentStatus({
      ...baseInput,
      currentDistanceKm: 900,
    });
    expect(status.level).toBe("warning");
    expect(status.percentUsed).toBe(90);
    expect(status.remainingKm).toBe(100);
  });

  it('component at 96% → level "critical"', () => {
    const status = getComponentStatus({
      ...baseInput,
      currentDistanceKm: 960,
    });
    expect(status.level).toBe("critical");
    expect(status.percentUsed).toBe(96);
    expect(status.remainingKm).toBe(40);
  });

  it('component at 110% → level "overdue"', () => {
    const status = getComponentStatus({
      ...baseInput,
      currentDistanceKm: 1100,
    });
    expect(status.level).toBe("overdue");
    expect(status.percentUsed).toBe(110);
    expect(status.remainingKm).toBe(0);
  });

  it("calendar-based component (threshold_days) → correct days remaining", () => {
    // Install 30 days ago, threshold 90 days → ~33% used, ~60 days remaining
    const now = Date.now();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const status = getComponentStatus({
      currentDistanceKm: 0,
      currentHours: 0,
      installDate: thirtyDaysAgo.toISOString(),
      thresholdDistanceKm: null,
      thresholdHours: null,
      thresholdDays: 90,
    });

    expect(status.level).toBe("good");
    // ~33% used (30/90), allow small float variance
    expect(status.percentUsed).toBeGreaterThanOrEqual(33);
    expect(status.percentUsed).toBeLessThanOrEqual(34);
    expect(status.remainingDays).toBe(60);
  });

  it("hours-based component → correct percentage", () => {
    const status = getComponentStatus({
      currentDistanceKm: 0,
      currentHours: 40,
      installDate: "2025-01-01",
      thresholdDistanceKm: null,
      thresholdHours: 50,
      thresholdDays: null,
    });

    expect(status.level).toBe("approaching"); // 80% → 0.8 is between 0.7 and 0.85
    expect(status.percentUsed).toBe(80);
    expect(status.remainingHours).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// 3. getBikeTemplate
// ---------------------------------------------------------------------------

describe("getBikeTemplate", () => {
  it("road bike template includes chain, cassette, tires, but not suspension", () => {
    const template = getBikeTemplate("road");
    const types = template.map((c) => c.type);

    expect(types).toContain("chain");
    expect(types).toContain("cassette");
    expect(types).toContain("front_tire");
    expect(types).toContain("rear_tire");
    expect(types).not.toContain("fork_lower_service");
    expect(types).not.toContain("rear_shock_service");
  });

  it("mountain bike template includes fork_lower_service", () => {
    const template = getBikeTemplate("mountain");
    const types = template.map((c) => c.type);

    expect(types).toContain("fork_lower_service");
    expect(types).toContain("chain");
    expect(types).toContain("rear_shock_service");
  });

  it("commuter template exists and has components", () => {
    const template = getBikeTemplate("commuter");

    expect(template.length).toBeGreaterThan(0);
    const types = template.map((c) => c.type);
    expect(types).toContain("chain");
    expect(types).toContain("rear_tire");
  });
});

// ---------------------------------------------------------------------------
// 4. isIndoorRide
// ---------------------------------------------------------------------------

describe("isIndoorRide", () => {
  it("trainer=true → true", () => {
    const activity = makeActivity({ trainer: true });
    expect(isIndoorRide(activity)).toBe(true);
  });

  it('type="VirtualRide" → true', () => {
    const activity = makeActivity({ type: "VirtualRide" });
    expect(isIndoorRide(activity)).toBe(true);
  });

  it('sport_type="VirtualRide" → true', () => {
    const activity = makeActivity({ sport_type: "VirtualRide" });
    expect(isIndoorRide(activity)).toBe(true);
  });

  it("normal outdoor ride → false", () => {
    const activity = makeActivity();
    expect(isIndoorRide(activity)).toBe(false);
  });

  it("no GPS (null start_latlng) → true", () => {
    const activity = makeActivity({ start_latlng: null });
    expect(isIndoorRide(activity)).toBe(true);
  });

  it("no GPS (empty array start_latlng) → true", () => {
    const activity = makeActivity({
      start_latlng: [] as unknown as [number, number],
    });
    expect(isIndoorRide(activity)).toBe(true);
  });
});
