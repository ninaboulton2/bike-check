import { type ComponentType, type Condition, type TrainerType } from "./enums";

// ---------------------------------------------------------------------------
// Condition wear multipliers (spec §5.2)
// Key: condition → component type → multiplier
// A multiplier of 1.0 means normal wear. >1.0 means faster wear.
// ---------------------------------------------------------------------------

type ConditionMultipliers = Record<
  string, // Condition
  Partial<Record<string, number>> // ComponentType → multiplier
>;

export const CONDITION_MULTIPLIERS: ConditionMultipliers = {
  dry: {},
  wet: {
    chain: 1.5,
    cassette: 1.3,
    chainrings: 1.3,
    front_brake_pads: 1.5, // disc organic default; sintered = 1.2
    rear_brake_pads: 1.5,
    front_tire: 1.1,
    rear_tire: 1.1,
    bottom_bracket: 1.5,
    cables_housing: 1.5,
  },
  muddy: {
    chain: 2.0,
    cassette: 1.5,
    chainrings: 1.5,
    front_brake_pads: 1.7,
    rear_brake_pads: 1.7,
    front_tire: 1.3,
    rear_tire: 1.3,
    bottom_bracket: 2.0,
    cables_housing: 2.0,
  },
  dusty: {
    chain: 1.5,
    cassette: 1.3,
    chainrings: 1.3,
    front_brake_pads: 1.3,
    rear_brake_pads: 1.3,
    front_tire: 1.1,
    rear_tire: 1.1,
    bottom_bracket: 1.5,
    cables_housing: 1.5,
  },
  winter: {
    chain: 2.5,
    cassette: 2.0,
    chainrings: 2.0,
    front_brake_pads: 1.5,
    rear_brake_pads: 1.5,
    front_tire: 1.3,
    rear_tire: 1.3,
    bottom_bracket: 2.0,
    cables_housing: 2.5,
  },
};

// Rim brake wet multiplier override (spec: 3.0x for rim brakes in rain)
export const RIM_BRAKE_WET_MULTIPLIER = 3.0;
export const RIM_BRAKE_WINTER_MULTIPLIER = 2.5;
// Sintered disc brake pads wear less in wet than organic
export const SINTERED_WET_MULTIPLIER = 1.2;

// ---------------------------------------------------------------------------
// Battery life defaults (hours per charge)
// ---------------------------------------------------------------------------

export const BATTERY_DEFAULTS: Record<string, number> = {
  pedals: 80,
  chainrings: 60,
  cables_housing: 300,
  electronic_shifting: 50,
  dropper_post: 50,
  other: 60,
};

// ---------------------------------------------------------------------------
// Care/maintenance defaults (km or hours between care actions)
// ---------------------------------------------------------------------------

export const CARE_DEFAULTS: Record<string, { km?: number; hours?: number }> = {
  chain: { km: 200 },
  cassette: { km: 800 },
  chainrings: { km: 800 },
  bottom_bracket: { km: 4000 },
  front_brake_pads: { km: 800 },
  rear_brake_pads: { km: 800 },
  brake_rotor_front: { km: 800 },
  brake_rotor_rear: { km: 800 },
  cables_housing: { km: 2500 },
  fork_lower_service: { hours: 40 },
  dropper_post: { hours: 40 },
};

// Components sensitive to ride conditions (wet/mud/winter → care needed sooner)
export const CONDITION_CARE_COMPONENTS: Record<string, string[]> = {
  wet: ["chain", "cassette", "chainrings", "bottom_bracket", "cables_housing", "front_brake_pads", "rear_brake_pads"],
  muddy: ["chain", "cassette", "chainrings", "bottom_bracket", "cables_housing", "fork_lower_service", "dropper_post"],
  winter: ["chain", "cassette", "chainrings", "bottom_bracket", "cables_housing"],
  dusty: ["chain", "cassette", "chainrings", "fork_lower_service", "dropper_post"],
};

