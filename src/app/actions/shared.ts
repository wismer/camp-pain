import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { EntityError } from "@/db/entities";

// Helpers for Server Actions. Not itself a "use server" module, which may only export actions.

export type ActionState = { error?: string };

/** Turns validation and rule errors into a message for the form; rethrows anything else. */
export function toActionError(error: unknown): ActionState {
  if (error instanceof EntityError) return { error: error.message };
  if (error instanceof ZodError) {
    const issue = error.issues[0];
    return { error: issue.path.length ? `${issue.path.join(".")}: ${issue.message}` : issue.message };
  }
  throw error;
}

export function refreshAll() {
  // Names and hierarchy show in the sidebar on every page.
  revalidatePath("/", "layout");
}
