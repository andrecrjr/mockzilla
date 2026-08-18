CREATE TYPE "public"."journey_field_type" AS ENUM('string', 'number', 'boolean');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "journey_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journey_id" uuid NOT NULL,
	"name" text NOT NULL,
	"method" "http_method" NOT NULL,
	"path" text NOT NULL,
	"requires" jsonb NOT NULL,
	"transitions" jsonb NOT NULL,
	"set_fields" jsonb NOT NULL,
	"match_signature" text NOT NULL,
	"status_code" integer NOT NULL,
	"headers" jsonb NOT NULL,
	"body" jsonb NOT NULL,
	"body_type" "body_type" NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "journey_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journey_id" uuid NOT NULL,
	"key" text NOT NULL,
	"type" "journey_field_type" NOT NULL,
	"initial_value" jsonb NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "journey_lifecycles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journey_id" uuid NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"states" jsonb NOT NULL,
	"initial_state" text NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "journey_runtime_states" (
	"journey_id" uuid PRIMARY KEY NOT NULL,
	"state" jsonb NOT NULL,
	"fields" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "journeys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	CONSTRAINT "journeys_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "journey_actions" ADD CONSTRAINT "journey_actions_journey_id_journeys_id_fk" FOREIGN KEY ("journey_id") REFERENCES "public"."journeys"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "journey_fields" ADD CONSTRAINT "journey_fields_journey_id_journeys_id_fk" FOREIGN KEY ("journey_id") REFERENCES "public"."journeys"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "journey_lifecycles" ADD CONSTRAINT "journey_lifecycles_journey_id_journeys_id_fk" FOREIGN KEY ("journey_id") REFERENCES "public"."journeys"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "journey_runtime_states" ADD CONSTRAINT "journey_runtime_states_journey_id_journeys_id_fk" FOREIGN KEY ("journey_id") REFERENCES "public"."journeys"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "journey_actions_match_unique" ON "journey_actions" USING btree ("journey_id","method","path","match_signature");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "journey_fields_journey_key_unique" ON "journey_fields" USING btree ("journey_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "journey_lifecycles_journey_key_unique" ON "journey_lifecycles" USING btree ("journey_id","key");