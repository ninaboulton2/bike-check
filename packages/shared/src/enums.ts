export const BikeType = {
  ROAD: "road",
  GRAVEL: "gravel",
  MOUNTAIN: "mountain",
  COMMUTER: "commuter",
  TRAINER: "trainer",
  OTHER: "other",
} as const;
export type BikeType = (typeof BikeType)[keyof typeof BikeType];

export const ComponentType = {
  CHAIN: "chain",
  CASSETTE: "cassette",
  CHAINRINGS: "chainrings",
  FRONT_BRAKE_PADS: "front_brake_pads",
  REAR_BRAKE_PADS: "rear_brake_pads",
  FRONT_TIRE: "front_tire",
  REAR_TIRE: "rear_tire",
  BAR_TAPE: "bar_tape",
  TUBELESS_SEALANT: "tubeless_sealant",
  BOTTOM_BRACKET: "bottom_bracket",
  CABLES_HOUSING: "cables_housing",
  FORK_LOWER_SERVICE: "fork_lower_service",
  FORK_FULL_SERVICE: "fork_full_service",
  REAR_SHOCK_SERVICE: "rear_shock_service",
  REAR_SHOCK_FULL_SERVICE: "rear_shock_full_service",
  DROPPER_POST: "dropper_post",
  WHEEL_BEARINGS_FRONT: "wheel_bearings_front",
  WHEEL_BEARINGS_REAR: "wheel_bearings_rear",
  BRAKE_ROTOR_FRONT: "brake_rotor_front",
  BRAKE_ROTOR_REAR: "brake_rotor_rear",
  DERAILLEUR_PULLEYS: "derailleur_pulleys",
  ELECTRONIC_SHIFTING: "electronic_shifting",
  HYDRAULIC_BRAKE_BLEED: "hydraulic_brake_bleed",
  CLEATS: "cleats",
  PEDALS: "pedals",
  OTHER: "other",
} as const;
export type ComponentType =
  (typeof ComponentType)[keyof typeof ComponentType];

export const Condition = {
  DRY: "dry",
  WET: "wet",
  MUDDY: "muddy",
  DUSTY: "dusty",
  WINTER: "winter",
  UNKNOWN: "unknown",
} as const;
export type Condition = (typeof Condition)[keyof typeof Condition];

export const TrainerType = {
  WHEEL_ON: "wheel_on",
  DIRECT_DRIVE: "direct_drive",
  ROLLERS: "rollers",
  SMART_BIKE: "smart_bike",
  NONE: "none",
} as const;
export type TrainerType = (typeof TrainerType)[keyof typeof TrainerType];

export const BrakeType = {
  RIM: "rim",
  DISC_MECHANICAL: "disc_mechanical",
  DISC_HYDRAULIC: "disc_hydraulic",
} as const;
export type BrakeType = (typeof BrakeType)[keyof typeof BrakeType];

export const BrakePadType = {
  ORGANIC: "organic",
  SINTERED: "sintered",
} as const;
export type BrakePadType =
  (typeof BrakePadType)[keyof typeof BrakePadType];

export const ShiftingType = {
  MECHANICAL: "mechanical",
  ELECTRONIC: "electronic",
} as const;
export type ShiftingType =
  (typeof ShiftingType)[keyof typeof ShiftingType];

export const GroupsetBrand = {
  SHIMANO: "shimano",
  SRAM: "sram",
  CAMPAGNOLO: "campagnolo",
  OTHER: "other",
} as const;
export type GroupsetBrand =
  (typeof GroupsetBrand)[keyof typeof GroupsetBrand];

export const AlertLevel = {
  GOOD: "good",
  APPROACHING: "approaching",
  WARNING: "warning",
  CRITICAL: "critical",
  OVERDUE: "overdue",
} as const;
export type AlertLevel = (typeof AlertLevel)[keyof typeof AlertLevel];

export const EventType = {
  REPLACED: "replaced",
  SERVICED: "serviced",
  INSPECTED: "inspected",
  ADJUSTED: "adjusted",
  GENERAL: "general",
  CHARGED: "charged",
  CARED: "cared",
} as const;
export type EventType = (typeof EventType)[keyof typeof EventType];

export const Plan = {
  FREE: "free",
  PRO: "pro",
} as const;
export type Plan = (typeof Plan)[keyof typeof Plan];

export const RideSource = {
  STRAVA: "strava",
  MANUAL: "manual",
} as const;
export type RideSource = (typeof RideSource)[keyof typeof RideSource];
