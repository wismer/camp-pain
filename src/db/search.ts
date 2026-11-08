import { asc, desc, sql } from "drizzle-orm";
import type { Db } from "./client";
import { entities } from "./schema";

// The one place for text matching, which differs between databases. SQLite's lower() only folds
// ASCII; Postgres folds all of Unicode (or use ILIKE there).

const resultColumns = {
  id: entities.id,
  type: entities.type,
  name: entities.name,
  slug: entities.slug,
  summary: entities.summary,
};
export type SearchResult = { [K in keyof typeof resultColumns]: (typeof entities.$inferSelect)[K] };

function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * Entries whose name, or any word in it, starts with the query (case-insensitive); name prefixes
 * first. An empty query returns the most recently edited entries.
 */
export async function searchEntities(db: Db, query: string, limit = 10): Promise<SearchResult[]> {
  const term = escapeLike(query.trim().toLowerCase());
  if (!term) {
    return db.select(resultColumns).from(entities).orderBy(desc(entities.updatedAt)).limit(limit);
  }
  const name = sql`lower(${entities.name})`;
  const startsWith = sql`${name} LIKE ${`${term}%`} ESCAPE '\\'`;
  const wordStartsWith = sql`${name} LIKE ${`% ${term}%`} ESCAPE '\\'`;
  return db
    .select(resultColumns)
    .from(entities)
    .where(sql`${startsWith} OR ${wordStartsWith}`)
    .orderBy(sql`CASE WHEN ${startsWith} THEN 0 ELSE 1 END`, asc(entities.name))
    .limit(limit);
}
