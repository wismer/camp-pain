import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { removeExit } from "@/app/actions/entities";
import { AddExitForm } from "@/components/entity/add-exit-form";
import { AttributeList } from "@/components/entity/attribute-list";
import { RichText } from "@/components/rich-text/rich-text";
import { getDb } from "@/db/client";
import { listExits } from "@/db/connections";
import { listBacklinks } from "@/db/links";
import { getAncestors, getEntityBySlug, listChildren, listEntities } from "@/db/entities";
import { ENTITY_TYPES, ENTITY_TYPE_LABELS, SPATIAL_TYPES, canContain, entityHref } from "@/lib/entities";

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

  const [ancestors, children, exits, all, backlinks] = await Promise.all([
    getAncestors(db, entity.id),
    listChildren(db, entity.id),
    listExits(db, entity.id),
    listEntities(db),
    listBacklinks(db, entity.id),
  ]);
  const spatial = (SPATIAL_TYPES as readonly string[]).includes(entity.type);
  const canHoldChildren = ENTITY_TYPES.some((t) => canContain(entity.type, t));
  const exitTargets = all.filter(
    (e) => e.id !== entity.id && (SPATIAL_TYPES as readonly string[]).includes(e.type),
  );

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
          <RichText
            doc={entity.body}
            sourceId={entity.id}
            entities={new Map(
              all.map(({ id, type, name, slug, summary, attributes }) => [
                id,
                { id, type, name, slug, summary, attributes },
              ]),
            )}
          />
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

      {spatial && (
        <Section title="Exits">
          <ul className="flex flex-col gap-1">
            {exits.map((exit) => (
              <li key={`${exit.connectionId}-${exit.direction}`}>
                <span className="text-muted-foreground">{exit.label} → </span>
                <Link href={entityHref(exit.to)} className="font-medium hover:underline">
                  {exit.to.name}
                </Link>
                {exit.oneWay && <span className="text-xs text-muted-foreground"> (one-way)</span>}
                <form action={removeExit} className="inline">
                  <input type="hidden" name="connectionId" value={exit.connectionId} />
                  <button
                    type="submit"
                    aria-label={`Remove exit ${exit.label}`}
                    className="ml-2 text-xs text-muted-foreground hover:text-destructive"
                  >
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
          <AddExitForm fromId={entity.id} targets={exitTargets} />
        </Section>
      )}
      {backlinks.length > 0 && (
        <Section title="Mentioned in">
          <ul className="flex flex-col gap-1">
            {backlinks.map((b) => (
              <li key={b.id}>
                <Link href={entityHref(b)} className="font-medium hover:underline">
                  {b.name}
                </Link>
                <span className="text-muted-foreground"> · {ENTITY_TYPE_LABELS[b.type].singular}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const id = `section-${title.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}
