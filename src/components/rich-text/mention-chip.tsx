"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { unlinkMissingMention } from "@/app/actions/entities";
import { AttributeList } from "@/components/entity/attribute-list";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ENTITY_TYPE_CHIP_CLASS, ENTITY_TYPE_LABELS, entityHref, type EntityType } from "@/lib/entities";
import { cn } from "@/lib/utils";

/** What a mention needs to render and preview its entry. */
export type MentionEntity = {
  id: string;
  type: EntityType;
  name: string;
  slug: string;
  summary: string;
  attributes: Record<string, unknown>;
};

const chipClass = "rounded px-1 py-0.5 font-medium no-underline";

/**
 * An inline link to an entry. Click navigates, cmd/ctrl+click opens a new tab (browser default),
 * shift+click previews the entry in place.
 */
/** The text a mention lives in: an entry's description or one of its reveal layers. */
export type UnlinkFrom = { entityId: string } | { revealId: string };

type Props = { unlinkFrom?: UnlinkFrom; targetId: string; entity: MentionEntity | undefined; label: string };

export function MentionChip({ unlinkFrom, targetId, entity, label }: Props) {
  const anchor = useRef<HTMLAnchorElement>(null);
  const [open, setOpen] = useState(false);

  if (!entity) {
    return (
      <Popover>
        <PopoverTrigger
          data-type="mention"
          title="This entry was deleted"
          className={cn(chipClass, "cursor-pointer bg-muted text-muted-foreground line-through")}
        >
          {label || "Missing entry"}
        </PopoverTrigger>
        <PopoverContent align="start" aria-label="Missing entry">
          <p>
            <span className="font-medium">{label || "This entry"}</span> was deleted.
          </p>
          {unlinkFrom && (
            <form action={unlinkMissingMention}>
              {"revealId" in unlinkFrom ? (
                <input type="hidden" name="revealId" value={unlinkFrom.revealId} />
              ) : (
                <input type="hidden" name="entityId" value={unlinkFrom.entityId} />
              )}
              <input type="hidden" name="targetId" value={targetId} />
              <Button type="submit" size="sm" variant="outline">
                Unlink, keep the text
              </Button>
            </form>
          )}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <>
      <Link
        ref={anchor}
        href={entityHref(entity)}
        data-type="mention"
        onClick={(e) => {
          if (!e.shiftKey) return;
          e.preventDefault();
          setOpen(true);
        }}
        className={cn(chipClass, ENTITY_TYPE_CHIP_CLASS[entity.type], "hover:underline")}
      >
        {entity.name}
      </Link>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverContent
          anchor={anchor}
          align="start"
          aria-label={`Preview of ${entity.name}`}
          className="w-80"
        >
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {ENTITY_TYPE_LABELS[entity.type].singular}
            </p>
            <p className="text-base font-semibold">{entity.name}</p>
            {entity.summary && <p className="text-muted-foreground">{entity.summary}</p>}
          </div>
          <AttributeList type={entity.type} attributes={entity.attributes} />
          <Link href={entityHref(entity)} className="self-start text-sm font-medium hover:underline">
            Open {entity.name} →
          </Link>
        </PopoverContent>
      </Popover>
    </>
  );
}
