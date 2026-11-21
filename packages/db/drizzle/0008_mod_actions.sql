CREATE TYPE "public"."mod_action_type" AS ENUM('remove', 'restore', 'lock', 'unlock', 'ban', 'unban', 'dismiss');--> statement-breakpoint
CREATE TABLE "mod_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" "mod_action_type" NOT NULL,
	"target_type" "report_target" NOT NULL,
	"target_id" uuid NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "banned_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "mod_actions" ADD CONSTRAINT "mod_actions_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mod_actions_target_type_target_id_index" ON "mod_actions" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "mod_actions_created_at_index" ON "mod_actions" USING btree ("created_at");