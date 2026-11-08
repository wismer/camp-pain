import { describe, expect, it } from "vitest";
import { revealFieldsFromForm } from "./reveal-form";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
}

describe("revealFieldsFromForm", () => {
  it("parses the gate and both bodies", () => {
    const doc = { type: "doc", content: [] };
    expect(
      revealFieldsFromForm(
        form({ checkKind: "skill", check: " Investigation ", dc: "14", successBody: JSON.stringify(doc) }),
      ),
    ).toEqual({ checkKind: "skill", check: "Investigation", dc: 14, successBody: doc, failureBody: null });
  });

  it("maps an empty DC to null and a non-number to NaN for validation to reject", () => {
    expect(revealFieldsFromForm(form({ dc: "" })).dc).toBeNull();
    expect(revealFieldsFromForm(form({ dc: "hard" })).dc).toBeNaN();
  });
});
