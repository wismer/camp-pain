import { beforeEach, describe, expect, it } from "vitest";
import { testDb } from "@/test/db";
import type { Db } from "./client";
import { createConnection, deleteConnection, listExits } from "./connections";
import { createEntity, deleteEntity } from "./entities";
import { createReveal, deleteReveal } from "./reveals";

let db: Db;
beforeEach(() => {
  db = testDb();
});

async function house() {
  const region = await createEntity(db, { type: "region", name: "Konigsberg" });
  const home = await createEntity(db, { type: "place", name: "Habbins House", parentId: region.id });
  const room = (name: string) => createEntity(db, { type: "location", name, parentId: home.id });
  return {
    region,
    home,
    living: await room("Living Room"),
    kitchen: await room("Kitchen"),
    cellar: await room("Cellar"),
  };
}

const summarize = (exits: Awaited<ReturnType<typeof listExits>>) =>
  exits.map((e) => `${e.label} -> ${e.to.name} (${e.direction})`);

describe("listExits", () => {
  it("shows a two-way connection from both sides, using the reverse label", async () => {
    const { living, kitchen } = await house();
    await createConnection(db, {
      fromId: living.id,
      toId: kitchen.id,
      label: "East doorway",
      reverseLabel: "West doorway",
    });
    expect(summarize(await listExits(db, living.id))).toEqual(["East doorway -> Kitchen (forward)"]);
    expect(summarize(await listExits(db, kitchen.id))).toEqual(["West doorway -> Living Room (reverse)"]);
  });

  it("falls back to the label when there is no reverse label", async () => {
    const { living, kitchen } = await house();
    await createConnection(db, { fromId: living.id, toId: kitchen.id, label: "Archway" });
    expect(summarize(await listExits(db, kitchen.id))).toEqual(["Archway -> Living Room (reverse)"]);
  });

  it("shows a one-way connection only from its starting side", async () => {
    const { living, cellar } = await house();
    const chute = await createConnection(db, {
      fromId: living.id,
      toId: cellar.id,
      label: "Rotten floorboards",
      reverseLabel: "ignored",
      oneWay: true,
    });
    expect(chute.reverseLabel).toBeNull();
    expect(summarize(await listExits(db, living.id))).toEqual(["Rotten floorboards -> Cellar (forward)"]);
    expect(await listExits(db, cellar.id)).toEqual([]);
  });

  it("sorts exits by label", async () => {
    const { living, kitchen, cellar } = await house();
    await createConnection(db, { fromId: living.id, toId: kitchen.id, label: "West door" });
    await createConnection(db, {
      fromId: cellar.id,
      toId: living.id,
      label: "Ladder",
      reverseLabel: "Hatch",
    });
    expect((await listExits(db, living.id)).map((e) => e.label)).toEqual(["Hatch", "West door"]);
  });

  it("connects across levels and regions", async () => {
    const { region, living } = await house();
    const other = await createEntity(db, { type: "region", name: "Marsh Hollow" });
    await createConnection(db, { fromId: region.id, toId: other.id, label: "River road" });
    await createConnection(db, { fromId: living.id, toId: region.id, label: "Front door" });
    expect((await listExits(db, region.id)).map((e) => e.to.name)).toEqual(["Living Room", "Marsh Hollow"]);
  });
});

describe("createConnection validation", () => {
  it("rejects non-spatial endpoints", async () => {
    const { living } = await house();
    const castor = await createEntity(db, { type: "character", name: "Investigator Castor" });
    await expect(
      createConnection(db, { fromId: living.id, toId: castor.id, label: "Talk" }),
    ).rejects.toMatchObject({ code: "invalid_connection" });
  });

  it("rejects missing endpoints and self-connections", async () => {
    const { living } = await house();
    await expect(
      createConnection(db, { fromId: living.id, toId: "nope", label: "Door" }),
    ).rejects.toMatchObject({
      code: "invalid_connection",
    });
    await expect(
      createConnection(db, { fromId: living.id, toId: living.id, label: "Door" }),
    ).rejects.toMatchObject({ code: "invalid_connection" });
  });

  it("rejects a blank label", async () => {
    const { living, kitchen } = await house();
    await expect(createConnection(db, { fromId: living.id, toId: kitchen.id, label: " " })).rejects.toThrow();
  });
});

describe("deletion", () => {
  it("deletes a connection", async () => {
    const { living, kitchen } = await house();
    const door = await createConnection(db, { fromId: living.id, toId: kitchen.id, label: "Door" });
    await deleteConnection(db, door.id);
    expect(await listExits(db, living.id)).toEqual([]);
    await expect(deleteConnection(db, door.id)).rejects.toMatchObject({ code: "not_found" });
  });

  it("removes connections when an endpoint entity is deleted", async () => {
    const { living, kitchen } = await house();
    await createConnection(db, { fromId: living.id, toId: kitchen.id, label: "Door" });
    await deleteEntity(db, kitchen.id);
    expect(await listExits(db, living.id)).toEqual([]);
  });
});

describe("hidden exits", () => {
  it("shows the hiding check from both ends", async () => {
    const { living, cellar } = await house();
    const strength = await createReveal(db, {
      entityId: living.id,
      checkKind: "ability",
      check: "Strength",
      dc: 12,
    });
    await createConnection(db, {
      fromId: living.id,
      toId: cellar.id,
      label: "Hatch",
      reverseLabel: "Ladder up",
      revealId: strength.id,
    });
    const gate = { checkKind: "ability", check: "Strength", dc: 12 };
    expect((await listExits(db, living.id))[0]).toMatchObject({ label: "Hatch", hiddenBehind: gate });
    expect((await listExits(db, cellar.id))[0]).toMatchObject({ label: "Ladder up", hiddenBehind: gate });
  });

  it("accepts a layer of the destination too, but not of an unrelated entry", async () => {
    const { living, kitchen, cellar } = await house();
    const cellarLayer = await createReveal(db, {
      entityId: cellar.id,
      checkKind: "other",
      check: "Hears it",
    });
    await expect(
      createConnection(db, { fromId: living.id, toId: cellar.id, label: "Hatch", revealId: cellarLayer.id }),
    ).resolves.toMatchObject({ revealId: cellarLayer.id });
    await expect(
      createConnection(db, { fromId: living.id, toId: kitchen.id, label: "Door", revealId: cellarLayer.id }),
    ).rejects.toMatchObject({ code: "invalid_connection" });
    await expect(
      createConnection(db, { fromId: living.id, toId: kitchen.id, label: "Door", revealId: "nope" }),
    ).rejects.toMatchObject({ code: "invalid_connection" });
  });

  it("un-hides the exit when its layer is deleted", async () => {
    const { living, cellar } = await house();
    const layer = await createReveal(db, { entityId: living.id, checkKind: "other", check: "Moves the rug" });
    await createConnection(db, { fromId: living.id, toId: cellar.id, label: "Hatch", revealId: layer.id });
    await deleteReveal(db, layer.id);
    expect((await listExits(db, living.id))[0]).toMatchObject({ label: "Hatch", hiddenBehind: null });
  });
});
