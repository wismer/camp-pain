import { describe, expect, it } from "vitest";
import { createDb } from "./client";
import { runMigrations } from "./migrate";

describe("createDb", () => {
  it("enables foreign key enforcement", () => {
    const db = createDb(":memory:");
    expect(db.$client.pragma("foreign_keys", { simple: true })).toBe(1);
  });

  it("migrates without error", () => {
    const db = createDb(":memory:");
    expect(() => runMigrations(db)).not.toThrow();
  });
});
