import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { entities } from "./entities";
import { reveals } from "./reveals";

/**
 * Which entries mention which, derived from descriptions and reveal layers and rebuilt whenever
 * one is saved. `sourceRevealId` is set when the mention sits inside a layer of the source entry.
 */
export const entityLinks = sqliteTable(
  "entity_links",
  {
    sourceId: text("source_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    sourceRevealId: text("source_reveal_id").references(() => reveals.id, { onDelete: "cascade" }),
    targetId: text("target_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
  },
  (t) => [
    index("entity_links_source_id_idx").on(t.sourceId, t.sourceRevealId),
    index("entity_links_target_id_idx").on(t.targetId),
  ],
);
