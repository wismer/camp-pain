import { beforeEach, describe, expect, it } from "vitest";
import { testDb } from "@/test/db";
import type { Db } from "./client";
import { createEntity, updateEntity } from "./entities";
import { searchEntities } from "./search";

let db: Db;
const names = async (q: string, limit?: number) => (await searchEntities(db, q, limit)).map((r) => r.name);

beforeEach(async () => {
  db = testDb();
  for (const name of ["Investigator Castor", "Castor's Office", "Konigsberg", "Kitchen", "100% Proof", "a_b"]) {
    await createEntity(db, { type: "character", name });
  }
});

describe("searchEntities", () => {
  it("matches name and word prefixes case-insensitively, name prefixes first", async () => {
    expect(await names("CAS")).toEqual(["Castor's Office", "Investigator Castor"]);
    expect(await names("k")).toEqual(["Kitchen", "Konigsberg"]);
  });

  it("doesn't match inside words", async () => {
    expect(await names("stor")).toEqual([]);
  });

  it("treats LIKE wildcards literally", async () => {
    expect(await names("100%")).toEqual(["100% Proof"]);
    expect(await names("%")).toEqual([]);
    expect(await names("a_")).toEqual(["a_b"]);
    expect(await names("ab")).toEqual([]);
  });

  it("returns recently edited entries for an empty query", async () => {
    const [kitchen] = await searchEntities(db, "kitchen");
    await updateEntity(db, kitchen.id, { summary: "touched" });
    expect((await names("  ", 2))[0]).toBe("Kitchen");
  });

  it("respects the limit", async () => {
    expect(await names("", 3)).toHaveLength(3);
  });
});
