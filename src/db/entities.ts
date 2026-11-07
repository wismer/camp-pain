import { asc, eq } from "drizzle-orm";
import type { Db } from "./client";
import { entities, type Entity } from "./schema";
import {
  REQUIRES_PARENT,
  canContain,
  createEntitySchema,
  parseAttributes,
  slugify,
  updateEntitySchema,
  type CreateEntityInput,
  type EntityType,
  type UpdateEntityInput,
} from "@/lib/entities";

export type EntityErrorCode = "not_found" | "invalid_parent" | "parent_cycle" | "has_children";

export class EntityError extends Error {
  constructor(
    readonly code: EntityErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "EntityError";
  }
}

// Guards against corrupt data looping forever; real hierarchies are a handful deep.
const MAX_DEPTH = 64;

export async function getEntity(db: Db, id: string): Promise<Entity | undefined> {
  const [row] = await db.select().from(entities).where(eq(entities.id, id));
  return row;
}

export async function getEntityBySlug(db: Db, slug: string): Promise<Entity | undefined> {
  const [row] = await db.select().from(entities).where(eq(entities.slug, slug));
  return row;
}

export async function listEntities(db: Db, filter: { type?: EntityType } = {}): Promise<Entity[]> {
  return db
    .select()
    .from(entities)
    .where(filter.type ? eq(entities.type, filter.type) : undefined)
    .orderBy(asc(entities.name));
}

export async function listChildren(db: Db, parentId: string): Promise<Entity[]> {
  return db.select().from(entities).where(eq(entities.parentId, parentId)).orderBy(asc(entities.name));
}

/** Parent chain from the top-level ancestor down to the entity's direct parent. */
export async function getAncestors(db: Db, id: string): Promise<Entity[]> {
  const chain: Entity[] = [];
  let current = await getEntity(db, id);
  while (current?.parentId && chain.length < MAX_DEPTH) {
    const parent = await getEntity(db, current.parentId);
    if (!parent) break;
    chain.unshift(parent);
    current = parent;
  }
  return chain;
}

export async function createEntity(db: Db, input: CreateEntityInput): Promise<Entity> {
  const data = createEntitySchema.parse(input);
  const attributes = parseAttributes(data.type, data.attributes);
  await assertValidParent(db, { type: data.type, parentId: data.parentId });

  const [row] = await db
    .insert(entities)
    .values({ ...data, attributes, slug: await uniqueSlug(db, data.name) })
    .returning();
  return row;
}

/** Omitted fields are left unchanged; `attributes`, when given, replaces the whole object. */
export async function updateEntity(db: Db, id: string, input: UpdateEntityInput): Promise<Entity> {
  const existing = await requireEntity(db, id);
  const patch = updateEntitySchema.parse(input);

  if (patch.parentId !== undefined) {
    await assertValidParent(db, { id, type: existing.type, parentId: patch.parentId });
  }
  const attributes =
    patch.attributes === undefined ? undefined : parseAttributes(existing.type, patch.attributes);
  const slug =
    patch.name === undefined || patch.name === existing.name
      ? undefined
      : await uniqueSlug(db, patch.name, id);

  const [row] = await db
    .update(entities)
    .set({ ...patch, attributes, slug, updatedAt: new Date() })
    .where(eq(entities.id, id))
    .returning();
  return row;
}

export async function deleteEntity(db: Db, id: string): Promise<void> {
  await requireEntity(db, id);
  const children = await listChildren(db, id);
  if (children.length > 0) {
    throw new EntityError(
      "has_children",
      `Can't delete: ${children.length} ${children.length === 1 ? "entity is" : "entities are"} inside it`,
    );
  }
  await db.delete(entities).where(eq(entities.id, id));
}

async function requireEntity(db: Db, id: string): Promise<Entity> {
  const entity = await getEntity(db, id);
  if (!entity) throw new EntityError("not_found", `Entity ${id} not found`);
  return entity;
}

async function assertValidParent(
  db: Db,
  child: { id?: string; type: EntityType; parentId: string | null },
): Promise<void> {
  if (child.parentId === null) {
    if (REQUIRES_PARENT.includes(child.type)) {
      throw new EntityError("invalid_parent", `A ${child.type} must sit inside something`);
    }
    return;
  }

  const parent = await getEntity(db, child.parentId);
  if (!parent) throw new EntityError("invalid_parent", "Parent not found");
  if (!canContain(parent.type, child.type)) {
    throw new EntityError("invalid_parent", `A ${child.type} can't sit inside a ${parent.type}`);
  }

  if (child.id === undefined) return;
  if (parent.id === child.id) throw new EntityError("parent_cycle", "An entity can't contain itself");
  const ancestors = await getAncestors(db, parent.id);
  if (ancestors.some((a) => a.id === child.id)) {
    throw new EntityError("parent_cycle", "That would put an entity inside its own descendant");
  }
}

async function uniqueSlug(db: Db, name: string, ownId?: string): Promise<string> {
  const base = slugify(name);
  for (let n = 1; ; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    const taken = await getEntityBySlug(db, candidate);
    if (!taken || taken.id === ownId) return candidate;
  }
}