// ---------------------------------------------------------------------------
// Indoor trainer wear matrix (spec §5.3)
// Key: trainer type → component type → multiplier
// 0 means no wear at all for this component on this trainer.
// ---------------------------------------------------------------------------

type TrainerWearMatrix = Record<
  string, // TrainerType
  Partial<Record<string, number>> // ComponentType → multiplier
>;

export const TRAINER_WEAR_MATRIX: TrainerWearMatrix = {
  wheel_on: {
    chain: 1.0,
    cassette: 1.0,
    chainrings: 1.0,
    bottom_bracket: 1.0,
    rear_brake_pads: 0,
    front_brake_pads: 0,
    rear_tire: 1.5, // accelerated wear on trainer roller
    front_tire: 0,
    bar_tape: 0.2, // sweat only
    cables_housing: 0.5,
    derailleur_pulleys: 1.0,
    brake_rotor_front: 0,
    brake_rotor_rear: 0,
    fork_lower_service: 0,
    fork_full_service: 0,
    rear_shock_service: 0,
    rear_shock_full_service: 0,
    dropper_post: 0,
    wheel_bearings_front: 0,
    wheel_bearings_rear: 0.5,
    cleats: 0.3, // minimal clip/unclip wear indoors
    pedals: 1.0, // bearings wear at full rate
  },
  direct_drive: {
    chain: 1.0,
    cassette: 0, // bike cassette not engaged — trainer has its own
    chainrings: 1.0,
    bottom_bracket: 1.0,
    rear_brake_pads: 0,
    front_brake_pads: 0,
    rear_tire: 0, // wheel is removed
    front_tire: 0,
    bar_tape: 0.2,
    cables_housing: 0.5,
    derailleur_pulleys: 1.0,
    brake_rotor_front: 0,
    brake_rotor_rear: 0,
    fork_lower_service: 0,
    fork_full_service: 0,
    rear_shock_service: 0,
    rear_shock_full_service: 0,
    dropper_post: 0,
    wheel_bearings_front: 0,
    wheel_bearings_rear: 0,
    cleats: 0.3,
    pedals: 1.0,
  },
  rollers: {
    chain: 1.0,
    cassette: 1.0,
    chainrings: 1.0,
    bottom_bracket: 1.0,
    rear_brake_pads: 0,
    front_brake_pads: 0,
    rear_tire: 1.2,
    front_tire: 0.5, // front wheel spins on rollers too
    bar_tape: 0.2,
    cables_housing: 0.5,
    derailleur_pulleys: 1.0,
    brake_rotor_front: 0,
    brake_rotor_rear: 0,
    fork_lower_service: 0,
    fork_full_service: 0,
    rear_shock_service: 0,
    rear_shock_full_service: 0,
    dropper_post: 0,
    wheel_bearings_front: 0.5,
    wheel_bearings_rear: 0.5,
    cleats: 0.3,
    pedals: 1.0,
  },
  smart_bike: {
    // No real bike components involved — everything is 0
  },
  none: {
    // Fallback: treat as outdoor (all 1.0 — no special indoor logic)
  },
};

// ---------------------------------------------------------------------------
// Default component thresholds by bike type (spec §5.1)
// Distance in km, hours in hours, days in days.
// We pick sensible mid-range defaults from the spec ranges.
// ---------------------------------------------------------------------------

export interface ComponentTemplate {
  type: ComponentType;
  name: string;
  thresholdDistanceKm?: number;
  thresholdHours?: number;
  thresholdDays?: number;
  wearOnIndoor: boolean;
  indoorWearMultiplier: number;
}

// Helper: get default indoor multiplier for a component type from a trainer type
function defaultIndoorMultiplier(componentType: string): number {
  // Use direct_drive as baseline — most common trainer type
  return TRAINER_WEAR_MATRIX.direct_drive[componentType] ?? 1.0;
}

