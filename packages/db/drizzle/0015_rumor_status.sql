CREATE TYPE "public"."rumor_state" AS ENUM('open', 'confirmed', 'denied');--> statement-breakpoint
CREATE TABLE "rumor_status" (
	"post_id" uuid PRIMARY KEY NOT NULL,
	"status" "rumor_state" DEFAULT 'open' NOT NULL,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "rumor_status" ADD CONSTRAINT "rumor_status_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rumor_status" ADD CONSTRAINT "rumor_status_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;