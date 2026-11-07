"use client";

import { useActionState, useState } from "react";
import { removeEntity } from "@/app/actions/entities";
import { FormError } from "@/components/form/field";
import { Button } from "@/components/ui/button";

export function DeleteEntity({ id, name }: { id: string; name: string }) {
  const [state, action, pending] = useActionState(removeEntity, {});
  const [confirming, setConfirming] = useState(false);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <FormError error={state.error} />
      {confirming ? (
        <div className="flex items-center gap-2">
          <span className="text-sm">Delete {name} permanently?</span>
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
