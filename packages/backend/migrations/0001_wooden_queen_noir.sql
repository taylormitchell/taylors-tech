CREATE TABLE IF NOT EXISTS "replicache_client" (
	"id" text PRIMARY KEY NOT NULL,
	"client_group_id" text NOT NULL,
	"last_mutation_id" integer NOT NULL,
	"version" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "replicache_server" (
	"id" integer PRIMARY KEY NOT NULL,
	"version" integer
);

--> statement-breakpoint
-- add a version row to the server table
INSERT INTO "replicache_server" ("id", "version") VALUES (1, 1);

--> statement-breakpoint
-- add a version column to the note table, defaulting to initial version 1
ALTER TABLE "note" ADD COLUMN "version" integer NOT NULL DEFAULT 1;