const ROAD_COMPONENTS: ComponentTemplate[] = [
  { type: "chain", name: "Chain", thresholdDistanceKm: 3000, wearOnIndoor: true, indoorWearMultiplier: 1.0 },
  { type: "cassette", name: "Cassette", thresholdDistanceKm: 10000, wearOnIndoor: true, indoorWearMultiplier: 0 },
  { type: "chainrings", name: "Chainrings", thresholdDistanceKm: 20000, wearOnIndoor: true, indoorWearMultiplier: 1.0 },
  { type: "front_brake_pads", name: "Front brake pads", thresholdDistanceKm: 3000, wearOnIndoor: false, indoorWearMultiplier: 0 },
  { type: "rear_brake_pads", name: "Rear brake pads", thresholdDistanceKm: 2500, wearOnIndoor: false, indoorWearMultiplier: 0 },
  { type: "front_tire", name: "Front tire", thresholdDistanceKm: 6000, wearOnIndoor: false, indoorWearMultiplier: 0 },
  { type: "rear_tire", name: "Rear tire", thresholdDistanceKm: 4000, wearOnIndoor: false, indoorWearMultiplier: 0 },
  { type: "bar_tape", name: "Bar tape", thresholdDistanceKm: 6000, wearOnIndoor: true, indoorWearMultiplier: 0.2 },
  { type: "bottom_bracket", name: "Bottom bracket", thresholdDistanceKm: 15000, wearOnIndoor: true, indoorWearMultiplier: 1.0 },
  { type: "cables_housing", name: "Cables & housing", thresholdDistanceKm: 6000, wearOnIndoor: true, indoorWearMultiplier: 0.5 },
  { type: "derailleur_pulleys", name: "Derailleur pulleys", thresholdDistanceKm: 20000, wearOnIndoor: true, indoorWearMultiplier: 1.0 },
  { type: "cleats", name: "Cleats", thresholdDistanceKm: 5000, wearOnIndoor: true, indoorWearMultiplier: 0.3 },
  { type: "pedals", name: "Pedals", thresholdDistanceKm: 20000, wearOnIndoor: true, indoorWearMultiplier: 1.0 },
];

const GRAVEL_COMPONENTS: ComponentTemplate[] = [
  { type: "chain", name: "Chain", thresholdDistanceKm: 2500, wearOnIndoor: true, indoorWearMultiplier: 1.0 },
  { type: "cassette", name: "Cassette", thresholdDistanceKm: 8000, wearOnIndoor: true, indoorWearMultiplier: 0 },
  { type: "chainrings", name: "Chainrings", thresholdDistanceKm: 15000, wearOnIndoor: true, indoorWearMultiplier: 1.0 },
  { type: "front_brake_pads", name: "Front brake pads", thresholdDistanceKm: 2500, wearOnIndoor: false, indoorWearMultiplier: 0 },
  { type: "rear_brake_pads", name: "Rear brake pads", thresholdDistanceKm: 2000, wearOnIndoor: false, indoorWearMultiplier: 0 },
  { type: "front_tire", name: "Front tire", thresholdDistanceKm: 4500, wearOnIndoor: false, indoorWearMultiplier: 0 },
  { type: "rear_tire", name: "Rear tire", thresholdDistanceKm: 3000, wearOnIndoor: false, indoorWearMultiplier: 0 },
  { type: "bar_tape", name: "Bar tape", thresholdDistanceKm: 5000, wearOnIndoor: true, indoorWearMultiplier: 0.2 },
  { type: "tubeless_sealant", name: "Tubeless sealant", thresholdDays: 90, wearOnIndoor: false, indoorWearMultiplier: 0 },
  { type: "bottom_bracket", name: "Bottom bracket", thresholdDistanceKm: 12000, wearOnIndoor: true, indoorWearMultiplier: 1.0 },
  { type: "cables_housing", name: "Cables & housing", thresholdDistanceKm: 5000, wearOnIndoor: true, indoorWearMultiplier: 0.5 },
  { type: "derailleur_pulleys", name: "Derailleur pulleys", thresholdDistanceKm: 15000, wearOnIndoor: true, indoorWearMultiplier: 1.0 },
  { type: "cleats", name: "Cleats", thresholdDistanceKm: 5000, wearOnIndoor: true, indoorWearMultiplier: 0.3 },
  { type: "pedals", name: "Pedals", thresholdDistanceKm: 15000, wearOnIndoor: true, indoorWearMultiplier: 1.0 },
];

