ALTER TABLE "scenario_state" ALTER COLUMN "data" SET DEFAULT '{"tables":{},"state":{}}'::jsonb;--> statement-breakpoint
ALTER TABLE "transitions" ALTER COLUMN "conditions" SET DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "transitions" ALTER COLUMN "effects" SET DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "transitions" ALTER COLUMN "meta" SET DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "mock_responses" ADD COLUMN "delay" integer DEFAULT 0 NOT NULL;