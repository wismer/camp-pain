"use client";

import { useActionState, useState } from "react";
import type { ActionState } from "@/app/actions/shared";
import { FormError } from "@/components/form/field";
import { Button } from "@/components/ui/button";

type Props = {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  /** Hidden fields submitted with the delete, e.g. the id. */
  fields: Record<string, string>;
  /** Shown when asking for confirmation, e.g. "Delete Kitchen permanently?" */
  prompt: string;
};

/** A delete button that asks for confirmation inline and shows the action's error, if any. */
export function ConfirmDelete({ action, fields, prompt }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const [confirming, setConfirming] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <FormError error={state.error} />
      {confirming ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm">{prompt}</span>
          <Button type="submit" variant="destructive" disabled={pending}>
            Yes, delete
          </Button>
          <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <div>
          <Button type="button" variant="outline" onClick={() => setConfirming(true)}>
            Delete…
          </Button>
        </div>
      )}
    </form>
  );
}
