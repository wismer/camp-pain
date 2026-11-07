import { connection } from "next/server";
import { Suspense } from "react";
import { EntityForm } from "@/components/entity/entity-form";
import { getDb } from "@/db/client";
import { getEntity, listEntities } from "@/db/entities";
import { ENTITY_TYPES, canContain, type EntityType } from "@/lib/entities";

export default function NewEntityPage({ searchParams }: PageProps<"/new">) {
  return (
    <main className="mx-auto w-full max-w-2xl px-8 py-12">
      <h1 className="mb-8 text-3xl font-semibold tracking-tight">New entry</h1>
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <NewEntity searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function NewEntity({ searchParams }: { searchParams: PageProps<"/new">["searchParams"] }) {
  const { type, parent } = await searchParams;
  await connection();
  const db = getDb();
  const parentEntity = typeof parent === "string" ? await getEntity(db, parent) : undefined;

  // Default to the type requested, else the first type that fits inside the given parent.
  const requested = ENTITY_TYPES.find((t) => t === type);
  const initialType: EntityType =
    requested ??
    (parentEntity ? ENTITY_TYPES.find((t) => canContain(parentEntity.type, t)) : undefined) ??
    "region";

  return (
    <EntityForm
      parents={await listEntities(db)}
      initial={{
        type: initialType,
        name: "",
        summary: "",
        body: "",
        parentId: parentEntity?.id ?? null,
        attributes: {},
      }}
    />
  );
}
