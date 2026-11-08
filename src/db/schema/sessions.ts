import { createId } from "@paralleldrive/cuid2";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/** A night at the table. At most one is live (no endedAt) at a time. */
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  number: integer("number").notNull().unique(),
  title: text("title"),
  startedAt: integer("started_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  endedAt: integer("ended_at", { mode: "timestamp_ms" }),
});

export const SESSION_EVENT_KINDS = ["started", "ended", "resolved", "undone", "reset", "moved", "note"] as const;
export type SessionEventKind = (typeof SESSION_EVENT_KINDS)[number];

/** Append-only log of what happened during a session. */
export const sessionEvents = sqliteTable(
  "session_events",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    /** Order within the session; timestamps can tie. */
    seq: integer("seq").notNull(),
    at: integer("at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    kind: text("kind", { enum: SESSION_EVENT_KINDS }).notNull(),
    payload: text("payload", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull()
      .$defaultFn(() => ({})),
  },
  (t) => [uniqueIndex("session_events_session_seq_unique").on(t.sessionId, t.seq)],
);

export type Session = typeof sessions.$inferSelect;
export type SessionEvent = typeof sessionEvents.$inferSelect;
