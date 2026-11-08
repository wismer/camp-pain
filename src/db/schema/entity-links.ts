import { index, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { entities } from "./entities";

/** Which entries mention which, derived from descriptions and rebuilt whenever one is saved. */
export const entityLinks = sqliteTable(
  "entity_links",
  {
    sourceId: text("source_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    targetId: text("target_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.sourceId, t.targetId] }), index("entity_links_target_id_idx").on(t.targetId)],
);
