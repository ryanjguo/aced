CREATE TYPE "public"."tag_entity" AS ENUM('player', 'team', 'event');--> statement-breakpoint
CREATE TABLE "post_tags" (
	"post_id" uuid NOT NULL,
	"entity_type" "tag_entity" NOT NULL,
	"entity_id" uuid NOT NULL,
	CONSTRAINT "post_tags_post_id_entity_type_entity_id_pk" PRIMARY KEY("post_id","entity_type","entity_id")
);
--> statement-breakpoint
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "post_tags_entity_type_entity_id_post_id_index" ON "post_tags" USING btree ("entity_type","entity_id","post_id");