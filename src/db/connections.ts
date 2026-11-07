import { and, eq } from "drizzle-orm";
import type { Db } from "./client";
import { EntityError, getEntity } from "./entities";
import { connections, entities, type Connection, type Entity } from "./schema";
import { createConnectionSchema, type CreateConnectionInput } from "@/lib/connections";
import { SPATIAL_TYPES } from "@/lib/entities";

/** A connection as seen from one of its ends. */
export type Exit = {
  connectionId: string;
  label: string;
  /** "forward" when this entity is the connection's `from` side. */
  direction: "forward" | "reverse";
  oneWay: boolean;
  notes: string;
  to: Entity;
};

export async function createConnection(db: Db, input: CreateConnectionInput): Promise<Connection> {
  const data = createConnectionSchema.parse(input);
  if (data.fromId === data.toId) {
    throw new EntityError("invalid_connection", "A connection needs two different ends");
  }
  await requireSpatial(db, data.fromId);
  await requireSpatial(db, data.toId);

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
    .select({ connection: connections, to: entities })
    .from(connections)
    .innerJoin(entities, eq(connections.toId, entities.id))
    .where(eq(connections.fromId, entityId));
  const incoming = await db
    .select({ connection: connections, to: entities })
    .from(connections)
    .innerJoin(entities, eq(connections.fromId, entities.id))
    .where(and(eq(connections.toId, entityId), eq(connections.oneWay, false)));

  const exits: Exit[] = [
    ...outgoing.map(({ connection, to }) => toExit(connection, to, "forward", connection.label)),
    ...incoming.map(({ connection, to }) =>
      toExit(connection, to, "reverse", connection.reverseLabel ?? connection.label),
    ),
  ];
  return exits.sort((a, b) => a.label.localeCompare(b.label) || a.to.name.localeCompare(b.to.name));
}

function toExit(connection: Connection, to: Entity, direction: Exit["direction"], label: string): Exit {
  return { connectionId: connection.id, label, direction, oneWay: connection.oneWay, notes: connection.notes, to };
}

async function requireSpatial(db: Db, id: string): Promise<void> {
  const entity = await getEntity(db, id);
  if (!entity) throw new EntityError("invalid_connection", `Entity ${id} not found`);
  if (!(SPATIAL_TYPES as readonly string[]).includes(entity.type)) {
    throw new EntityError("invalid_connection", `A ${entity.type} can't be connected; only places can`);
  }
}
