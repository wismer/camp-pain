import { createId } from "@paralleldrive/cuid2";
import { index, integer, sqliteTable, text, type AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import { ENTITY_TYPES, type Doc } from "@/lib/entities";

export const entities = sqliteTable(
  "entities",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    type: text("type", { enum: ENTITY_TYPES }).notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    summary: text("summary").notNull().default(""),
    body: text("body", { mode: "json" }).$type<Doc | null>(),
    attributes: text("attributes", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull()
      .$defaultFn(() => ({})),
    // Restrict: an entity with children can't be deleted out from under them.
    parentId: text("parent_id").references((): AnySQLiteColumn => entities.id, {
      onDelete: "restrict",
    }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("entities_parent_id_idx").on(t.parentId), index("entities_type_idx").on(t.type)],
);

export type Entity = typeof entities.$inferSelect;
