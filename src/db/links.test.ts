import { beforeEach, describe, expect, it } from "vitest";
import { testDb } from "@/test/db";
import type { Doc } from "@/lib/entities";
import type { Db } from "./client";
import { createEntity, deleteEntity, updateEntity } from "./entities";
import { listBacklinks, rebuildAllLinks } from "./links";
import { createReveal, deleteReveal, updateReveal } from "./reveals";
import { entityLinks } from "./schema";

let db: Db;
beforeEach(() => {
  db = testDb();
});

const mentioning = (...ids: string[]): Doc => ({
  type: "doc",
  content: [{ type: "paragraph", content: ids.map((id) => ({ type: "mention", attrs: { id, label: id } })) }],
});

const names = async (id: string) => (await listBacklinks(db, id)).map((b) => b.entity.name);

describe("links", () => {
  it("records mentions on create and lists backlinks by name", async () => {
    const castor = await createEntity(db, { type: "character", name: "Castor" });
    await createEntity(db, { type: "region", name: "Konigsberg", body: mentioning(castor.id) });
    await createEntity(db, { type: "region", name: "Ashfall", body: mentioning(castor.id, castor.id) });
    expect(await names(castor.id)).toEqual(["Ashfall", "Konigsberg"]);
  });

  it("replaces links when the body changes, and keeps them when it doesn't", async () => {
    const a = await createEntity(db, { type: "character", name: "A" });
    const b = await createEntity(db, { type: "character", name: "B" });
    const region = await createEntity(db, { type: "region", name: "R", body: mentioning(a.id) });

    await updateEntity(db, region.id, { summary: "no body change" });
    expect(await names(a.id)).toEqual(["R"]);

    await updateEntity(db, region.id, { body: mentioning(b.id) });
    expect(await names(a.id)).toEqual([]);
    expect(await names(b.id)).toEqual(["R"]);

    await updateEntity(db, region.id, { body: null });
    expect(await names(b.id)).toEqual([]);
  });

  it("ignores self-mentions and unknown ids", async () => {
    const region = await createEntity(db, { type: "region", name: "R", body: mentioning("nope") });
    await updateEntity(db, region.id, { body: mentioning(region.id, "nope") });
    expect(await db.select().from(entityLinks)).toEqual([]);
  });

  it("drops links when either end is deleted", async () => {
    const castor = await createEntity(db, { type: "character", name: "Castor" });
    const region = await createEntity(db, { type: "region", name: "R", body: mentioning(castor.id) });
    await deleteEntity(db, castor.id);
    expect(await db.select().from(entityLinks)).toEqual([]);

    const other = await createEntity(db, { type: "character", name: "Other" });
    await updateEntity(db, region.id, { body: mentioning(other.id) });
    await deleteEntity(db, region.id);
    expect(await names(other.id)).toEqual([]);
  });

  it("rebuilds all links from descriptions", async () => {
    const castor = await createEntity(db, { type: "character", name: "Castor" });
    await createEntity(db, { type: "region", name: "R", body: mentioning(castor.id) });
    await db.delete(entityLinks);
    await rebuildAllLinks(db);
    expect(await names(castor.id)).toEqual(["R"]);
  });
});

describe("links from reveal layers", () => {
  const gates = async (id: string) =>
    (await listBacklinks(db, id)).map(
      (b) => `${b.entity.name}${b.hiddenBehind ? ` / ${b.hiddenBehind.check}` : ""}`,
    );

  it("records mentions in a layer with the check that hides them", async () => {
    const castor = await createEntity(db, { type: "character", name: "Castor" });
    const room = await createEntity(db, { type: "region", name: "Room", body: mentioning(castor.id) });
    await createReveal(db, {
      entityId: room.id,
      checkKind: "skill",
      check: "Insight",
      dc: 12,
      successBody: mentioning(castor.id),
      failureBody: mentioning(castor.id),
    });
    expect(await gates(castor.id)).toEqual(["Room", "Room / Insight"]);
    expect((await listBacklinks(db, castor.id))[1].hiddenBehind).toEqual({
      checkKind: "skill",
      check: "Insight",
      dc: 12,
    });
  });

  it("keeps layer links when the description is saved, and vice versa", async () => {
    const a = await createEntity(db, { type: "character", name: "A" });
    const room = await createEntity(db, { type: "region", name: "Room" });
    const layer = await createReveal(db, {
      entityId: room.id,
      checkKind: "other",
      check: "Looks closely",
      successBody: mentioning(a.id),
    });
    await updateEntity(db, room.id, { body: mentioning(a.id) });
    expect(await gates(a.id)).toEqual(["Room", "Room / Looks closely"]);

    await updateReveal(db, layer.id, { successBody: null });
    expect(await gates(a.id)).toEqual(["Room"]);
  });

  it("drops a layer's links when the layer is deleted, and rebuilds them from scratch", async () => {
    const a = await createEntity(db, { type: "character", name: "A" });
    const room = await createEntity(db, { type: "region", name: "Room" });
    const layer = await createReveal(db, {
      entityId: room.id,
      checkKind: "other",
      check: "X",
      successBody: mentioning(a.id),
    });

    await db.delete(entityLinks);
    await rebuildAllLinks(db);
    expect(await gates(a.id)).toEqual(["Room / X"]);

    await deleteReveal(db, layer.id);
    expect(await gates(a.id)).toEqual([]);
  });
});
