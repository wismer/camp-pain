import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { getDb } from "@/db/client";
import { listSessions } from "@/db/sessions";
import { formatDateTime, formatDuration } from "@/lib/format";

export default function SessionsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-8 py-12">
      <h1 className="mb-8 text-3xl font-semibold tracking-tight">Sessions</h1>
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <SessionList />
      </Suspense>
    </main>
  );
}

async function SessionList() {
  await connection();
  const sessions = await listSessions(getDb());
  if (sessions.length === 0) {
    return (
      <p className="text-muted-foreground">No sessions yet. Switch to Play in the sidebar to start one.</p>
    );
  }
  return (
    <ul aria-label="Sessions" className="flex flex-col divide-y">
      {sessions.map((s) => (
        <li key={s.id} className="flex items-baseline justify-between gap-4 py-3">
          <Link href={`/sessions/${s.number}`} className="font-medium hover:underline">
            Session {s.number}
            {s.title && `: ${s.title}`}
          </Link>
          <span className="text-sm text-muted-foreground">
            {formatDateTime(s.startedAt)} ·{" "}
            {s.endedAt ? (
              formatDuration(s.startedAt, s.endedAt)
            ) : (
              <span className="font-medium text-foreground">live</span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
