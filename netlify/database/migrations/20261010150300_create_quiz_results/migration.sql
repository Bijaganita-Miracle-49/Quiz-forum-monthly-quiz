CREATE TABLE "quiz_results" (
	"id" serial PRIMARY KEY,
	"attempt_id" text NOT NULL UNIQUE,
	"name" text NOT NULL,
	"edition" text NOT NULL,
	"question_order" jsonb NOT NULL,
	"answers" jsonb NOT NULL,
	"score" integer NOT NULL,
	"max_score" integer NOT NULL,
	"total_questions" integer NOT NULL,
	"percentage" double precision NOT NULL,
	"correct" integer NOT NULL,
	"incorrect" integer NOT NULL,
	"timed_out" integer NOT NULL,
	"certificate_id" text NOT NULL UNIQUE,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sheet_synced_at" timestamp with time zone,
	"sheet_sync_error" text,
	"sheet_retry_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sheet_lease_until" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "quiz_results_pending_sync_idx" ON "quiz_results" ("sheet_synced_at","sheet_retry_at");