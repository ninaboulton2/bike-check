CREATE TABLE "bikes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"strava_gear_id" text,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"groupset_brand" text,
	"groupset_speed" integer,
	"brake_type" text,
	"shifting_type" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "component_relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"primary_component_id" uuid NOT NULL,
	"dependent_component_id" uuid NOT NULL,
	"relationship" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bike_id" uuid NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"brand" text,
	"model" text,
	"install_date" date DEFAULT now() NOT NULL,
	"current_distance_km" numeric(10, 2) DEFAULT '0' NOT NULL,
	"current_hours" numeric(8, 2) DEFAULT '0' NOT NULL,
	"threshold_distance_km" numeric(10, 2),
	"threshold_hours" numeric(8, 2),
	"threshold_days" integer,
	"cost_cents" integer,
	"wear_on_indoor" boolean DEFAULT true NOT NULL,
	"indoor_wear_multiplier" numeric(3, 2) DEFAULT '1.00' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"component_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"date" date DEFAULT now() NOT NULL,
	"distance_at_event" numeric(10, 2),
	"hours_at_event" numeric(8, 2),
	"cost_cents" integer,
	"notes" text,
	"new_brand" text,
	"new_model" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ride_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"bike_id" uuid NOT NULL,
	"strava_activity_id" bigint,
	"date" date NOT NULL,
	"distance_km" numeric(8, 2) NOT NULL,
	"moving_time_seconds" integer,
	"is_indoor" boolean DEFAULT false NOT NULL,
	"conditions" text DEFAULT 'dry' NOT NULL,
	"source" text DEFAULT 'strava' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ride_logs_strava_activity_id_unique" UNIQUE("strava_activity_id")
);
--> statement-breakpoint
CREATE TABLE "sent_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"component_id" uuid NOT NULL,
	"alert_level" text NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"strava_id" bigint NOT NULL,
	"email" text,
	"name" text,
	"avatar_url" text,
	"plan" text DEFAULT 'free' NOT NULL,
	"trainer_type" text DEFAULT 'none' NOT NULL,
	"alert_email" boolean DEFAULT true NOT NULL,
	"alert_levels" text[] DEFAULT '{"warning","critical","overdue"}' NOT NULL,
	"strava_access_token" text,
	"strava_refresh_token" text,
	"strava_token_expires" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_strava_id_unique" UNIQUE("strava_id")
);
--> statement-breakpoint
ALTER TABLE "bikes" ADD CONSTRAINT "bikes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "component_relationships" ADD CONSTRAINT "component_relationships_primary_component_id_components_id_fk" FOREIGN KEY ("primary_component_id") REFERENCES "public"."components"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "component_relationships" ADD CONSTRAINT "component_relationships_dependent_component_id_components_id_fk" FOREIGN KEY ("dependent_component_id") REFERENCES "public"."components"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "components" ADD CONSTRAINT "components_bike_id_bikes_id_fk" FOREIGN KEY ("bike_id") REFERENCES "public"."bikes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_events" ADD CONSTRAINT "maintenance_events_component_id_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."components"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ride_logs" ADD CONSTRAINT "ride_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ride_logs" ADD CONSTRAINT "ride_logs_bike_id_bikes_id_fk" FOREIGN KEY ("bike_id") REFERENCES "public"."bikes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sent_alerts" ADD CONSTRAINT "sent_alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sent_alerts" ADD CONSTRAINT "sent_alerts_component_id_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."components"("id") ON DELETE cascade ON UPDATE no action;