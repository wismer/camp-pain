"use client";

import { useActionState, useState } from "react";
import { saveReveal } from "@/app/actions/reveals";
import { Field, FormError, inputClass } from "@/components/form/field";
import { RichTextEditor } from "@/components/rich-text/rich-text-editor";
import { Button } from "@/components/ui/button";
import type { Doc } from "@/lib/entities";
import type { MentionTarget } from "@/lib/rich-text/mentions";
import { ABILITIES, SKILLS, type Branch, type CheckKind } from "@/lib/reveals";

const KIND_LABELS: Record<CheckKind, string> = {
  skill: "Skill check",
  ability: "Ability check",
  save: "Saving throw",
  other: "Other (free text)",
};

export type RevealFormValues = {
  id?: string;
  entityId: string;
  parentId: string | null;
  branch: Branch;
  checkKind: CheckKind;
  check: string;
  dc: number | null;
  successBody: Doc | null;
  failureBody: Doc | null;
};

export function RevealForm({
  initial,
  mentionTargets,
}: {
  initial: RevealFormValues;
  mentionTargets: MentionTarget[];
}) {
  const [state, action, pending] = useActionState(saveReveal, {});
  const [kind, setKind] = useState(initial.checkKind);
  const options = kind === "skill" ? SKILLS : kind === "other" ? null : ABILITIES;
  // Keep the chosen check when switching between kinds that share it (ability ↔ save).
  const initialCheck =
    options === null || options.includes(initial.check as never) ? initial.check : undefined;

  return (
    <form action={action} className="flex flex-col gap-5">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="entityId" value={initial.entityId} />
      <input type="hidden" name="parentId" value={initial.parentId ?? ""} />
      <input type="hidden" name="branch" value={initial.branch} />
      <FormError error={state.error} />

      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_6rem]">
        <Field label="Gate">
          <select
            name="checkKind"
            value={kind}
            onChange={(e) => setKind(e.target.value as CheckKind)}
            className={inputClass}
          >
            {Object.entries(KIND_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label={kind === "other" ? "Trigger" : kind === "skill" ? "Skill" : "Ability"}>
          {options ? (
            <select key={kind} name="check" defaultValue={initialCheck ?? options[0]} className={inputClass}>
              {options.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          ) : (
            <input
              key={kind}
              name="check"
              required
              defaultValue={initialCheck}
              placeholder="e.g. Opens the chest"
              className={inputClass}
            />
          )}
        </Field>
        <Field label={kind === "other" ? "DC (optional)" : "DC"}>
          <input
            name="dc"
            type="number"
            min={1}
            max={30}
            required={kind !== "other"}
            defaultValue={initial.dc ?? ""}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">On success</span>
        <RichTextEditor
          name="successBody"
          label="On success"
          defaultValue={initial.successBody}
          mentionTargets={mentionTargets}
        />
      </div>
      <div className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">On failure</span>
        <span className="text-xs text-muted-foreground">Optional. Leave empty if nothing happens.</span>
        <RichTextEditor
          name="failureBody"
          label="On failure"
          defaultValue={initial.failureBody}
          mentionTargets={mentionTargets}
        />
      </div>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : initial.id ? "Save layer" : "Add layer"}
        </Button>
      </div>
    </form>
  );
}
