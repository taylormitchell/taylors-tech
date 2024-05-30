import { text, pgTable, integer } from "drizzle-orm/pg-core";

export const note = pgTable("note", {
  id: text("id").primaryKey().notNull(),
  title: text("title"),
  body: text("body"),
  version: integer("version").notNull(),
  createdAt: text("created_at").notNull(),
  deletedAt: text("deleted_at"),
});

export const replicacheServer = pgTable("replicache_server", {
  id: integer("id").primaryKey().notNull(),
  version: integer("version"),
});

export const replicacheClient = pgTable("replicache_client", {
  id: text("id").primaryKey().notNull(),
  clientGroupId: text("client_group_id").notNull(),
  lastMutationID: integer("last_mutation_id").notNull(),
  version: integer("version").notNull(),
});
