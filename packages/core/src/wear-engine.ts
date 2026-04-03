import {
  CONDITION_MULTIPLIERS,
  TRAINER_WEAR_MATRIX,
  ALERT_THRESHOLDS,
  RIM_BRAKE_WET_MULTIPLIER,
  RIM_BRAKE_WINTER_MULTIPLIER,
  SINTERED_WET_MULTIPLIER,
  type ComponentTemplate,
  BIKE_TEMPLATES,
} from "@bike-check/shared";
import type {
  Condition,
  TrainerType,
  ComponentType,
  BrakeType,
  BrakePadType,
  BikeType,
  AlertLevel,
} from "@bike-check/shared";

// ---------------------------------------------------------------------------
// calculateWearDistance
// ---------------------------------------------------------------------------

export interface WearDistanceParams {
  rideDistanceKm: number;
  rideTimeSeconds?: number;
  isIndoor: boolean;
  conditions: Condition;
  trainerType: TrainerType;
  componentType: ComponentType;
  /** Needed for brake pad multiplier (rim vs disc) */
  brakeType?: BrakeType;
  /** Organic vs sintered — affects wet condition multiplier */
  brakePadType?: BrakePadType;
}

export interface WearResult {
  effectiveDistanceKm: number;
  effectiveHours: number;
  multiplier: number;
}

/**
 * Calculate the effective wear distance for a component given a ride.
 * Returns both the effective distance (for distance-based components)
 * and effective hours (for time-based components like suspension).
 */
export function calculateWearDistance(params: WearDistanceParams): WearResult {
  const {
    rideDistanceKm,
    rideTimeSeconds = 0,
    isIndoor,
    conditions,
    trainerType,
    componentType,
    brakeType,
    brakePadType,
  } = params;

  let multiplier = 1.0;

  if (isIndoor) {
    // Indoor ride: use trainer wear matrix
    const trainerMultipliers = TRAINER_WEAR_MATRIX[trainerType];
    if (!trainerMultipliers) {
      // Unknown trainer type or "none" — treat as normal outdoor
      multiplier = 1.0;
    } else {
      multiplier = trainerMultipliers[componentType] ?? 0;
    }
  } else {
    // Outdoor ride: apply condition multiplier
    multiplier = getConditionMultiplier(
      conditions,
      componentType,
      brakeType,
      brakePadType,
    );
  }

  return {
    effectiveDistanceKm: rideDistanceKm * multiplier,
    effectiveHours: (rideTimeSeconds / 3600) * multiplier,
    multiplier,
  };
}

function getConditionMultiplier(
  conditions: Condition,
  componentType: ComponentType,
  brakeType?: BrakeType,
  brakePadType?: BrakePadType,
): number {
  if (conditions === "dry" || conditions === "unknown") {
    return 1.0;
  }

  // Special case: rim brakes in wet/winter conditions
  const isBrakePad =
    componentType === "front_brake_pads" ||
    componentType === "rear_brake_pads";
  if (isBrakePad && brakeType === "rim") {
    if (conditions === "wet") return RIM_BRAKE_WET_MULTIPLIER;
    if (conditions === "winter") return RIM_BRAKE_WINTER_MULTIPLIER;
  }

  // Special case: sintered disc pads in wet
  if (isBrakePad && brakePadType === "sintered" && conditions === "wet") {
    return SINTERED_WET_MULTIPLIER;
  }

  const conditionMap = CONDITION_MULTIPLIERS[conditions];
  if (!conditionMap) return 1.0;

  return conditionMap[componentType] ?? 1.0;
}

// ---------------------------------------------------------------------------
// getComponentStatus
// ---------------------------------------------------------------------------

export interface ComponentStatusInput {
  currentDistanceKm: number;
  currentHours: number;
  installDate: string; // ISO date
  thresholdDistanceKm?: number | null;
  thresholdHours?: number | null;
  thresholdDays?: number | null;
}

export interface ComponentStatus {
  level: AlertLevel;
  percentUsed: number;
  remainingKm?: number;
  remainingHours?: number;
  remainingDays?: number;
}

export function getComponentStatus(
  input: ComponentStatusInput,
): ComponentStatus {
  const {
    currentDistanceKm,
    currentHours,
    installDate,
    thresholdDistanceKm,
    thresholdHours,
    thresholdDays,
  } = input;

  // Calculate percent used for each applicable metric, take the worst one
  let maxPercent = 0;
  let remainingKm: number | undefined;
  let remainingHours: number | undefined;
  let remainingDays: number | undefined;

  if (thresholdDistanceKm && thresholdDistanceKm > 0) {
    const pct = currentDistanceKm / thresholdDistanceKm;
    if (pct > maxPercent) maxPercent = pct;
    remainingKm = Math.max(0, thresholdDistanceKm - currentDistanceKm);
  }

  if (thresholdHours && thresholdHours > 0) {
    const pct = currentHours / thresholdHours;
    if (pct > maxPercent) maxPercent = pct;
    remainingHours = Math.max(0, thresholdHours - currentHours);
  }

  if (thresholdDays && thresholdDays > 0) {
    const installMs = new Date(installDate).getTime();
    const nowMs = Date.now();
    const daysSinceInstall = (nowMs - installMs) / (1000 * 60 * 60 * 24);
    const pct = daysSinceInstall / thresholdDays;
    if (pct > maxPercent) maxPercent = pct;
    remainingDays = Math.max(0, Math.ceil(thresholdDays - daysSinceInstall));
  }

  // Determine alert level from percent
  let level: AlertLevel;
  if (maxPercent >= ALERT_THRESHOLDS.overdue.min) {
    level = "overdue";
  } else if (maxPercent >= ALERT_THRESHOLDS.critical.min) {
    level = "critical";
  } else if (maxPercent >= ALERT_THRESHOLDS.warning.min) {
    level = "warning";
  } else if (maxPercent >= ALERT_THRESHOLDS.approaching.min) {
    level = "approaching";
  } else {
    level = "good";
  }

  return {
    level,
    percentUsed: Math.round(maxPercent * 1000) / 10, // e.g. 95.2%
    remainingKm,
    remainingHours,
    remainingDays,
  };
}

// ---------------------------------------------------------------------------
// getBikeTemplate
// ---------------------------------------------------------------------------

export function getBikeTemplate(bikeType: BikeType): ComponentTemplate[] {
  return BIKE_TEMPLATES[bikeType] ?? BIKE_TEMPLATES.road;
}
