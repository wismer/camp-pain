"use client";

import type { MentionNodeAttrs } from "@tiptap/extension-mention";
import { ReactRenderer } from "@tiptap/react";
import type { SuggestionOptions, SuggestionProps } from "@tiptap/suggestion";
import { ENTITY_TYPE_LABELS } from "@/lib/entities";
import { filterMentionTargets, type MentionTarget } from "@/lib/rich-text/mentions";
import { cn } from "@/lib/utils";

type ListProps = {
  items: MentionTarget[];
  selected: number;
  onPick: (item: MentionTarget) => void;
};

function MentionList({ items, selected, onPick }: ListProps) {
  return (
    <div
      role="listbox"
      aria-label="Mention suggestions"
      className="w-72 rounded-md border bg-popover p-1 text-sm shadow-md"
    >
      {items.length === 0 ? (
        <p className="px-2 py-1.5 text-muted-foreground">No matching entries</p>
      ) : (
        items.map((item, i) => (
          <button
            key={item.id}
            type="button"
            role="option"
            aria-selected={i === selected}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPick(item)}
            className={cn(
              "flex w-full items-baseline justify-between gap-2 rounded px-2 py-1.5 text-left",
              i === selected && "bg-muted",
            )}
          >
            <span className="truncate">{item.name}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {ENTITY_TYPE_LABELS[item.type].singular}
            </span>
          </button>
        ))
      )}
    </div>
  );
}

type Suggestion = Omit<SuggestionOptions<MentionTarget, MentionNodeAttrs>, "editor">;

/** The @ picker over the entries loaded with the page. */
export function mentionSuggestion(targets: MentionTarget[]): Suggestion {
  return {
    char: "@",
    items: ({ query }) => filterMentionTargets(targets, query),
    render: () => {
      let renderer: ReactRenderer<unknown, ListProps> | undefined;
      let props: SuggestionProps<MentionTarget, MentionNodeAttrs> | undefined;
      let selected = 0;

      const pick = (item: MentionTarget) => props?.command({ id: item.id, label: item.name });
      const update = () => {
        if (!renderer || !props) return;
        renderer.updateProps({ items: props.items, selected, onPick: pick });
        const rect = props.clientRect?.();
        if (rect)
          Object.assign(renderer.element.style, { left: `${rect.left}px`, top: `${rect.bottom + 4}px` });
      };

      return {
        onStart: (p) => {
          props = p;
          selected = 0;
          renderer = new ReactRenderer(MentionList, {
            editor: p.editor,
            props: { items: p.items, selected, onPick: pick },
          });
          Object.assign(renderer.element.style, { position: "fixed", zIndex: "50" });
          document.body.appendChild(renderer.element);
          update();
        },
        onUpdate: (p) => {
          props = p;
          selected = Math.min(selected, Math.max(p.items.length - 1, 0));
          update();
        },
        onKeyDown: ({ event }) => {
          const count = props?.items.length ?? 0;
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            if (count === 0) return true;
            selected = (selected + (event.key === "ArrowDown" ? 1 : count - 1)) % count;
            update();
            return true;
          }
          if (event.key === "Enter" || event.key === "Tab") {
            const item = props?.items[selected];
            if (!item) return false;
            pick(item);
            return true;
          }
          return false; // Escape is handled by the suggestion plugin.
        },
        onExit: () => {
          renderer?.element.remove();
          renderer?.destroy();
          renderer = undefined;
        },
      };
    },
  };
}