const MOUNTAIN_COMPONENTS: ComponentTemplate[] = [
  { type: "chain", name: "Chain", thresholdDistanceKm: 1500, wearOnIndoor: true, indoorWearMultiplier: 1.0 },
  { type: "cassette", name: "Cassette", thresholdDistanceKm: 5000, wearOnIndoor: true, indoorWearMultiplier: 0 },
  { type: "chainrings", name: "Chainrings", thresholdDistanceKm: 10000, wearOnIndoor: true, indoorWearMultiplier: 1.0 },
  { type: "front_brake_pads", name: "Front brake pads (disc)", thresholdDistanceKm: 1500, wearOnIndoor: false, indoorWearMultiplier: 0 },
  { type: "rear_brake_pads", name: "Rear brake pads (disc)", thresholdDistanceKm: 1200, wearOnIndoor: false, indoorWearMultiplier: 0 },
  { type: "brake_rotor_front", name: "Front brake rotor", thresholdDistanceKm: 15000, wearOnIndoor: false, indoorWearMultiplier: 0 },
  { type: "brake_rotor_rear", name: "Rear brake rotor", thresholdDistanceKm: 12000, wearOnIndoor: false, indoorWearMultiplier: 0 },
  { type: "front_tire", name: "Front tire", thresholdDistanceKm: 2500, wearOnIndoor: false, indoorWearMultiplier: 0 },
  { type: "rear_tire", name: "Rear tire", thresholdDistanceKm: 1500, wearOnIndoor: false, indoorWearMultiplier: 0 },
  { type: "tubeless_sealant", name: "Tubeless sealant", thresholdDays: 90, wearOnIndoor: false, indoorWearMultiplier: 0 },
  { type: "bottom_bracket", name: "Bottom bracket", thresholdDistanceKm: 8000, wearOnIndoor: true, indoorWearMultiplier: 1.0 },
  { type: "fork_lower_service", name: "Fork lower-leg service", thresholdHours: 50, wearOnIndoor: false, indoorWearMultiplier: 0 },
  { type: "fork_full_service", name: "Fork full service", thresholdHours: 200, wearOnIndoor: false, indoorWearMultiplier: 0 },
  { type: "rear_shock_service", name: "Rear shock service", thresholdHours: 50, wearOnIndoor: false, indoorWearMultiplier: 0 },
  { type: "rear_shock_full_service", name: "Rear shock full service", thresholdHours: 200, wearOnIndoor: false, indoorWearMultiplier: 0 },
  { type: "dropper_post", name: "Dropper post service", thresholdHours: 150, wearOnIndoor: false, indoorWearMultiplier: 0 },
  { type: "derailleur_pulleys", name: "Derailleur pulleys", thresholdDistanceKm: 12000, wearOnIndoor: true, indoorWearMultiplier: 1.0 },
  { type: "cleats", name: "Cleats (SPD)", thresholdDistanceKm: 8000, wearOnIndoor: true, indoorWearMultiplier: 0.3 },
  { type: "pedals", name: "Pedals", thresholdDistanceKm: 10000, wearOnIndoor: true, indoorWearMultiplier: 1.0 },
];

