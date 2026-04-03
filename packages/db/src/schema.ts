import {
  pgTable,
  uuid,
  text,
  bigint,
  integer,
  numeric,
  boolean,
  date,
  timestamp,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  stravaId: bigint("strava_id", { mode: "number" }).unique().notNull(),
  email: text("email"),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  plan: text("plan").default("free").notNull(),
  trainerType: text("trainer_type").default("none").notNull(),
  alertEmail: boolean("alert_email").default(true).notNull(),
  alertLevels: text("alert_levels")
    .array()
    .default(["warning", "critical", "overdue"])
    .notNull(),
  currency: text("currency").default("EUR").notNull(),
  theme: text("theme").default("system").notNull(),
  language: text("language").default("en").notNull(),
  stravaAccessToken: text("strava_access_token"),
  stravaRefreshToken: text("strava_refresh_token"),
  stravaTokenExpires: timestamp("strava_token_expires"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Bikes
// ---------------------------------------------------------------------------

export const bikes = pgTable("bikes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  stravaGearId: text("strava_gear_id"),
  name: text("name").notNull(),
  type: text("type").notNull(),
  groupsetBrand: text("groupset_brand"),
  groupsetSpeed: integer("groupset_speed"),
  brakeType: text("brake_type"),
  shiftingType: text("shifting_type"),
  purchasePriceCents: integer("purchase_price_cents"),
  isActive: boolean("is_active").default(true).notNull(),
  isTrainer: boolean("is_trainer").default(false).notNull(),
  linkedBikeId: uuid("linked_bike_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

export const components = pgTable("components", {
  id: uuid("id").primaryKey().defaultRandom(),
  bikeId: uuid("bike_id")
    .references(() => bikes.id, { onDelete: "cascade" })
    .notNull(),
  type: text("type").notNull(),
  name: text("name").notNull(),
  brand: text("brand"),
  model: text("model"),
  installDate: date("install_date").notNull().defaultNow(),
  currentDistanceKm: numeric("current_distance_km", {
    precision: 10,
    scale: 2,
  })
    .default("0")
    .notNull(),
  currentHours: numeric("current_hours", { precision: 8, scale: 2 })
    .default("0")
    .notNull(),
  thresholdDistanceKm: numeric("threshold_distance_km", {
    precision: 10,
    scale: 2,
  }),
  thresholdHours: numeric("threshold_hours", { precision: 8, scale: 2 }),
  thresholdDays: integer("threshold_days"),
  costCents: integer("cost_cents"),
  wearOnIndoor: boolean("wear_on_indoor").default(true).notNull(),
  indoorWearMultiplier: numeric("indoor_wear_multiplier", {
    precision: 3,
    scale: 2,
  })
    .default("1.00")
    .notNull(),
  batteryTracking: boolean("battery_tracking").default(false).notNull(),
  batteryLifeHours: numeric("battery_life_hours", { precision: 8, scale: 2 }),
  careTracking: boolean("care_tracking").default(false).notNull(),
  careIntervalKm: numeric("care_interval_km", { precision: 10, scale: 2 }),
  careIntervalHours: numeric("care_interval_hours", { precision: 8, scale: 2 }),
  lastCareKm: numeric("last_care_km", { precision: 10, scale: 2 }).default("0").notNull(),
  lastCareHours: numeric("last_care_hours", { precision: 8, scale: 2 }).default("0").notNull(),
  status: text("status").default("active").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Ride logs
// ---------------------------------------------------------------------------

export const rideLogs = pgTable("ride_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  bikeId: uuid("bike_id")
    .references(() => bikes.id, { onDelete: "set null" }),
  stravaActivityId: bigint("strava_activity_id", { mode: "number" }).unique(),
  date: date("date").notNull(),
  distanceKm: numeric("distance_km", { precision: 8, scale: 2 }).notNull(),
  movingTimeSeconds: integer("moving_time_seconds"),
  isIndoor: boolean("is_indoor").default(false).notNull(),
  conditions: text("conditions").default("dry").notNull(),
  source: text("source").default("strava").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Maintenance events
// ---------------------------------------------------------------------------

export const maintenanceEvents = pgTable("maintenance_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  componentId: uuid("component_id").references(() => components.id, {
    onDelete: "cascade",
  }),
  bikeId: uuid("bike_id").references(() => bikes.id, { onDelete: "cascade" }),
  title: text("title"),
  eventType: text("event_type").notNull(),
  date: date("date").notNull().defaultNow(),
  distanceAtEvent: numeric("distance_at_event", { precision: 10, scale: 2 }),
  hoursAtEvent: numeric("hours_at_event", { precision: 8, scale: 2 }),
  costCents: integer("cost_cents"),
  notes: text("notes"),
  newBrand: text("new_brand"),
  newModel: text("new_model"),
  relatedComponentIds: text("related_component_ids"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Component relationships (chain → cassette protection)
// ---------------------------------------------------------------------------

export const componentRelationships = pgTable("component_relationships", {
  id: uuid("id").primaryKey().defaultRandom(),
  primaryComponentId: uuid("primary_component_id")
    .references(() => components.id, { onDelete: "cascade" })
    .notNull(),
  dependentComponentId: uuid("dependent_component_id")
    .references(() => components.id, { onDelete: "cascade" })
    .notNull(),
  relationship: text("relationship").notNull(), // "wears" | "protects"
});

// ---------------------------------------------------------------------------
// Sent alerts (deduplication)
// ---------------------------------------------------------------------------

export const sentAlerts = pgTable("sent_alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  componentId: uuid("component_id")
    .references(() => components.id, { onDelete: "cascade" })
    .notNull(),
  alertLevel: text("alert_level").notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});
