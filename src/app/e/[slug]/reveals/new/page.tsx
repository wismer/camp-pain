import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { RevealForm } from "@/components/entity/reveal-form";
import { getDb } from "@/db/client";
import { getEntityBySlug, listEntities } from "@/db/entities";
import { getReveal } from "@/db/reveals";
import { entityHref } from "@/lib/entities";
import { formatGate } from "@/lib/reveals";

type Props = PageProps<"/e/[slug]/reveals/new">;

export default function NewRevealPage({ params, searchParams }: Props) {
  return (
    <main className="mx-auto w-full max-w-2xl px-8 py-12">
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <NewReveal params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function NewReveal({ params, searchParams }: Pick<Props, "params" | "searchParams">) {
  const [{ slug }, { parent, branch }] = await Promise.all([params, searchParams]);
  await connection();
  const db = getDb();
  const entity = await getEntityBySlug(db, slug);
  if (!entity) notFound();
  const parentReveal = typeof parent === "string" ? await getReveal(db, parent) : undefined;
  if (parentReveal && parentReveal.entityId !== entity.id) notFound();
  const onFailure = branch === "failure";

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight">New hidden detail</h1>
          <Link href={entityHref(entity)} className="text-sm text-muted-foreground hover:underline">
            Cancel
          </Link>
        </div>
        <p className="text-muted-foreground">
          {entity.name}
          {parentReveal && ` · deeper, on ${onFailure ? "failure" : "success"} of ${formatGate(parentReveal)}`}
        </p>
      </header>
      <RevealForm
        mentionTargets={await listEntities(db)}
        initial={{
          entityId: entity.id,
          parentId: parentReveal?.id ?? null,
          branch: onFailure ? "failure" : "success",
          checkKind: "skill",
          check: "Investigation",
          dc: null,
          successBody: null,
          failureBody: null,
        }}
      />
    </div>
  );
}