// ---------------------------------------------------------------------------
// Trainer-type-specific component templates
//
// The home trainer *bike entity* only tracks hardware that belongs to the
// trainer unit itself — not to the bike that is mounted on it.
//
// Components of the mounted bike (chain, chainrings, BB, pulleys, cleats,
// tires) are tracked on the *linked outdoor bike* and accumulate indoor wear
// via the TRAINER_WEAR_MATRIX (handled automatically by the sync engine).
//
// Direct-drive: the trainer provides its own cassette (the bike's cassette is
// never engaged). That cassette is the one trainer-specific component to track.
const TRAINER_DIRECT_DRIVE_COMPONENTS: ComponentTemplate[] = [
  {
    type: "cassette",
    name: "Cassette (trainer)",
    thresholdDistanceKm: 10000,
    wearOnIndoor: true,
    indoorWearMultiplier: 1.0, // always 1.0 — this IS the active cassette indoors
  },
];

// Wheel-on: the bike's full drivetrain + rear tire are engaged.
// All wear is tracked on the linked outdoor bike via the wear matrix.
// No trainer-specific components.
const TRAINER_WHEEL_ON_COMPONENTS: ComponentTemplate[] = [];

// Rollers: same as wheel-on — no trainer-specific components.
const TRAINER_ROLLERS_COMPONENTS: ComponentTemplate[] = [];

// Smart bike: dedicated indoor unit with its own integrated drivetrain.
// Users can add custom components manually after creation.
const TRAINER_SMART_BIKE_COMPONENTS: ComponentTemplate[] = [];

// Exported map: keyed by TrainerType value.
export const TRAINER_COMPONENT_TEMPLATES: Record<string, ComponentTemplate[]> = {
  direct_drive: TRAINER_DIRECT_DRIVE_COMPONENTS,
  wheel_on:     TRAINER_WHEEL_ON_COMPONENTS,
  rollers:      TRAINER_ROLLERS_COMPONENTS,
  smart_bike:   TRAINER_SMART_BIKE_COMPONENTS,
  none:         [], // no trainer configured
};

const COMMUTER_COMPONENTS: ComponentTemplate[] = [
  { type: "chain", name: "Chain", thresholdDistanceKm: 4000, wearOnIndoor: true, indoorWearMultiplier: 1.0 },
  { type: "cassette", name: "Cassette", thresholdDistanceKm: 12000, wearOnIndoor: true, indoorWearMultiplier: 0 },
  { type: "front_brake_pads", name: "Front brake pads", thresholdDistanceKm: 3000, wearOnIndoor: false, indoorWearMultiplier: 0 },
  { type: "rear_brake_pads", name: "Rear brake pads", thresholdDistanceKm: 2500, wearOnIndoor: false, indoorWearMultiplier: 0 },
  { type: "front_tire", name: "Front tire", thresholdDistanceKm: 5000, wearOnIndoor: false, indoorWearMultiplier: 0 },
  { type: "rear_tire", name: "Rear tire", thresholdDistanceKm: 4000, wearOnIndoor: false, indoorWearMultiplier: 0 },
  { type: "bottom_bracket", name: "Bottom bracket", thresholdDistanceKm: 15000, wearOnIndoor: true, indoorWearMultiplier: 1.0 },
  { type: "cables_housing", name: "Cables & housing", thresholdDistanceKm: 6000, wearOnIndoor: true, indoorWearMultiplier: 0.5 },
  { type: "pedals", name: "Pedals", thresholdDistanceKm: 15000, wearOnIndoor: true, indoorWearMultiplier: 1.0 },
];

export const BIKE_TEMPLATES: Record<string, ComponentTemplate[]> = {
  road: ROAD_COMPONENTS,
  gravel: GRAVEL_COMPONENTS,
  mountain: MOUNTAIN_COMPONENTS,
  commuter: COMMUTER_COMPONENTS,
  trainer: TRAINER_DIRECT_DRIVE_COMPONENTS, // API fallback; dialog always sends explicit components
  other: ROAD_COMPONENTS,
};

