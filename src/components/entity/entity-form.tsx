"use client";

import { useActionState, useState } from "react";
import { saveEntity } from "@/app/actions/entities";
import { Field, FormError, inputClass } from "@/components/form/field";
import { RichTextEditor } from "@/components/rich-text/rich-text-editor";
import { Button } from "@/components/ui/button";
import {
  ALLOWED_PARENTS,
  ATTRIBUTE_FIELDS,
  ENTITY_TYPES,
  ENTITY_TYPE_LABELS,
  REQUIRES_PARENT,
  type Doc,
  type EntityType,
} from "@/lib/entities";

type Option = { id: string; name: string; type: EntityType };

export type EntityFormValues = {
  id?: string;
  type: EntityType;
  name: string;
  summary: string;
  body: Doc | null;
  parentId: string | null;
  attributes: Record<string, unknown>;
};

export function EntityForm({ initial, parents }: { initial: EntityFormValues; parents: Option[] }) {
  const [state, action, pending] = useActionState(saveEntity, {});
  const [type, setType] = useState(initial.type);
  const editing = initial.id !== undefined;
  const parentOptions = parents.filter((p) => ALLOWED_PARENTS[type].includes(p.type) && p.id !== initial.id);

  return (
    <form action={action} className="flex flex-col gap-5">
      {editing && <input type="hidden" name="id" value={initial.id} />}
      <FormError error={state.error} />

      {!editing && (
        <Field label="Type">
          <select
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as EntityType)}
            className={inputClass}
          >
            {ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {ENTITY_TYPE_LABELS[t].singular}
              </option>
            ))}
          </select>
        </Field>
      )}

      <Field label="Name">
        <input name="name" required defaultValue={initial.name} className={inputClass} />
      </Field>

      {ALLOWED_PARENTS[type].length > 0 && (
        // Keyed by type so the selection resets when the allowed parents change.
        <Field label="Inside" hint={`A ${type} can sit inside: ${ALLOWED_PARENTS[type].join(", ")}`}>
          <select key={type} name="parentId" defaultValue={initial.parentId ?? ""} className={inputClass}>
            {!REQUIRES_PARENT.includes(type) && <option value="">Nothing (top level)</option>}
            {parentOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({ENTITY_TYPE_LABELS[p.type].singular})
              </option>
            ))}
          </select>
        </Field>
      )}

      <Field label="Summary" hint="One line, shown in lists and previews">
        <input name="summary" defaultValue={initial.summary} className={inputClass} />
      </Field>

      {ATTRIBUTE_FIELDS[type].map((field) => {
        const value = initial.attributes[field.key];
        return (
          <Field
            key={`${type}-${field.key}`}
            label={field.label}
            hint={field.kind === "lines" ? "One per line" : undefined}
          >
            {field.kind === "lines" ? (
              <textarea
                name={`attr.${field.key}`}
                rows={3}
                defaultValue={Array.isArray(value) ? value.join("\n") : ""}
                className={inputClass}
              />
            ) : (
              <input
                name={`attr.${field.key}`}
                defaultValue={typeof value === "string" ? value : ""}
                className={inputClass}
              />
            )}
          </Field>
        );
      })}

      <div className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Description</span>
        <span className="text-xs text-muted-foreground">
          Type @ to link an entry; narrow with @char/, @loc/, @place/, @reg/, @item/ or @fac/
        </span>
        <RichTextEditor
          name="body"
          label="Description"
          defaultValue={initial.body}
          mentionTargets={parents.filter((p) => p.id !== initial.id)}
        />
      </div>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : editing ? "Save changes" : "Create"}
        </Button>
      </div>
    </form>
  );
}
