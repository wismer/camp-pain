import { describe, expect, it } from "vitest";
import { formatDuration } from "./format";

describe("formatDuration", () => {
  const at = (minutes: number) => new Date(Date.UTC(2026, 0, 1) + minutes * 60_000);
  it("formats hours and minutes", () => {
    expect(formatDuration(at(0), at(0.5))).toBe("under a minute");
    expect(formatDuration(at(0), at(45))).toBe("45m");
    expect(formatDuration(at(0), at(120))).toBe("2h");
    expect(formatDuration(at(0), at(135))).toBe("2h 15m");
  });
});
