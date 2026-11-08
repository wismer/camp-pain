"use client";

import { useActionState } from "react";
import { addExit } from "@/app/actions/entities";
import { FormError, inputClass } from "@/components/form/field";
import { Button } from "@/components/ui/button";

type Props = {
  fromId: string;
  targets: { id: string; name: string }[];
  /** This entry's reveal layers, any of which can hide the exit until it succeeds. */
  hidingLayers: { id: string; label: string }[];
};

export function AddExitForm({ fromId, targets, hidingLayers }: Props) {
  const [state, action, pending] = useActionState(addExit, {});

  return (
    <form action={action} aria-label="Add exit" className="flex flex-col gap-3 rounded-md border p-4">
      <input type="hidden" name="fromId" value={fromId} />
      <FormError error={state.error} />
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="label"
          required
          placeholder="Exit label, e.g. East doorway"
          aria-label="Exit label"
          className={inputClass}
        />
        <select name="toId" required defaultValue="" aria-label="Leads to" className={inputClass}>
          <option value="" disabled>
            Leads to…
          </option>
          {targets.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <input
          name="reverseLabel"
          placeholder="Label from the other side (optional)"
          aria-label="Label from the other side"
          className={inputClass}
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="oneWay" /> One-way
        </label>
        {hidingLayers.length > 0 && (
          <select name="revealId" defaultValue="" aria-label="Hidden behind" className={inputClass}>
            <option value="">Not hidden</option>
            {hidingLayers.map((l) => (
              <option key={l.id} value={l.id}>
                Hidden behind {l.label}
              </option>
            ))}
          </select>
        )}
      </div>
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          Add exit
        </Button>
      </div>
    </form>
  );
}
