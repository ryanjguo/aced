CREATE TYPE "public"."region" AS ENUM('americas', 'emea', 'pacific', 'china', 'international');--> statement-breakpoint
CREATE TYPE "public"."series_status" AS ENUM('scheduled', 'live', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grid_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" "citext" NOT NULL,
	"region" "region",
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_gridId_unique" UNIQUE("grid_id"),
	CONSTRAINT "events_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "maps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grid_id" text,
	"series_id" uuid NOT NULL,
	"order" smallint NOT NULL,
	"map_name" text NOT NULL,
	"score_a" smallint DEFAULT 0 NOT NULL,
	"score_b" smallint DEFAULT 0 NOT NULL,
	"winner_id" uuid,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "maps_gridId_unique" UNIQUE("grid_id"),
	CONSTRAINT "maps_seriesId_order_unique" UNIQUE("series_id","order")
);
--> statement-breakpoint
CREATE TABLE "player_map_stats" (
	"map_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"agent" text,
	"kills" smallint NOT NULL,
	"deaths" smallint NOT NULL,
	"assists" smallint NOT NULL,
	"acs" smallint,
	"adr" real,
	"first_kills" smallint,
	"first_deaths" smallint,
	"headshot_pct" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "player_map_stats_map_id_player_id_pk" PRIMARY KEY("map_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grid_id" text NOT NULL,
	"handle" text NOT NULL,
	"slug" "citext" NOT NULL,
	"real_name" text,
	"country" text,
	"current_team_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "players_gridId_unique" UNIQUE("grid_id"),
	CONSTRAINT "players_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "roster_stints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"role" text,
	"joined_at" timestamp with time zone,
	"left_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "series" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grid_id" text NOT NULL,
	"event_id" uuid NOT NULL,
	"team_a_id" uuid,
	"team_b_id" uuid,
	"best_of" smallint NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"status" "series_status" DEFAULT 'scheduled' NOT NULL,
	"score_a" smallint DEFAULT 0 NOT NULL,
	"score_b" smallint DEFAULT 0 NOT NULL,
	"winner_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "series_gridId_unique" UNIQUE("grid_id"),
	CONSTRAINT "series_best_of_check" CHECK ("series"."best_of" in (1, 3, 5))
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grid_id" text NOT NULL,
	"name" text NOT NULL,
	"tag" text NOT NULL,
	"slug" "citext" NOT NULL,
	"region" "region",
	"logo_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "teams_gridId_unique" UNIQUE("grid_id"),
	CONSTRAINT "teams_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "maps" ADD CONSTRAINT "maps_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maps" ADD CONSTRAINT "maps_winner_id_teams_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_map_stats" ADD CONSTRAINT "player_map_stats_map_id_maps_id_fk" FOREIGN KEY ("map_id") REFERENCES "public"."maps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_map_stats" ADD CONSTRAINT "player_map_stats_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_map_stats" ADD CONSTRAINT "player_map_stats_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_current_team_id_teams_id_fk" FOREIGN KEY ("current_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roster_stints" ADD CONSTRAINT "roster_stints_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roster_stints" ADD CONSTRAINT "roster_stints_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series" ADD CONSTRAINT "series_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series" ADD CONSTRAINT "series_team_a_id_teams_id_fk" FOREIGN KEY ("team_a_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series" ADD CONSTRAINT "series_team_b_id_teams_id_fk" FOREIGN KEY ("team_b_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series" ADD CONSTRAINT "series_winner_id_teams_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_starts_at_index" ON "events" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "player_map_stats_player_id_index" ON "player_map_stats" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "players_current_team_id_index" ON "players" USING btree ("current_team_id");--> statement-breakpoint
CREATE INDEX "roster_stints_player_id_index" ON "roster_stints" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "roster_stints_team_id_index" ON "roster_stints" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "series_scheduled_at_index" ON "series" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "series_event_id_scheduled_at_index" ON "series" USING btree ("event_id","scheduled_at");