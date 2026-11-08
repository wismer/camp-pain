import { beforeEach, describe, expect, it } from "vitest";
import { testDb } from "@/test/db";
import type { Db } from "./client";
import {
  endSession,
  getLiveSession,
  getSessionByNumber,
  listEvents,
  listSessions,
  logEvent,
  nextSessionNumber,
  startSession,
} from "./sessions";

let db: Db;
beforeEach(() => {
  db = testDb();
});

describe("sessions", () => {
  it("numbers sessions in order and keeps at most one live", async () => {
    expect(await nextSessionNumber(db)).toBe(1);
    const first = await startSession(db, "  The Habbin house  ");
    expect(first).toMatchObject({ number: 1, title: "The Habbin house", endedAt: null });
    expect(await getLiveSession(db)).toEqual(first);
    await expect(startSession(db)).rejects.toMatchObject({ code: "session_conflict" });

    const ended = await endSession(db);
    expect(ended.endedAt).toBeInstanceOf(Date);
    expect(await getLiveSession(db)).toBeUndefined();
    await expect(endSession(db)).rejects.toMatchObject({ code: "session_conflict" });

    const second = await startSession(db, "  ");
    expect(second).toMatchObject({ number: 2, title: null });
    expect((await listSessions(db)).map((s) => s.number)).toEqual([2, 1]);
    expect(await getSessionByNumber(db, 1)).toMatchObject({ id: first.id });
  });

  it("logs start, end and other events in order, even within the same millisecond", async () => {
    const session = await startSession(db);
    await logEvent(db, session.id, "note", { text: "Castor is lying" });
    await logEvent(db, session.id, "note", { text: "Second note" });
    await endSession(db);
    const events = await listEvents(db, session.id);
    expect(events.map((e) => e.kind)).toEqual(["started", "note", "note", "ended"]);
    expect(events.map((e) => e.seq)).toEqual([1, 2, 3, 4]);
    expect(events[1].payload).toEqual({ text: "Castor is lying" });
  });

  it("keeps each session's events separate", async () => {
    const one = await startSession(db);
    await endSession(db);
    const two = await startSession(db);
    expect((await listEvents(db, one.id)).map((e) => e.kind)).toEqual(["started", "ended"]);
    expect((await listEvents(db, two.id)).map((e) => e.seq)).toEqual([1]);
  });
});
