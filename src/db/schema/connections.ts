import { createId } from "@paralleldrive/cuid2";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { entities } from "./entities";
import { reveals } from "./reveals";

/** A way to get from one spatial entity to another: a doorway, a road, a hatch. */
export const connections = sqliteTable(
  "connections",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    fromId: text("from_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    toId: text("to_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    reverseLabel: text("reverse_label"),
    oneWay: integer("one_way", { mode: "boolean" }).notNull().default(false),
    notes: text("notes").notNull().default(""),
    /** Hidden until this layer succeeds in play. Deleting the layer un-hides the exit. */
    revealId: text("reveal_id").references(() => reveals.id, { onDelete: "set null" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("connections_from_id_idx").on(t.fromId), index("connections_to_id_idx").on(t.toId)],
);

export type Connection = typeof connections.$inferSelect;
