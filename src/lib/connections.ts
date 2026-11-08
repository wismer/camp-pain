import { z } from "zod";

export const createConnectionSchema = z.object({
  fromId: z.string().min(1),
  toId: z.string().min(1),
  /** How the exit reads from the `from` side, e.g. "North doorway". */
  label: z.string().trim().min(1).max(200),
  /** How it reads from the `to` side. Falls back to `label`. Ignored for one-way connections. */
  reverseLabel: z.string().trim().min(1).max(200).nullable().default(null),
  oneWay: z.boolean().default(false),
  notes: z.string().trim().max(1000).default(""),
  /** A reveal layer of either end that hides this connection until it succeeds. */
  revealId: z.string().min(1).nullable().default(null),
});
export type CreateConnectionInput = z.input<typeof createConnectionSchema>;
