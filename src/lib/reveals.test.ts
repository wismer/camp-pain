import { describe, expect, it } from "vitest";
import { formatGate } from "./reveals";

describe("formatGate", () => {
  it("names skills, ability checks, saves and free-text gates", () => {
    expect(formatGate({ checkKind: "skill", check: "Investigation", dc: 14 })).toBe("Investigation DC 14");
    expect(formatGate({ checkKind: "ability", check: "Strength", dc: 12 })).toBe("Strength DC 12");
    expect(formatGate({ checkKind: "save", check: "Dexterity", dc: 15 })).toBe("Dexterity save DC 15");
    expect(formatGate({ checkKind: "other", check: "Opens the chest", dc: null })).toBe("Opens the chest");
  });
});
