import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AttributeList } from "@/components/entity/attribute-list";
import { DocView } from "@/components/entity/doc-view";
import { getDb } from "@/db/client";
import { listExits } from "@/db/connections";
import { getAncestors, getEntityBySlug, listChildren } from "@/db/entities";
import { ENTITY_TYPES, ENTITY_TYPE_LABELS, canContain, entityHref } from "@/lib/entities";

export default function EntityPage({ params }: PageProps<"/e/[slug]">) {
  return (
    <main className="mx-auto w-full max-w-3xl px-8 py-12">
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <EntityView params={params} />
      </Suspense>
    </main>
  );
}

async function EntityView({ params }: { params: PageProps<"/e/[slug]">["params"] }) {
  const { slug } = await params;
  await connection();
  const db = getDb();
  const entity = await getEntityBySlug(db, slug);
  if (!entity) notFound();

  const [ancestors, children, exits] = await Promise.all([
    getAncestors(db, entity.id),
    listChildren(db, entity.id),
    listExits(db, entity.id),
  ]);
  const canHoldChildren = ENTITY_TYPES.some((t) => canContain(entity.type, t));

  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        {ancestors.length > 0 && (
          <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
            <ol className="flex flex-wrap items-center gap-1">
              {ancestors.map((a) => (
                <li key={a.id} className="flex items-center gap-1">
                  <Link href={entityHref(a)} className="hover:text-foreground hover:underline">
                    {a.name}
                  </Link>
                  <span aria-hidden>›</span>
                </li>
              ))}
            </ol>
          </nav>
        )}
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {ENTITY_TYPE_LABELS[entity.type].singular}
        </p>
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight">{entity.name}</h1>
          <Link href={`${entityHref(entity)}/edit`} className="text-sm text-muted-foreground hover:underline">
            Edit
          </Link>
        </div>
        {entity.summary && <p className="text-lg text-muted-foreground">{entity.summary}</p>}
      </header>

      <AttributeList type={entity.type} attributes={entity.attributes} />

      {entity.body && (
        <Section title="Description">
          <DocView doc={entity.body} />
        </Section>
      )}

      {(children.length > 0 || canHoldChildren) && (
        <Section title="Inside">
          <ul className="flex flex-col gap-1">
            {children.map((c) => (
              <li key={c.id}>
                <Link href={entityHref(c)} className="font-medium hover:underline">
                  {c.name}
                </Link>
                {c.summary && <span className="text-muted-foreground"> — {c.summary}</span>}
              </li>
            ))}
          </ul>
          {canHoldChildren && (
            <Link href={`/new?parent=${entity.id}`} className="text-sm text-muted-foreground hover:underline">
              + Add inside {entity.name}
            </Link>
          )}
        </Section>
      )}

      {exits.length > 0 && (
        <Section title="Exits">
          <ul className="flex flex-col gap-1">
            {exits.map((exit) => (
              <li key={`${exit.connectionId}-${exit.direction}`}>
                <span className="text-muted-foreground">{exit.label} → </span>
                <Link href={entityHref(exit.to)} className="font-medium hover:underline">
                  {exit.to.name}
                </Link>
                {exit.oneWay && <span className="text-xs text-muted-foreground"> (one-way)</span>}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}
