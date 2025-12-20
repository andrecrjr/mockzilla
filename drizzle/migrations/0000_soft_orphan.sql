DO $$ BEGIN
 CREATE TYPE "public"."body_type" AS ENUM('json', 'text');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."http_method" AS ENUM('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."match_type" AS ENUM('exact', 'substring');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "folders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	CONSTRAINT "folders_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mock_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"endpoint" text NOT NULL,
	"method" "http_method" DEFAULT 'GET' NOT NULL,
	"status_code" integer DEFAULT 200 NOT NULL,
	"response" text NOT NULL,
	"folder_id" uuid NOT NULL,
	"match_type" "match_type" DEFAULT 'exact',
	"body_type" "body_type" DEFAULT 'json',
	"enabled" boolean DEFAULT true NOT NULL,
	"json_schema" text,
	"use_dynamic_response" boolean DEFAULT false NOT NULL,
	"echo_request_body" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scenario_state" (
	"scenario_id" text PRIMARY KEY NOT NULL,
	"data" jsonb DEFAULT '{"tables": {}, "state": {}}' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scenarios" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"scenario_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"path" text NOT NULL,
	"method" text NOT NULL,
	"conditions" jsonb DEFAULT '{}',
	"effects" jsonb DEFAULT '[]',
	"response" jsonb NOT NULL,
	"meta" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mock_responses" ADD CONSTRAINT "mock_responses_folder_id_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
