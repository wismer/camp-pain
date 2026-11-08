import { and, eq } from "drizzle-orm";
import type { Db } from "./client";
import { EntityError, getEntity } from "./entities";
import { getReveal } from "./reveals";
import { connections, entities, reveals, type Connection, type Entity, type Reveal } from "./schema";
import { createConnectionSchema, type CreateConnectionInput } from "@/lib/connections";
import { SPATIAL_TYPES } from "@/lib/entities";
import type { Gate } from "@/lib/reveals";

/** A connection as seen from one of its ends. */
export type Exit = {
  connectionId: string;
  label: string;
  /** "forward" when this entity is the connection's `from` side. */
  direction: "forward" | "reverse";
  oneWay: boolean;
  notes: string;
  to: Entity;
  /** The check that keeps this exit hidden in play, if any. */
  hiddenBehind: Gate | null;
};

export async function createConnection(db: Db, input: CreateConnectionInput): Promise<Connection> {
  const data = createConnectionSchema.parse(input);
  if (data.fromId === data.toId) {
    throw new EntityError("invalid_connection", "A connection needs two different ends");
  }
  await requireSpatial(db, data.fromId);
  await requireSpatial(db, data.toId);
  if (data.revealId) {
    const reveal = await getReveal(db, data.revealId);
    if (!reveal || (reveal.entityId !== data.fromId && reveal.entityId !== data.toId)) {
      throw new EntityError("invalid_connection", "An exit can only hide behind a layer of one of its ends");
    }
  }

  const [row] = await db
    .insert(connections)
    .values({ ...data, reverseLabel: data.oneWay ? null : data.reverseLabel })
    .returning();
  return row;
}

export async function deleteConnection(db: Db, id: string): Promise<void> {
  const deleted = await db.delete(connections).where(eq(connections.id, id)).returning();
  if (deleted.length === 0) throw new EntityError("not_found", `Connection ${id} not found`);
}

/** Every way out of an entity: its own connections, plus two-way connections that lead to it. */
export async function listExits(db: Db, entityId: string): Promise<Exit[]> {
  const outgoing = await db
    .select({ connection: connections, to: entities, reveal: reveals })
    .from(connections)
    .innerJoin(entities, eq(connections.toId, entities.id))
    .leftJoin(reveals, eq(connections.revealId, reveals.id))
    .where(eq(connections.fromId, entityId));
  const incoming = await db
    .select({ connection: connections, to: entities, reveal: reveals })
    .from(connections)
    .innerJoin(entities, eq(connections.fromId, entities.id))
    .leftJoin(reveals, eq(connections.revealId, reveals.id))
    .where(and(eq(connections.toId, entityId), eq(connections.oneWay, false)));

  const exits: Exit[] = [
    ...outgoing.map(({ connection, to, reveal }) =>
      toExit(connection, to, reveal, "forward", connection.label),
    ),
    ...incoming.map(({ connection, to, reveal }) =>
      toExit(connection, to, reveal, "reverse", connection.reverseLabel ?? connection.label),
    ),
  ];
  return exits.sort((a, b) => a.label.localeCompare(b.label) || a.to.name.localeCompare(b.to.name));
}

function toExit(
  connection: Connection,
  to: Entity,
  reveal: Reveal | null,
  direction: Exit["direction"],
  label: string,
): Exit {
  return {
    connectionId: connection.id,
    label,
    direction,
    oneWay: connection.oneWay,
    notes: connection.notes,
    to,
    hiddenBehind: reveal && { checkKind: reveal.checkKind, check: reveal.check, dc: reveal.dc },
  };
}

async function requireSpatial(db: Db, id: string): Promise<void> {
  const entity = await getEntity(db, id);
  if (!entity) throw new EntityError("invalid_connection", `Entity ${id} not found`);
  if (!(SPATIAL_TYPES as readonly string[]).includes(entity.type)) {
    throw new EntityError("invalid_connection", `A ${entity.type} can't be connected; only places can`);
  }
}
