import { ATTRIBUTE_FIELDS, ENTITY_TYPES, textToDoc, type EntityType } from "./entities";

// Converts submitted entity form fields into data-layer input. Validation happens in the data layer.

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export function entityTypeFromForm(form: FormData): EntityType {
  const type = text(form, "type");
  return (ENTITY_TYPES as readonly string[]).includes(type) ? (type as EntityType) : "region";
}

export function entityFieldsFromForm(form: FormData, type: EntityType) {
  const body = text(form, "body");
  const attributes: Record<string, string | string[]> = {};
  for (const field of ATTRIBUTE_FIELDS[type]) {
    const value = text(form, `attr.${field.key}`);
    if (!value) continue;
    attributes[field.key] =
      field.kind === "lines"
        ? value
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean)
        : value;
  }
  return {
    name: text(form, "name"),
    summary: text(form, "summary"),
    body: body ? textToDoc(body) : null,
    parentId: text(form, "parentId") || null,
    attributes,
  };
}
