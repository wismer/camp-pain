import { ATTRIBUTE_FIELDS, ENTITY_TYPES, type Doc, type EntityType } from "./entities";

// Converts submitted entity form fields into data-layer input. Validation happens in the data layer.

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export function entityTypeFromForm(form: FormData): EntityType {
  const type = text(form, "type");
  return (ENTITY_TYPES as readonly string[]).includes(type) ? (type as EntityType) : "region";
}

/** The editor submits its document as JSON; anything unparseable fails doc validation downstream. */
function json(form: FormData, name: string): unknown {
  const value = text(form, name);
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return { invalid: value };
  }
}

export function entityFieldsFromForm(form: FormData, type: EntityType) {
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
    body: json(form, "body") as Doc | null,
    parentId: text(form, "parentId") || null,
    attributes,
  };
}
