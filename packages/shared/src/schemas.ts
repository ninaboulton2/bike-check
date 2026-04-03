import { z } from "zod";

// ---------------------------------------------------------------------------
// Bike schemas
// ---------------------------------------------------------------------------

export const createBikeSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["road", "gravel", "mountain", "commuter", "trainer", "other"]),
  stravaGearId: z.string().optional(),
  groupsetBrand: z.enum(["shimano", "sram", "campagnolo", "other"]).optional(),
  groupsetSpeed: z.number().int().min(1).max(13).optional(),
  brakeType: z.enum(["rim", "disc_mechanical", "disc_hydraulic"]).optional(),
  shiftingType: z.enum(["mechanical", "electronic"]).optional(),
  purchasePriceCents: z.number().int().nonnegative().nullable().optional(),
  isTrainer: z.boolean().optional(),
  linkedBikeId: z.string().uuid().nullable().optional(),
});

export const updateBikeSchema = createBikeSchema.partial().extend({
  isActive: z.boolean().optional(),
  linkedBikeId: z.string().uuid().nullable().optional(),
});

// ---------------------------------------------------------------------------
// Component schemas
// ---------------------------------------------------------------------------

export const createComponentSchema = z.object({
  type: z.string().min(1),
  name: z.string().min(1).max(100),
  brand: z.string().max(100).nullable().optional(),
  model: z.string().max(100).nullable().optional(),
  installDate: z.string().date(),
  currentDistanceKm: z.number().nonnegative().optional(),
  currentHours: z.number().nonnegative().optional(),
  thresholdDistanceKm: z.number().positive().optional(),
  thresholdHours: z.number().positive().optional(),
  thresholdDays: z.number().int().positive().optional(),
  costCents: z.number().int().nonnegative().nullable().optional(),
  wearOnIndoor: z.boolean().default(true),
  indoorWearMultiplier: z.number().min(0).max(2).default(1.0),
  batteryTracking: z.boolean().default(false),
  batteryLifeHours: z.number().positive().optional(),
  careTracking: z.boolean().default(false),
  careIntervalKm: z.number().positive().optional(),
  careIntervalHours: z.number().positive().optional(),
  notes: z.string().max(500).optional(),
});

export const updateComponentSchema = createComponentSchema.partial();

// ---------------------------------------------------------------------------
// Ride schemas
// ---------------------------------------------------------------------------

export const createManualRideSchema = z.object({
  bikeId: z.string().uuid(),
  date: z.string().date(),
  distanceKm: z.number().positive(),
  movingTimeSeconds: z.number().int().nonnegative().optional(),
  conditions: z
    .enum(["dry", "wet", "muddy", "dusty", "winter", "unknown"])
    .default("dry"),
});

export const updateRideConditionsSchema = z.object({
  conditions: z
    .enum(["dry", "wet", "muddy", "dusty", "winter", "unknown"])
    .optional(),
  bikeId: z.string().uuid().nullable().optional(),
});

// ---------------------------------------------------------------------------
// Maintenance event schemas
// ---------------------------------------------------------------------------

export const createMaintenanceEventSchema = z.object({
  eventType: z.enum(["replaced", "serviced", "inspected", "adjusted"]),
  date: z.string().date(),
  costCents: z.number().int().nonnegative().optional(),
  notes: z.string().max(500).optional(),
  newBrand: z.string().max(100).optional(),
  newModel: z.string().max(100).optional(),
});

export const createGeneralMaintenanceSchema = z.object({
  bikeId: z.string().uuid(),
  title: z.string().min(1).max(200),
  date: z.string().date(),
  costCents: z.number().int().nonnegative().optional(),
  notes: z.string().max(500).optional(),
});

// ---------------------------------------------------------------------------
// Settings schemas
// ---------------------------------------------------------------------------

export const updateSettingsSchema = z.object({
  trainerType: z
    .enum(["wheel_on", "direct_drive", "rollers", "smart_bike", "none"])
    .optional(),
  alertEmail: z.boolean().optional(),
  alertLevels: z
    .array(z.enum(["warning", "critical", "overdue"]))
    .optional(),
  currency: z.enum(["EUR", "USD", "GBP"]).optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
  language: z.enum(["en", "fr"]).optional(),
  email: z.string().email().max(255).optional(),
});
