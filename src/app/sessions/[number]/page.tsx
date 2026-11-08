import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getDb } from "@/db/client";
import { getSessionByNumber, listEvents } from "@/db/sessions";
import { formatDateTime, formatTime } from "@/lib/format";

type Props = PageProps<"/sessions/[number]">;

export default function SessionPage({ params }: Props) {
  return (
    <main className="mx-auto w-full max-w-3xl px-8 py-12">
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <SessionView params={params} />
      </Suspense>
    </main>
  );
}

const EVENT_LABELS: Record<string, string> = { started: "Session started", ended: "Session ended" };

async function SessionView({ params }: Pick<Props, "params">) {
  const { number } = await params;
  await connection();
  const db = getDb();
  const session = Number.isInteger(Number(number)) ? await getSessionByNumber(db, Number(number)) : undefined;
  if (!session) notFound();
  const events = await listEvents(db, session.id);

  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">
          Session {session.number}
          {session.title && `: ${session.title}`}
        </h1>
        <p className="text-muted-foreground">
          {formatDateTime(session.startedAt)}
          {session.endedAt ? ` – ${formatTime(session.endedAt)}` : " · live"}
        </p>
      </header>
      {/* Slice 3.6 turns this into the full session log. */}
      <ol aria-label="Session log" className="flex flex-col gap-2">
        {events.map((e) => (
          <li key={e.id} className="flex gap-4 text-sm">
            <time className="w-16 shrink-0 text-muted-foreground">{formatTime(e.at)}</time>
            <span>{EVENT_LABELS[e.kind] ?? e.kind}</span>
          </li>
        ))}
      </ol>
    </article>
  );
}
