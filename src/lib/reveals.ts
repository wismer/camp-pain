import { z } from "zod";
import { docSchema } from "./entities";

// Shared reveal rules: used by the data layer and by forms. No database access here.

export const CHECK_KINDS = ["skill", "ability", "save", "other"] as const;
export type CheckKind = (typeof CHECK_KINDS)[number];

export const SKILLS = [
  "Acrobatics",
  "Animal Handling",
  "Arcana",
  "Athletics",
  "Deception",
  "History",
  "Insight",
  "Intimidation",
  "Investigation",
  "Medicine",
  "Nature",
  "Perception",
  "Performance",
  "Persuasion",
  "Religion",
  "Sleight of Hand",
  "Stealth",
  "Survival",
] as const;

export const ABILITIES = [
  "Strength",
  "Dexterity",
  "Constitution",
  "Intelligence",
  "Wisdom",
  "Charisma",
] as const;

export const BRANCHES = ["success", "failure"] as const;
export type Branch = (typeof BRANCHES)[number];

/** What each kind of check may name; "other" is free text ("Opens the chest"). */
const CHECKS_BY_KIND: Record<CheckKind, readonly string[] | null> = {
  skill: SKILLS,
  ability: ABILITIES,
  save: ABILITIES,
  other: null,
};

const gateFields = {
  checkKind: z.enum(CHECK_KINDS),
  check: z.string().trim().min(1).max(100),
  dc: z.number().int().min(1).max(30).nullable(),
};

/** Rolls need a known skill/ability and a DC; "other" gates take any text and an optional DC. */
export const gateSchema = z.object(gateFields).superRefine((gate, ctx) => {
  const allowed = CHECKS_BY_KIND[gate.checkKind];
  if (allowed && !allowed.includes(gate.check)) {
    ctx.addIssue({ code: "custom", path: ["check"], message: `Unknown ${gate.checkKind}: ${gate.check}` });
  }
  if (gate.checkKind !== "other" && gate.dc === null) {
    ctx.addIssue({ code: "custom", path: ["dc"], message: "A roll needs a DC" });
  }
});
export type Gate = z.infer<typeof gateSchema>;

export const createRevealSchema = z.object({
  entityId: z.string().min(1),
  parentId: z.string().min(1).nullable().default(null),
  branch: z.enum(BRANCHES).default("success"),
  ...gateFields,
  dc: gateFields.dc.default(null),
  successBody: docSchema.nullable().default(null),
  failureBody: docSchema.nullable().default(null),
});
export type CreateRevealInput = z.input<typeof createRevealSchema>;

// No defaults: an omitted field means "leave unchanged". Placement changes go through moveReveal.
export const updateRevealSchema = z.object({
  checkKind: gateFields.checkKind.optional(),
  check: gateFields.check.optional(),
  dc: gateFields.dc.optional(),
  successBody: docSchema.nullable().optional(),
  failureBody: docSchema.nullable().optional(),
});
export type UpdateRevealInput = z.input<typeof updateRevealSchema>;

/** "Investigation DC 14", "Strength save DC 12", "Opens the chest". */
export function formatGate(gate: Gate): string {
  const name = gate.checkKind === "save" ? `${gate.check} save` : gate.check;
  return gate.dc === null ? name : `${name} DC ${gate.dc}`;
}
