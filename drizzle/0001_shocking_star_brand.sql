CREATE TABLE "daily_usage" (
	"day" text PRIMARY KEY NOT NULL,
	"uploads" integer DEFAULT 0 NOT NULL,
	"upload_seconds" integer DEFAULT 0 NOT NULL,
	"chats" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transcripts" ADD COLUMN "is_sample" boolean DEFAULT false NOT NULL;