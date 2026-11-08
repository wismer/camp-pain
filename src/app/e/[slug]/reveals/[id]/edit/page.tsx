import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { removeReveal } from "@/app/actions/reveals";
import { RevealForm } from "@/components/entity/reveal-form";
import { ConfirmDelete } from "@/components/form/confirm-delete";
import { getDb } from "@/db/client";
import { getEntityBySlug, listEntities } from "@/db/entities";
import { countDescendants, getRevealTree, type RevealNode } from "@/db/reveals";
import { entityHref } from "@/lib/entities";
import { refreshMentionLabels } from "@/lib/rich-text/mentions";
import { formatGate } from "@/lib/reveals";

type Props = PageProps<"/e/[slug]/reveals/[id]/edit">;

export default function EditRevealPage({ params }: Props) {
  return (
    <main className="mx-auto w-full max-w-2xl px-8 py-12">
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <EditReveal params={params} />
      </Suspense>
    </main>
  );
}

function findNode(nodes: RevealNode[], id: string): RevealNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNode([...node.children.success, ...node.children.failure], id);
    if (found) return found;
  }
}

async function EditReveal({ params }: Pick<Props, "params">) {
  const { slug, id } = await params;
  await connection();
  const db = getDb();
  const entity = await getEntityBySlug(db, slug);
  if (!entity) notFound();
  const node = findNode(await getRevealTree(db, entity.id), id);
  if (!node) notFound();

  const all = await listEntities(db);
  const names = new Map(all.map((e) => [e.id, e.name]));
  const nested = countDescendants(node);
  const gate = formatGate(node);

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight">Edit {gate}</h1>
          <Link href={entityHref(entity)} className="text-sm text-muted-foreground hover:underline">
            Cancel
          </Link>
        </div>
        <p className="text-muted-foreground">Hidden detail of {entity.name}</p>
      </header>
      <RevealForm
        mentionTargets={all}
        initial={{
          ...node,
          successBody: node.successBody && refreshMentionLabels(node.successBody, names),
          failureBody: node.failureBody && refreshMentionLabels(node.failureBody, names),
        }}
      />
      <section className="flex flex-col gap-3 border-t pt-6">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Danger zone</h2>
        <ConfirmDelete
          action={removeReveal}
          fields={{ id: node.id }}
          prompt={
            nested === 0
              ? `Delete ${gate}?`
              : `Delete ${gate} and the ${nested} deeper ${nested === 1 ? "layer" : "layers"} under it?`
          }
        />
      </section>
    </div>
  );
}
