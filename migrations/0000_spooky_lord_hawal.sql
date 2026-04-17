CREATE TABLE "activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"description" text NOT NULL,
	"timestamp" text NOT NULL,
	"related_name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"channel" text NOT NULL,
	"status" text NOT NULL,
	"sent_count" integer NOT NULL,
	"open_rate" double precision NOT NULL,
	"reply_rate" double precision NOT NULL,
	"steps" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidates" (
	"id" serial PRIMARY KEY NOT NULL,
	"loxo_id" integer,
	"name" text NOT NULL,
	"title" text NOT NULL,
	"company" text NOT NULL,
	"location" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"linkedin" text NOT NULL,
	"match_score" integer NOT NULL,
	"status" text NOT NULL,
	"last_contact" text NOT NULL,
	"tags" text NOT NULL,
	"notes" text NOT NULL,
	"timeline" text NOT NULL,
	"linkedin_synced_at" text,
	"linkedin_snapshot" text,
	"linkedin_changes" text,
	"linkedin_sync_error" text,
	CONSTRAINT "candidates_loxo_id_unique" UNIQUE("loxo_id")
);
--> statement-breakpoint
CREATE TABLE "commission_splits" (
	"id" serial PRIMARY KEY NOT NULL,
	"placement_id" integer NOT NULL,
	"employee" text NOT NULL,
	"split_percent" double precision NOT NULL,
	"commission_rate" double precision NOT NULL,
	"commission_amount" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"candidate_id" integer NOT NULL,
	"candidate_name" text NOT NULL,
	"candidate_title" text NOT NULL,
	"job_title" text NOT NULL,
	"job_company" text NOT NULL,
	"interview_type" text NOT NULL,
	"interview_date" text NOT NULL,
	"interviewer" text NOT NULL,
	"duration" integer NOT NULL,
	"overall_rating" integer NOT NULL,
	"notes" text NOT NULL,
	"strengths" text NOT NULL,
	"concerns" text NOT NULL,
	"salary_discussed" text,
	"next_steps" text NOT NULL,
	"recommendation" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_number" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"client_name" text NOT NULL,
	"client_email" text DEFAULT '',
	"client_address" text DEFAULT '',
	"candidate_name" text DEFAULT '',
	"job_title" text DEFAULT '',
	"salary" double precision DEFAULT 0,
	"fee_percent" double precision DEFAULT 0,
	"subtotal" double precision NOT NULL,
	"tax_percent" double precision DEFAULT 0,
	"tax_amount" double precision DEFAULT 0,
	"total" double precision NOT NULL,
	"amount_paid" double precision DEFAULT 0,
	"amount_due" double precision NOT NULL,
	"line_items" text DEFAULT '[]' NOT NULL,
	"issue_date" text NOT NULL,
	"due_date" text NOT NULL,
	"paid_date" text,
	"notes" text DEFAULT '',
	"terms" text DEFAULT 'Net 30',
	"qb_invoice_id" text,
	"qb_customer_id" text,
	"qb_sync_token" text,
	"qb_synced_at" text,
	"qb_payment_id" text,
	"placement_id" integer,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"loxo_id" integer,
	"title" text NOT NULL,
	"company" text NOT NULL,
	"location" text NOT NULL,
	"stage" text NOT NULL,
	"candidate_count" integer NOT NULL,
	"days_open" integer NOT NULL,
	"fee_potential" text NOT NULL,
	"description" text NOT NULL,
	"requirements" text NOT NULL,
	CONSTRAINT "jobs_loxo_id_unique" UNIQUE("loxo_id")
);
--> statement-breakpoint
CREATE TABLE "opportunities" (
	"id" serial PRIMARY KEY NOT NULL,
	"company" text NOT NULL,
	"contact_person" text NOT NULL,
	"estimated_fee" text NOT NULL,
	"stage" text NOT NULL,
	"ai_score" text NOT NULL,
	"last_activity" text NOT NULL,
	"notes" text NOT NULL,
	"win_probability" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "placements" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_title" text NOT NULL,
	"company" text NOT NULL,
	"client_name" text NOT NULL,
	"candidate_name" text NOT NULL,
	"candidate_id" integer,
	"salary" double precision NOT NULL,
	"fee_percent" double precision NOT NULL,
	"fee_amount" double precision NOT NULL,
	"invoice_status" text DEFAULT 'pending' NOT NULL,
	"invoice_date" text,
	"paid_date" text,
	"paid_amount" double precision DEFAULT 0,
	"placed_date" text NOT NULL,
	"start_date" text,
	"guarantee_days" integer DEFAULT 90,
	"notes" text DEFAULT '',
	"lead_recruiter" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
