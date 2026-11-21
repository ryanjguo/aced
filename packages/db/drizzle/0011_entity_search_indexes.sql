CREATE INDEX "events_name_trgm" ON "events" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "players_handle_trgm" ON "players" USING gin ("handle" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "teams_name_trgm" ON "teams" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "teams_tag_trgm" ON "teams" USING gin ("tag" gin_trgm_ops);