// ---------------------------------------------------------------------------
// Alert thresholds (spec §6.1)
// ---------------------------------------------------------------------------

export const ALERT_THRESHOLDS = {
  good: { max: 0.7 },
  approaching: { min: 0.7, max: 0.85 },
  warning: { min: 0.85, max: 0.95 },
  critical: { min: 0.95, max: 1.0 },
  overdue: { min: 1.0 },
} as const;

// ---------------------------------------------------------------------------
// Component display metadata
// ---------------------------------------------------------------------------

export const COMPONENT_LABELS: Record<string, string> = {
  chain: "Chain",
  cassette: "Cassette",
  chainrings: "Chainrings",
  front_brake_pads: "Front brake pads",
  rear_brake_pads: "Rear brake pads",
  front_tire: "Front tire",
  rear_tire: "Rear tire",
  bar_tape: "Bar tape",
  tubeless_sealant: "Tubeless sealant",
  bottom_bracket: "Bottom bracket",
  cables_housing: "Cables & housing",
  fork_lower_service: "Fork lower-leg service",
  fork_full_service: "Fork full service",
  rear_shock_service: "Rear shock service",
  rear_shock_full_service: "Rear shock full service",
  dropper_post: "Dropper post service",
  wheel_bearings_front: "Front wheel bearings",
  wheel_bearings_rear: "Rear wheel bearings",
  brake_rotor_front: "Front brake rotor",
  brake_rotor_rear: "Rear brake rotor",
  derailleur_pulleys: "Derailleur pulleys",
  electronic_shifting: "Electronic shifting",
  hydraulic_brake_bleed: "Hydraulic brake bleed",
  cleats: "Cleats",
  pedals: "Pedals",
  other: "Other",
};

export const COMPONENT_ICONS: Record<string, string> = {
  chain: "link",
  cassette: "cog",
  chainrings: "circle",
  front_brake_pads: "disc",
  rear_brake_pads: "disc",
  front_tire: "circle-dot",
  rear_tire: "circle-dot",
  bar_tape: "grip-horizontal",
  tubeless_sealant: "droplet",
  bottom_bracket: "settings",
  cables_housing: "cable",
  fork_lower_service: "wrench",
  fork_full_service: "wrench",
  rear_shock_service: "wrench",
  rear_shock_full_service: "wrench",
  dropper_post: "arrow-up-down",
  wheel_bearings_front: "circle",
  wheel_bearings_rear: "circle",
  brake_rotor_front: "disc",
  brake_rotor_rear: "disc",
  derailleur_pulleys: "cog",
  hydraulic_brake_bleed: "droplet",
  cleats: "footprints",
  pedals: "footprints",
  other: "box",
};

// ---------------------------------------------------------------------------
// Component threshold info — explains how each default lifespan is estimated
// ---------------------------------------------------------------------------

