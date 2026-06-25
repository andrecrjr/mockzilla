CREATE TABLE IF NOT EXISTS "mock_subfolders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"folder_id" uuid NOT NULL,
	"parent_id" uuid,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"main_path" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "mock_subfolders" ADD CONSTRAINT "mock_subfolders_folder_id_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mock_subfolders" ADD CONSTRAINT "mock_subfolders_parent_id_mock_subfolders_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."mock_subfolders"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "mock_subfolders_folder_main_path_unique" ON "mock_subfolders" ("folder_id","main_path");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "mock_subfolders_sibling_slug_unique" ON "mock_subfolders" ("folder_id","parent_id","slug");
--> statement-breakpoint
ALTER TABLE "mock_responses" ADD COLUMN IF NOT EXISTS "mock_folder_id" uuid;
--> statement-breakpoint
ALTER TABLE "mock_responses" ADD CONSTRAINT "mock_responses_mock_folder_id_mock_subfolders_id_fk" FOREIGN KEY ("mock_folder_id") REFERENCES "public"."mock_subfolders"("id") ON DELETE set null ON UPDATE no action;
