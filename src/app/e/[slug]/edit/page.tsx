import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { DeleteEntity } from "@/components/entity/delete-entity";
import { EntityForm } from "@/components/entity/entity-form";
import { getDb } from "@/db/client";
import { getEntityBySlug, listEntities } from "@/db/entities";
import { entityHref } from "@/lib/entities";
import { refreshMentionLabels } from "@/lib/rich-text/mentions";

export default function EditEntityPage({ params }: PageProps<"/e/[slug]/edit">) {
  return (
    <main className="mx-auto w-full max-w-2xl px-8 py-12">
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <EditEntity params={params} />
      </Suspense>
    </main>
  );
}

async function EditEntity({ params }: { params: PageProps<"/e/[slug]/edit">["params"] }) {
  const { slug } = await params;
  await connection();
  const db = getDb();
  const entity = await getEntityBySlug(db, slug);
  if (!entity) notFound();
  const all = await listEntities(db);
  const body = entity.body && refreshMentionLabels(entity.body, new Map(all.map((e) => [e.id, e.name])));

  return (
    <div className="flex flex-col gap-10">
      <header className="flex items-baseline justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Edit {entity.name}</h1>
        <Link href={entityHref(entity)} className="text-sm text-muted-foreground hover:underline">
          Cancel
        </Link>
      </header>
      <EntityForm parents={all} initial={{ ...entity, body }} />
      <section className="flex flex-col gap-3 border-t pt-6">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Danger zone</h2>
        <DeleteEntity id={entity.id} name={entity.name} />
      </section>
    </div>
  );
}
