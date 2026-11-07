import { z } from "zod";

// Shared entity rules: used by the data layer and by forms. No database access here.

export const ENTITY_TYPES = ["region", "place", "location", "character", "item", "faction"] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

export const SPATIAL_TYPES = ["region", "place", "location"] as const satisfies readonly EntityType[];

/** Which types each entity type may sit inside. An empty list means top-level only. */
export const ALLOWED_PARENTS: Record<EntityType, readonly EntityType[]> = {
  region: ["region"],
  place: ["region", "place"],
  location: ["region", "place", "location"],
  item: ["place", "location"],
  character: [],
  faction: [],
};

/** Types that must have a parent. Everything else may also be top-level. */
export const REQUIRES_PARENT: readonly EntityType[] = ["place", "location"];

export function canContain(parent: EntityType, child: EntityType): boolean {
  return ALLOWED_PARENTS[child].includes(parent);
}

// Rich-text body, stored as a TipTap/ProseMirror JSON document (editor arrives in slice 1.4).
export const docSchema = z.object({
  type: z.literal("doc"),
  content: z.array(z.record(z.string(), z.unknown())).optional(),
});
export type Doc = z.infer<typeof docSchema>;

export function textToDoc(text: string): Doc {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return {
    type: "doc",
    content: paragraphs.map((p) => ({ type: "paragraph", content: [{ type: "text", text: p }] })),
  };
}

const optionalText = z.string().trim().max(500).optional();

/** Type-specific fields, stored in the `attributes` JSON column. */
export const attributeSchemas = {
  region: z.object({ climate: optionalText, government: optionalText }).strict(),
  place: z.object({ kind: optionalText }).strict(),
  location: z.object({}).strict(),
  character: z
    .object({
      role: optionalText,
      ancestry: optionalText,
      pronouns: optionalText,
      motivations: z.array(z.string().trim().min(1).max(500)).optional(),
    })
    .strict(),
  item: z.object({ rarity: optionalText }).strict(),
  faction: z.object({ goals: optionalText }).strict(),
} satisfies Record<EntityType, z.ZodType>;

export type EntityAttributes = { [T in EntityType]: z.infer<(typeof attributeSchemas)[T]> };

export const createEntitySchema = z.object({
  type: z.enum(ENTITY_TYPES),
  name: z.string().trim().min(1).max(200),
  summary: z.string().trim().max(1000).default(""),
  body: docSchema.nullable().default(null),
  parentId: z.string().min(1).nullable().default(null),
  // Checked against attributeSchemas[type] by parseAttributes.
  attributes: z.record(z.string(), z.unknown()).default({}),
});
export type CreateEntityInput = z.input<typeof createEntitySchema>;

// No defaults here: an omitted field means "leave unchanged". Type is immutable.
export const updateEntitySchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  summary: z.string().trim().max(1000).optional(),
  body: docSchema.nullable().optional(),
  parentId: z.string().min(1).nullable().optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
});
export type UpdateEntityInput = z.input<typeof updateEntitySchema>;

export function parseAttributes<T extends EntityType>(type: T, attributes: unknown): EntityAttributes[T] {
  return attributeSchemas[type].parse(attributes) as EntityAttributes[T];
}

export function slugify(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "untitled";
}
