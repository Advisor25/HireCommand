CREATE TABLE "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"website" text DEFAULT '',
	"industry" text DEFAULT '',
	"size" text DEFAULT '',
	"type" text DEFAULT '',
	"pe_firm" text DEFAULT '',
	"hq_location" text DEFAULT '',
	"description" text DEFAULT '',
	"notes" text DEFAULT '',
	"linkedin_url" text DEFAULT '',
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer,
	"company_name" text DEFAULT '',
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"title" text DEFAULT '',
	"email" text DEFAULT '',
	"phone" text DEFAULT '',
	"mobile" text DEFAULT '',
	"linkedin" text DEFAULT '',
	"role" text DEFAULT 'hiring_manager',
	"notes" text DEFAULT '',
	"created_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "candidate_count" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "days_open" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "fee_potential" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "description" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "requirements" SET DEFAULT '[]';--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "company_id" integer;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "hiring_manager_id" integer;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "salary" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "fee_percent" double precision DEFAULT 0;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "priority" text DEFAULT 'medium';--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "job_type" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "open_date" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "target_close_date" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "notes" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "created_at" text DEFAULT '';