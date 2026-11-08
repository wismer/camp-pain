import { createId } from "@paralleldrive/cuid2";
import { index, integer, sqliteTable, text, type AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import type { Doc } from "@/lib/entities";
import { BRANCHES, CHECK_KINDS } from "@/lib/reveals";
import { entities } from "./entities";

/** A layer of an entry's description that only appears after a check. Layers nest. */
export const reveals = sqliteTable(
  "reveals",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    entityId: text("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    // Cascade: deleting a layer deletes everything nested under it.
    parentId: text("parent_id").references((): AnySQLiteColumn => reveals.id, { onDelete: "cascade" }),
    /** Which outcome of the parent this layer hangs off. Top-level layers use "success". */
    branch: text("branch", { enum: BRANCHES }).notNull().default("success"),
    checkKind: text("check_kind", { enum: CHECK_KINDS }).notNull(),
    // "check" is an SQL keyword, so the column gets a longer name.
    check: text("check_name").notNull(),
    dc: integer("dc"),
    successBody: text("success_body", { mode: "json" }).$type<Doc | null>(),
    failureBody: text("failure_body", { mode: "json" }).$type<Doc | null>(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("reveals_entity_id_idx").on(t.entityId), index("reveals_parent_id_idx").on(t.parentId)],
);

export type Reveal = typeof reveals.$inferSelect;
