import Link from "next/link";
import { connection } from "next/server";
import { getDb } from "@/db/client";
import { listEntities } from "@/db/entities";
import { ENTITY_TYPES, ENTITY_TYPE_LABELS, entityHref } from "@/lib/entities";
import { SidebarLink } from "./sidebar-link";

export async function Sidebar() {
  await connection();
  const all = await listEntities(getDb());

  return (
    <nav aria-label="Entities" className="flex flex-col gap-5">
      {all.length === 0 && <p className="text-sm text-muted-foreground">No entries yet.</p>}
      {ENTITY_TYPES.map((type) => {
        const ofType = all.filter((e) => e.type === type);
        if (ofType.length === 0) return null;
        return (
          <section key={type} aria-labelledby={`sidebar-${type}`}>
            <h2
              id={`sidebar-${type}`}
              className="mb-1 px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >
              {ENTITY_TYPE_LABELS[type].plural}
            </h2>
            <ul>
              {ofType.map((e) => (
                <li key={e.id}>
                  <SidebarLink href={entityHref(e)}>{e.name}</SidebarLink>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </nav>
  );
}

export function SidebarSkeleton() {
  return <p className="px-2 text-sm text-muted-foreground">Loading…</p>;
}

export function SidebarHeader() {
  return (
    <Link href="/" className="mb-6 block px-2 text-lg font-semibold tracking-tight">
      Campaign Codex
    </Link>
  );
}
