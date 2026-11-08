import { beforeEach, describe, expect, it } from "vitest";
import { testDb } from "@/test/db";
import type { Db } from "./client";
import { createEntity, deleteEntity } from "./entities";
import {
  countDescendants,
  createReveal,
  deleteReveal,
  getReveal,
  getRevealTree,
  moveReveal,
  updateReveal,
  type RevealNode,
} from "./reveals";

let db: Db;
let roomId: string;

beforeEach(async () => {
  db = testDb();
  const region = await createEntity(db, { type: "region", name: "Konigsberg" });
  roomId = (await createEntity(db, { type: "location", name: "Living Room", parentId: region.id })).id;
});

const investigate = (extra: object = {}) =>
  createReveal(db, { entityId: roomId, checkKind: "skill", check: "Investigation", dc: 14, ...extra });

/** Tree as nested labels, e.g. ["Investigation DC 14", { success: [...], failure: [...] }]. */
function shape(nodes: RevealNode[]): unknown[] {
  return nodes.map((n) => {
    const label = `${n.check}${n.dc === null ? "" : ` ${n.dc}`}`;
    const { success, failure } = n.children;
    return success.length || failure.length
      ? [label, { success: shape(success), failure: shape(failure) }]
      : label;
  });
}

describe("createReveal", () => {
  it("nests layers under both branches and builds the tree", async () => {
    const blood = await investigate();
    await createReveal(db, {
      entityId: roomId,
      parentId: blood.id,
      branch: "success",
      checkKind: "ability",
      check: "Strength",
      dc: 12,
    });
    await createReveal(db, {
      entityId: roomId,
      parentId: blood.id,
      branch: "failure",
      checkKind: "other",
      check: "Waits a while",
    });
    await createReveal(db, { entityId: roomId, checkKind: "skill", check: "Perception", dc: 10 });

    expect(shape(await getRevealTree(db, roomId))).toEqual([
      ["Investigation 14", { success: ["Strength 12"], failure: ["Waits a while"] }],
      "Perception 10",
    ]);
  });

  it("stores top-level layers on the success branch whatever is passed", async () => {
    expect((await investigate({ branch: "failure" })).branch).toBe("success");
  });

  it("rejects a parent from another entry, and a missing parent or entry", async () => {
    const otherRoom = await createEntity(db, { type: "region", name: "Elsewhere" });
    const foreign = await createReveal(db, { entityId: otherRoom.id, checkKind: "other", check: "Looks" });
    await expect(investigate({ parentId: foreign.id })).rejects.toMatchObject({ code: "invalid_reveal" });
    await expect(investigate({ parentId: "nope" })).rejects.toMatchObject({ code: "invalid_reveal" });
    await expect(investigate({ entityId: "nope" })).rejects.toMatchObject({ code: "not_found" });
  });

  it("validates gates", async () => {
    await expect(investigate({ check: "Lockpicking" })).rejects.toThrow(/Unknown skill/);
    await expect(investigate({ dc: null })).rejects.toThrow(/needs a DC/);
    await expect(investigate({ dc: 45 })).rejects.toThrow();
    await expect(investigate({ checkKind: "save", check: "Investigation" })).rejects.toThrow(/Unknown save/);
    await expect(
      createReveal(db, { entityId: roomId, checkKind: "other", check: "Opens the chest" }),
    ).resolves.toMatchObject({ dc: null });
  });

  it("accepts rich-text bodies and rejects malformed ones", async () => {
    const doc = { type: "doc" as const, content: [{ type: "paragraph" }] };
    await expect(investigate({ successBody: doc, failureBody: doc })).resolves.toMatchObject({
      successBody: doc,
    });
    await expect(investigate({ successBody: { nope: true } as never })).rejects.toThrow();
  });
});

describe("updateReveal", () => {
  it("validates the gate after merging the change", async () => {
    const r = await investigate();
    await expect(updateReveal(db, r.id, { checkKind: "ability" })).rejects.toThrow(/Unknown ability/);
    await expect(updateReveal(db, r.id, { checkKind: "other", dc: null })).resolves.toMatchObject({
      checkKind: "other",
      check: "Investigation",
      dc: null,
    });
    await expect(updateReveal(db, r.id, { checkKind: "skill" })).rejects.toThrow(/needs a DC/);
  });

  it("leaves omitted fields unchanged", async () => {
    const r = await investigate();
    const updated = await updateReveal(db, r.id, { dc: 16 });
    expect(updated).toMatchObject({ check: "Investigation", dc: 16, parentId: null });
  });
});

describe("deleteReveal", () => {
  it("deletes the layer and everything under it", async () => {
    const top = await investigate();
    const mid = await investigate({ parentId: top.id });
    await investigate({ parentId: mid.id, branch: "failure" });
    const keep = await investigate({ check: "Perception" });

    const [node] = await getRevealTree(db, roomId);
    expect(countDescendants(node)).toBe(2);

    await deleteReveal(db, top.id);
    expect((await getRevealTree(db, roomId)).map((n) => n.id)).toEqual([keep.id]);
    await expect(deleteReveal(db, top.id)).rejects.toMatchObject({ code: "not_found" });
  });

  it("goes away with its entry", async () => {
    const r = await investigate();
    await deleteEntity(db, roomId);
    expect(await getReveal(db, r.id)).toBeUndefined();
  });
});

describe("moveReveal", () => {
  it("reorders siblings without touching other branches", async () => {
    const a = await investigate({ check: "Arcana" });
    const b = await investigate({ check: "History" });
    const c = await investigate({ check: "Nature" });
    await investigate({ parentId: a.id, check: "Religion" });

    await moveReveal(db, c.id, "up");
    expect((await getRevealTree(db, roomId)).map((n) => n.check)).toEqual(["Arcana", "Nature", "History"]);
    await moveReveal(db, a.id, "down");
    expect((await getRevealTree(db, roomId)).map((n) => n.check)).toEqual(["Nature", "Arcana", "History"]);

    // Past either end: no change.
    await moveReveal(db, c.id, "up");
    await moveReveal(db, b.id, "down");
    expect((await getRevealTree(db, roomId)).map((n) => n.check)).toEqual(["Nature", "Arcana", "History"]);
    expect((await getRevealTree(db, roomId))[1].children.success.map((n) => n.check)).toEqual(["Religion"]);
  });
});
