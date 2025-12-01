ALTER TABLE "mock_responses" ADD COLUMN "json_schema" text;--> statement-breakpoint
ALTER TABLE "mock_responses" ADD COLUMN "use_dynamic_response" boolean DEFAULT false NOT NULL;