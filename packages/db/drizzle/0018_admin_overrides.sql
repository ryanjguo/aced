ALTER TYPE "public"."mod_action_type" ADD VALUE 'fix_series';--> statement-breakpoint
ALTER TYPE "public"."mod_action_type" ADD VALUE 'regenerate_post';--> statement-breakpoint
ALTER TYPE "public"."report_target" ADD VALUE 'series';--> statement-breakpoint
ALTER TABLE "series" ADD COLUMN "manual_override" boolean DEFAULT false NOT NULL;