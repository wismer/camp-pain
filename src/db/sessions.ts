import { asc, desc, eq, isNull, max } from "drizzle-orm";
import type { Db } from "./client";
import { EntityError } from "./entities";
import { sessionEvents, sessions, type Session, type SessionEvent, type SessionEventKind } from "./schema";

export async function getLiveSession(db: Db): Promise<Session | undefined> {
  const [row] = await db.select().from(sessions).where(isNull(sessions.endedAt));
  return row;
}

export async function getSessionByNumber(db: Db, number: number): Promise<Session | undefined> {
  const [row] = await db.select().from(sessions).where(eq(sessions.number, number));
  return row;
}

export async function listSessions(db: Db): Promise<Session[]> {
  return db.select().from(sessions).orderBy(desc(sessions.number));
}

/** The number the next session will get. */
export async function nextSessionNumber(db: Db): Promise<number> {
  const [{ highest }] = await db.select({ highest: max(sessions.number) }).from(sessions);
  return (highest ?? 0) + 1;
}

export async function startSession(db: Db, title: string | null = null): Promise<Session> {
  const live = await getLiveSession(db);
  if (live) throw new EntityError("session_conflict", `Session ${live.number} is still live`);
  const [session] = await db
    .insert(sessions)
    .values({ number: await nextSessionNumber(db), title: title?.trim() || null })
    .returning();
  await logEvent(db, session.id, "started");
  return session;
}

export async function endSession(db: Db): Promise<Session> {
  const live = await getLiveSession(db);
  if (!live) throw new EntityError("session_conflict", "No session is live");
  await logEvent(db, live.id, "ended");
  const [ended] = await db
    .update(sessions)
    .set({ endedAt: new Date() })
    .where(eq(sessions.id, live.id))
    .returning();
  return ended;
}

export async function logEvent(
  db: Db,
  sessionId: string,
  kind: SessionEventKind,
  payload: Record<string, unknown> = {},
): Promise<SessionEvent> {
  const [{ last }] = await db
    .select({ last: max(sessionEvents.seq) })
    .from(sessionEvents)
    .where(eq(sessionEvents.sessionId, sessionId));
  const [event] = await db
    .insert(sessionEvents)
    .values({ sessionId, kind, payload, seq: (last ?? 0) + 1 })
    .returning();
  return event;
}

export async function listEvents(db: Db, sessionId: string): Promise<SessionEvent[]> {
  return db
    .select()
    .from(sessionEvents)
    .where(eq(sessionEvents.sessionId, sessionId))
    .orderBy(asc(sessionEvents.seq));
}
