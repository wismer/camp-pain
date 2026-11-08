"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { getDb } from "@/db/client";
import { createConnection, deleteConnection } from "@/db/connections";
import { EntityError, createEntity, deleteEntity, getEntity, updateEntity } from "@/db/entities";
import { entityHref } from "@/lib/entities";
import { unlinkMention } from "@/lib/rich-text/mentions";
import { entityFieldsFromForm, entityTypeFromForm } from "@/lib/entity-form";

export type ActionState = { error?: string };

/** Turns validation and rule errors into a message for the form; rethrows anything else. */
function toActionError(error: unknown): ActionState {
  if (error instanceof EntityError) return { error: error.message };
  if (error instanceof ZodError) {
    const issue = error.issues[0];
    return { error: issue.path.length ? `${issue.path.join(".")}: ${issue.message}` : issue.message };
  }
  throw error;
}

function refreshAll() {
  // Names and hierarchy show in the sidebar on every page.
  revalidatePath("/", "layout");
}

export async function saveEntity(_prev: ActionState, form: FormData): Promise<ActionState> {
  const db = getDb();
  const id = form.get("id");
  let href: string;
  try {
    if (typeof id === "string" && id) {
      const existing = await getEntity(db, id);
      if (!existing) return { error: "This entry no longer exists" };
      href = entityHref(await updateEntity(db, id, entityFieldsFromForm(form, existing.type)));
    } else {
      const type = entityTypeFromForm(form);
      href = entityHref(await createEntity(db, { type, ...entityFieldsFromForm(form, type) }));
    }
  } catch (error) {
    return toActionError(error);
  }
  refreshAll();
  redirect(href);
}

export async function removeEntity(_prev: ActionState, form: FormData): Promise<ActionState> {
  const db = getDb();
  const id = String(form.get("id") ?? "");
  let href = "/";
  try {
    const entity = await getEntity(db, id);
    const parent = entity?.parentId ? await getEntity(db, entity.parentId) : undefined;
    if (parent) href = entityHref(parent);
    await deleteEntity(db, id);
  } catch (error) {
    return toActionError(error);
  }
  refreshAll();
  redirect(href);
}

export async function addExit(_prev: ActionState, form: FormData): Promise<ActionState> {
  const field = (name: string) => String(form.get(name) ?? "").trim();
  try {
    await createConnection(getDb(), {
      fromId: field("fromId"),
      toId: field("toId"),
      label: field("label"),
      reverseLabel: field("reverseLabel") || null,
      oneWay: form.get("oneWay") === "on",
    });
  } catch (error) {
    return toActionError(error);
  }
  refreshAll();
  return {};
}

export async function removeExit(form: FormData): Promise<void> {
  await deleteConnection(getDb(), String(form.get("connectionId") ?? ""));
  refreshAll();
}

/** Turns mentions of a (deleted) entry in one description back into plain text. */
export async function unlinkMissingMention(form: FormData): Promise<void> {
  const db = getDb();
  const source = await getEntity(db, String(form.get("sourceId") ?? ""));
  if (!source?.body) return;
  await updateEntity(db, source.id, { body: unlinkMention(source.body, String(form.get("targetId") ?? "")) });
  refreshAll();
}
