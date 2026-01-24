ALTER TABLE "mock_responses" ALTER COLUMN "match_type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "folders" ADD COLUMN "meta" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
DROP TYPE "public"."match_type";