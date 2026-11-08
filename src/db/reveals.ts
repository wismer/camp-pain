import { and, asc, eq, isNull } from "drizzle-orm";
import type { Db } from "./client";
import { EntityError, getEntity } from "./entities";
import { reveals, type Reveal } from "./schema";
import {
  createRevealSchema,
  gateSchema,
  updateRevealSchema,
  type Branch,
  type CreateRevealInput,
  type UpdateRevealInput,
} from "@/lib/reveals";

export type RevealNode = Reveal & { children: Record<Branch, RevealNode[]> };

export async function getReveal(db: Db, id: string): Promise<Reveal | undefined> {
  const [row] = await db.select().from(reveals).where(eq(reveals.id, id));
  return row;
}

/** An entry's layers as a tree, siblings in sort order. Entries have few layers, so one query suffices. */
export async function getRevealTree(db: Db, entityId: string): Promise<RevealNode[]> {
  const rows = await db
    .select()
    .from(reveals)
    .where(eq(reveals.entityId, entityId))
    .orderBy(asc(reveals.sortOrder), asc(reveals.createdAt));
  const nodes = new Map<string, RevealNode>(
    rows.map((r) => [r.id, { ...r, children: { success: [], failure: [] } }]),
  );
  const roots: RevealNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    (parent ? parent.children[node.branch] : roots).push(node);
  }
  return roots;
}

/** How many layers sit beneath a node, at any depth (for delete confirmations). */
export function countDescendants(node: RevealNode): number {
  return [...node.children.success, ...node.children.failure].reduce(
    (n, c) => n + 1 + countDescendants(c),
    0,
  );
}

export async function createReveal(db: Db, input: CreateRevealInput): Promise<Reveal> {
  const data = createRevealSchema.parse(input);
  gateSchema.parse(data);
  if (!(await getEntity(db, data.entityId))) throw new EntityError("not_found", "Entry not found");

  if (data.parentId) {
    const parent = await getReveal(db, data.parentId);
    if (!parent) throw new EntityError("invalid_reveal", "Parent layer not found");
    if (parent.entityId !== data.entityId) {
      throw new EntityError("invalid_reveal", "A layer can only nest under a layer of the same entry");
    }
  }
  const branch = data.parentId ? data.branch : "success";
  const siblings = await listSiblings(db, { entityId: data.entityId, parentId: data.parentId, branch });
  const sortOrder = siblings.length ? Math.max(...siblings.map((s) => s.sortOrder)) + 1 : 0;

  const [row] = await db
    .insert(reveals)
    .values({ ...data, branch, sortOrder })
    .returning();
  return row;
}

export async function updateReveal(db: Db, id: string, input: UpdateRevealInput): Promise<Reveal> {
  const existing = await requireReveal(db, id);
  const patch = updateRevealSchema.parse(input);
  // Validate the gate as it will be after the change, since kind, check and DC depend on each other.
  gateSchema.parse({ ...pickGate(existing), ...stripUndefined(pickGate(patch)) });

  const [row] = await db
    .update(reveals)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(reveals.id, id))
    .returning();
  return row;
}

/** Deletes a layer and, through the foreign key cascade, every layer nested under it. */
export async function deleteReveal(db: Db, id: string): Promise<void> {
  await requireReveal(db, id);
  await db.delete(reveals).where(eq(reveals.id, id));
}

/** Swaps a layer with its neighbour among siblings. Moving past either end is a no-op. */
export async function moveReveal(db: Db, id: string, direction: "up" | "down"): Promise<void> {
  const reveal = await requireReveal(db, id);
  const siblings = await listSiblings(db, reveal);
  const index = siblings.findIndex((s) => s.id === id);
  const other = siblings[direction === "up" ? index - 1 : index + 1];
  if (!other) return;

  // Rewrite positions from the list order so ties from older data can't make a swap a no-op.
  const order = siblings.map((s) => s.id);
  [order[index], order[siblings.indexOf(other)]] = [other.id, id];
  for (const [position, siblingId] of order.entries()) {
    await db.update(reveals).set({ sortOrder: position }).where(eq(reveals.id, siblingId));
  }
}

async function listSiblings(db: Db, at: Pick<Reveal, "entityId" | "parentId" | "branch">): Promise<Reveal[]> {
  return db
    .select()
    .from(reveals)
    .where(
      and(
        eq(reveals.entityId, at.entityId),
        at.parentId ? eq(reveals.parentId, at.parentId) : isNull(reveals.parentId),
        eq(reveals.branch, at.branch),
      ),
    )
    .orderBy(asc(reveals.sortOrder), asc(reveals.createdAt));
}

async function requireReveal(db: Db, id: string): Promise<Reveal> {
  const reveal = await getReveal(db, id);
  if (!reveal) throw new EntityError("not_found", `Layer ${id} not found`);
  return reveal;
}

function pickGate<T extends { checkKind?: unknown; check?: unknown; dc?: unknown }>({
  checkKind,
  check,
  dc,
}: T) {
  return { checkKind, check, dc };
}

function stripUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}
