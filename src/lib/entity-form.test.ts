import { describe, expect, it } from "vitest";
import { entityFieldsFromForm, entityTypeFromForm } from "./entity-form";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
}

describe("entityFieldsFromForm", () => {
  it("trims fields, maps an empty parent to null and parses the body JSON", () => {
    const doc = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Hi" }] }] };
    const fields = entityFieldsFromForm(
      form({ name: " Castor ", summary: "", parentId: "", body: JSON.stringify(doc) }),
      "character",
    );
    expect(fields).toMatchObject({ name: "Castor", summary: "", parentId: null, body: doc });
  });

  it("passes unparseable body JSON through so validation rejects it", () => {
    expect(entityFieldsFromForm(form({ name: "X", body: "{not json" }), "region").body).toEqual({
      invalid: "{not json",
    });
  });

  it("collects only the attributes for the given type, splitting line fields", () => {
    const fields = entityFieldsFromForm(
      form({ "attr.role": "Investigator", "attr.motivations": "Find them\n\n Get paid ", "attr.climate": "Wet" }),
      "character",
    );
    expect(fields.attributes).toEqual({ role: "Investigator", motivations: ["Find them", "Get paid"] });
  });

  it("leaves the body null when empty", () => {
    expect(entityFieldsFromForm(form({ name: "X", body: "  " }), "region").body).toBeNull();
  });
});

describe("entityTypeFromForm", () => {
  it("accepts known types and falls back to region", () => {
    expect(entityTypeFromForm(form({ type: "faction" }))).toBe("faction");
    expect(entityTypeFromForm(form({ type: "dragon" }))).toBe("region");
  });
});