export const COMPONENT_THRESHOLD_INFO: Record<string, string> = {
  chain: "Chains stretch over time. Road chains typically last 3,000–5,000 km; gravel/MTB chains 2,000–3,000 km. Wet and muddy conditions accelerate wear significantly. Check with a chain wear tool every 500 km.",
  cassette: "Cassettes wear as the chain stretches. Replacing chains on time extends cassette life to 10,000–15,000 km. A worn chain can halve cassette lifespan.",
  chainrings: "Chainrings last 2–3 chain lifespans (15,000–20,000 km on road). They wear faster with cross-chaining or riding in a single gear. Inspect teeth for shark-fin profiles.",
  front_brake_pads: "Brake pads depend heavily on conditions and braking style. Road pads last ~3,000 km in dry conditions but can halve in wet/hilly terrain. Inspect pad depth regularly.",
  rear_brake_pads: "Rear pads wear ~20% faster than front due to weight distribution under braking. Expect 2,000–3,000 km on road; less in wet or mountainous conditions.",
  front_tire: "Front tires wear slower than rear. Road tires last ~5,000–8,000 km; gravel 3,000–5,000 km. Check for cuts, flat spots, and exposed casing.",
  rear_tire: "Rear tires carry more weight and wear ~30% faster. Road tires last ~3,000–5,000 km; gravel 2,000–3,500 km. Rotating front/rear can extend overall life.",
  bar_tape: "Bar tape degrades from sweat, UV, and grip pressure. Typically replaced every 5,000–8,000 km or yearly, whichever comes first. Indoor use adds sweat damage.",
  tubeless_sealant: "Sealant dries out over time regardless of riding. Refresh every 2–4 months (60–120 days). In hot climates, check more frequently.",
  bottom_bracket: "Bottom brackets last 10,000–20,000 km depending on quality and conditions. Listen for creaking or roughness. Wet and muddy rides shorten lifespan significantly.",
  cables_housing: "Shift and brake cables stretch and corrode. Road cables last ~5,000–8,000 km; less in wet conditions. Housing degrades from moisture ingress. Electronic drivetrains skip this.",
  fork_lower_service: "Fork lower-leg service (seal and oil change) recommended every 50–100 hours of riding or annually. Dusty and muddy conditions require more frequent service.",
  fork_full_service: "Full fork service (damper overhaul) recommended every 100–200 hours or yearly. Required when damping feels inconsistent or air pressure won't hold.",
  rear_shock_service: "Rear shock air-can service every 50–100 hours. Look for oil weeping around seals or loss of small-bump sensitivity.",
  rear_shock_full_service: "Full rear shock rebuild every 100–200 hours. Includes damper internals. Critical for maintaining consistent suspension performance.",
  dropper_post: "Dropper posts need service every 100–200 hours. Common signs: slow return, sinking under weight, or play in the post. More frequent in muddy conditions.",
  wheel_bearings_front: "Front wheel bearings last 15,000–25,000 km. Check for play by rocking the wheel side-to-side. Sealed cartridge bearings may last longer but aren't serviceable.",
  wheel_bearings_rear: "Rear bearings wear faster due to drivetrain loads. Expect 10,000–20,000 km. Grinding sounds or rough spinning indicate replacement needed.",
  brake_rotor_front: "Brake rotors last 15,000–30,000 km. Minimum thickness is usually stamped on the rotor (typically 1.5 mm). Measure with calipers periodically.",
  brake_rotor_rear: "Rear rotors wear slightly faster due to more frequent braking. Check for warping (pulsing feel) and minimum thickness markings.",
  derailleur_pulleys: "Derailleur jockey wheels last 15,000–25,000 km. Worn teeth cause imprecise shifting. Ceramic pulleys may last longer but still wear.",
  electronic_shifting: "Shimano Di2, SRAM AXS, Campagnolo EPS. Battery lasts 1,000-2,000 km or 40-60 hours. Enable battery tracking for charge reminders.",
  hydraulic_brake_bleed: "Brake fluid absorbs moisture over time, reducing performance. Bleed DOT fluid every 6–12 months; mineral oil systems can go longer but still benefit from annual service.",
  cleats: "Cleat lifespan depends on walking. Road cleats last 5,000–10,000 km of riding but wear fast on pavement. MTB cleats are more durable. Check for float increase.",
  pedals: "Quality pedals last 15,000–30,000 km. Service bearings and replace worn spring mechanisms. Budget pedals may need replacement sooner.",
  other: "Lifespan varies by component. Check manufacturer recommendations and inspect regularly for wear signs.",
};

// ---------------------------------------------------------------------------
// Free plan limits
// ---------------------------------------------------------------------------

export const FREE_PLAN_LIMITS = {
  maxBikes: 1,
  maxComponentsPerBike: 6,
  maxMaintenanceEventsVisible: 5,
  alertDigestOnly: true, // no real-time alerts
} as const;
