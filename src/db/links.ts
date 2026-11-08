import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import type { Db } from "./client";
import { entities, entityLinks, reveals, type Entity, type Reveal } from "./schema";
import type { Doc } from "@/lib/entities";
import { mentionedIds } from "@/lib/rich-text/mentions";
import type { Gate } from "@/lib/reveals";

/** A mention of an entry: from another entry's description, or from inside one of its layers. */
export type Backlink = { entity: Entity; hiddenBehind: Gate | null };

async function existingIds(db: Db, ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const rows = await db.select({ id: entities.id }).from(entities).where(inArray(entities.id, ids));
  return rows.map((r) => r.id);
}

/** Replaces the links from an entry's description. Self-mentions and unknown ids are skipped. */
export async function syncLinks(db: Db, sourceId: string, body: Doc | null): Promise<void> {
  const targets = await existingIds(db, body ? mentionedIds(body).filter((id) => id !== sourceId) : []);
  await db
    .delete(entityLinks)
    .where(and(eq(entityLinks.sourceId, sourceId), isNull(entityLinks.sourceRevealId)));
  if (targets.length) {
    await db.insert(entityLinks).values(targets.map((targetId) => ({ sourceId, targetId })));
  }
}

/** Replaces the links from one reveal layer's success and failure text. */
export async function syncRevealLinks(db: Db, reveal: Reveal): Promise<void> {
  const mentioned = [reveal.successBody, reveal.failureBody].flatMap((doc) => (doc ? mentionedIds(doc) : []));
  const targets = await existingIds(
    db,
    [...new Set(mentioned)].filter((id) => id !== reveal.entityId),
  );
  await db.delete(entityLinks).where(eq(entityLinks.sourceRevealId, reveal.id));
  if (targets.length) {
    await db
      .insert(entityLinks)
      .values(
        targets.map((targetId) => ({ sourceId: reveal.entityId, sourceRevealId: reveal.id, targetId })),
      );
  }
}

/** Rebuilds every link from scratch, e.g. after the table changes shape. */
export async function rebuildAllLinks(db: Db): Promise<void> {
  await db.delete(entityLinks);
  for (const { id, body } of await db.select({ id: entities.id, body: entities.body }).from(entities)) {
    await syncLinks(db, id, body);
  }
  for (const reveal of await db.select().from(reveals)) await syncRevealLinks(db, reveal);
}

/** Entries that mention the given entry, with the check hiding the mention when it's in a layer. */
export async function listBacklinks(db: Db, targetId: string): Promise<Backlink[]> {
  const rows = await db
    .select({ entity: entities, reveal: reveals })
    .from(entityLinks)
    .innerJoin(entities, eq(entityLinks.sourceId, entities.id))
    .leftJoin(reveals, eq(entityLinks.sourceRevealId, reveals.id))
    .where(eq(entityLinks.targetId, targetId))
    .orderBy(asc(entities.name), asc(reveals.check));
  return rows.map(({ entity, reveal }) => ({
    entity,
    hiddenBehind: reveal && { checkKind: reveal.checkKind, check: reveal.check, dc: reveal.dc },
  }));
}
