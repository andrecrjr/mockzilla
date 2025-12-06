CREATE TABLE IF NOT EXISTS "scenario_state" (
	"scenario_id" text PRIMARY KEY NOT NULL,
	"data" jsonb DEFAULT '{"tables": {}, "state": {}}' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"scenario_id" text NOT NULL,
	"name" text NOT NULL,
	"path" text NOT NULL,
	"method" text NOT NULL,
	"conditions" jsonb DEFAULT '{}',
	"effects" jsonb DEFAULT '[]',
	"response" jsonb NOT NULL,
	"meta" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
