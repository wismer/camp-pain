import { describe, expect, it } from "vitest";
import { entityFieldsFromForm, entityTypeFromForm } from "./entity-form";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
}

describe("entityFieldsFromForm", () => {
  it("trims fields, maps an empty parent to null and splits paragraphs", () => {
    const fields = entityFieldsFromForm(
      form({ name: " Castor ", summary: "", parentId: "", body: "First.\n\nSecond." }),
      "character",
    );
    expect(fields).toMatchObject({ name: "Castor", summary: "", parentId: null });
    expect(fields.body?.content).toHaveLength(2);
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
