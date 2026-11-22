ALTER TABLE "users" ADD COLUMN "onboarded_at" timestamp with time zone;--> statement-breakpoint
-- Existing users already use the app; only new sign-ups see onboarding.
UPDATE "users" SET "onboarded_at" = "created_at";
