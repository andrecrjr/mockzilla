CREATE TYPE "public"."body_type" AS ENUM('json', 'text');--> statement-breakpoint
CREATE TYPE "public"."http_method" AS ENUM('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS');--> statement-breakpoint
CREATE TYPE "public"."match_type" AS ENUM('exact', 'substring');--> statement-breakpoint
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
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mock_responses" ADD CONSTRAINT "mock_responses_folder_id_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
