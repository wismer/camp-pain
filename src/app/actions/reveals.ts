"use server";

import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { getEntity } from "@/db/entities";
import { createReveal, updateReveal } from "@/db/reveals";
import { formText } from "@/lib/form-data";
import { entityHref } from "@/lib/entities";
import { revealFieldsFromForm } from "@/lib/reveal-form";
import type { Branch } from "@/lib/reveals";
import { refreshAll, toActionError, type ActionState } from "./shared";

async function entityPage(entityId: string): Promise<string> {
  const entity = await getEntity(getDb(), entityId);
  return entity ? entityHref(entity) : "/";
}

export async function saveReveal(_prev: ActionState, form: FormData): Promise<ActionState> {
  const db = getDb();
  const id = formText(form, "id");
  let entityId: string;
  try {
    const fields = revealFieldsFromForm(form);
    const reveal = id
      ? await updateReveal(db, id, fields)
      : await createReveal(db, {
          ...fields,
          entityId: formText(form, "entityId"),
          parentId: formText(form, "parentId") || null,
          branch: (formText(form, "branch") || "success") as Branch,
        });
    entityId = reveal.entityId;
  } catch (error) {
    return toActionError(error);
  }
  refreshAll();
  redirect(await entityPage(entityId));
}
