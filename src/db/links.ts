import { asc, eq, inArray } from "drizzle-orm";
import type { Db } from "./client";
import { entities, entityLinks, type Entity } from "./schema";
import type { Doc } from "@/lib/entities";
import { mentionedIds } from "@/lib/rich-text/mentions";

/** Replaces an entry's outgoing links with the mentions in its description. Unknown ids are skipped. */
export async function syncLinks(db: Db, sourceId: string, body: Doc | null): Promise<void> {
  const ids = body ? mentionedIds(body).filter((id) => id !== sourceId) : [];
  const existing = ids.length
    ? await db.select({ id: entities.id }).from(entities).where(inArray(entities.id, ids))
    : [];
  await db.delete(entityLinks).where(eq(entityLinks.sourceId, sourceId));
  if (existing.length) {
    await db.insert(entityLinks).values(existing.map(({ id }) => ({ sourceId, targetId: id })));
  }
}

/** Rebuilds every link from scratch, e.g. after the table is first created. */
export async function rebuildAllLinks(db: Db): Promise<void> {
  const all = await db.select({ id: entities.id, body: entities.body }).from(entities);
  for (const { id, body } of all) await syncLinks(db, id, body);
}

/** Entries whose descriptions mention the given entry. */
export async function listBacklinks(db: Db, targetId: string): Promise<Entity[]> {
  const rows = await db
    .select({ entity: entities })
    .from(entityLinks)
    .innerJoin(entities, eq(entityLinks.sourceId, entities.id))
    .where(eq(entityLinks.targetId, targetId))
    .orderBy(asc(entities.name));
  return rows.map((r) => r.entity);
}
