import { beforeEach, describe, expect, it } from "vitest";
import { testDb } from "@/test/db";
import type { Db } from "./client";
import {
  createEntity,
  deleteEntity,
  getAncestors,
  getEntity,
  getEntityBySlug,
  listChildren,
  listEntities,
  updateEntity,
} from "./entities";

let db: Db;
beforeEach(() => {
  db = testDb();
});

async function konigsberg() {
  const region = await createEntity(db, { type: "region", name: "Konigsberg" });
  const estate = await createEntity(db, { type: "place", name: "Habbin Estate", parentId: region.id });
  const house = await createEntity(db, { type: "place", name: "Habbins House", parentId: estate.id });
  const room = await createEntity(db, { type: "location", name: "Living Room", parentId: house.id });
  return { region, estate, house, room };
}

describe("create and read", () => {
  it("creates an entity with defaults and a slug", async () => {
    const region = await createEntity(db, { type: "region", name: "  Königsberg  " });
    expect(region).toMatchObject({
      type: "region",
      name: "Königsberg",
      slug: "konigsberg",
      summary: "",
      body: null,
      attributes: {},
      parentId: null,
    });
    expect(region.createdAt).toBeInstanceOf(Date);
    expect(await getEntity(db, region.id)).toEqual(region);
    expect(await getEntityBySlug(db, "konigsberg")).toEqual(region);
  });

  it("lists entities by name, optionally filtered by type", async () => {
    const { region } = await konigsberg();
    await createEntity(db, { type: "character", name: "Investigator Castor" });
    expect((await listEntities(db)).map((e) => e.name)).toEqual([
      "Habbin Estate",
      "Habbins House",
      "Investigator Castor",
      "Konigsberg",
      "Living Room",
    ]);
    expect(await listEntities(db, { type: "region" })).toEqual([region]);
  });

  it("returns children and the ancestor chain", async () => {
    const { region, estate, house, room } = await konigsberg();
    expect(await listChildren(db, estate.id)).toEqual([house]);
    expect((await getAncestors(db, room.id)).map((e) => e.id)).toEqual([region.id, estate.id, house.id]);
    expect(await getAncestors(db, region.id)).toEqual([]);
  });
});

describe("validation", () => {
  it("rejects a blank name", async () => {
    await expect(createEntity(db, { type: "region", name: "   " })).rejects.toThrow();
  });

  it("validates attributes against the entity type", async () => {
    const castor = await createEntity(db, {
      type: "character",
      name: "Investigator Castor",
      attributes: { role: "Investigator", motivations: ["Find the missing Habbins"] },
    });
    expect(castor.attributes).toEqual({ role: "Investigator", motivations: ["Find the missing Habbins"] });
    await expect(
      createEntity(db, { type: "region", name: "Nowhere", attributes: { role: "Investigator" } }),
    ).rejects.toThrow();
  });

  it("rejects a body that isn't a rich-text document", async () => {
    await expect(
      createEntity(db, { type: "region", name: "Nowhere", body: { invalid: "{oops" } as never }),
    ).rejects.toThrow();
  });
});

describe("slugs", () => {
  it("de-duplicates slugs", async () => {
    const a = await createEntity(db, { type: "character", name: "Castor" });
    const b = await createEntity(db, { type: "character", name: "Castor" });
    const c = await createEntity(db, { type: "item", name: "castor!" });
    expect([a.slug, b.slug, c.slug]).toEqual(["castor", "castor-2", "castor-3"]);
  });

  it("regenerates the slug on rename but keeps it when the name is unchanged", async () => {
    const { house } = await konigsberg();
    expect((await updateEntity(db, house.id, { name: "Habbins House" })).slug).toBe("habbins-house");
    expect((await updateEntity(db, house.id, { name: "The Habbin Manor" })).slug).toBe("the-habbin-manor");
  });
});

describe("containment rules", () => {
  it("enforces allowed parent types", async () => {
    const { room } = await konigsberg();
    await expect(createEntity(db, { type: "region", name: "Sub", parentId: room.id })).rejects.toMatchObject({
      code: "invalid_parent",
    });
    await expect(
      createEntity(db, { type: "character", name: "Castor", parentId: room.id }),
    ).rejects.toMatchObject({ code: "invalid_parent" });
    // Rooms can nest inside rooms; items can sit in rooms.
    await expect(createEntity(db, { type: "location", name: "Closet", parentId: room.id })).resolves.toBeDefined();
    await expect(createEntity(db, { type: "item", name: "Broken chair", parentId: room.id })).resolves.toBeDefined();
  });

  it("requires places and locations to have a parent", async () => {
    await expect(createEntity(db, { type: "location", name: "Void" })).rejects.toMatchObject({
      code: "invalid_parent",
    });
    await expect(createEntity(db, { type: "place", name: "Void" })).rejects.toMatchObject({
      code: "invalid_parent",
    });
  });

  it("rejects a missing parent", async () => {
    await expect(createEntity(db, { type: "place", name: "Lost", parentId: "nope" })).rejects.toMatchObject({
      code: "invalid_parent",
    });
  });

  it("prevents cycles when re-parenting", async () => {
    const { estate, house } = await konigsberg();
    await expect(updateEntity(db, estate.id, { parentId: estate.id })).rejects.toMatchObject({
      code: "parent_cycle",
    });
    await expect(updateEntity(db, estate.id, { parentId: house.id })).rejects.toMatchObject({
      code: "parent_cycle",
    });
  });

  it("moves an entity to a new valid parent", async () => {
    const { region, room } = await konigsberg();
    const moved = await updateEntity(db, room.id, { parentId: region.id });
    expect(moved.parentId).toBe(region.id);
  });
});

describe("update", () => {
  it("leaves omitted fields unchanged", async () => {
    const { house, estate } = await konigsberg();
    const updated = await updateEntity(db, house.id, { summary: "Decrepit." });
    expect(updated).toMatchObject({ summary: "Decrepit.", parentId: estate.id, name: "Habbins House" });
  });

  it("can't change an entity's type", async () => {
    const { region } = await konigsberg();
    const updated = await updateEntity(db, region.id, { type: "item" } as never);
    expect(updated.type).toBe("region");
  });

  it("throws not_found for unknown ids", async () => {
    await expect(updateEntity(db, "nope", { name: "x" })).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("delete", () => {
  it("deletes a leaf entity", async () => {
    const { room } = await konigsberg();
    await deleteEntity(db, room.id);
    expect(await getEntity(db, room.id)).toBeUndefined();
  });

  it("refuses to delete an entity that still has children", async () => {
    const { region } = await konigsberg();
    await expect(deleteEntity(db, region.id)).rejects.toMatchObject({ code: "has_children" });
  });
});
