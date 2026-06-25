ALTER TABLE "mock_responses" ADD COLUMN "variants" jsonb;--> statement-breakpoint
ALTER TABLE "mock_responses" ADD COLUMN "wildcard_require_match" boolean DEFAULT false;