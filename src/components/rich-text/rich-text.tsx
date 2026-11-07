import { renderToReactElement } from "@tiptap/static-renderer/pm/react";
import type { Doc } from "@/lib/entities";
import { richTextExtensions } from "@/lib/rich-text/extensions";
import { MentionChip, type MentionEntity } from "./mention-chip";

export const proseClass = "prose prose-neutral max-w-none dark:prose-invert";

/**
 * Server-rendered, read-only view of a rich-text document. Ships no editor code; mentions become
 * chips showing each entry's current name.
 */
export function RichText({ doc, entities }: { doc: Doc; entities: Map<string, MentionEntity> }) {
  return (
    <div className={proseClass}>
      {renderToReactElement({
        content: doc,
        extensions: richTextExtensions,
        options: {
          nodeMapping: {
            mention: ({ node }) => (
              <MentionChip entity={entities.get(String(node.attrs.id))} label={String(node.attrs.label ?? "")} />
            ),
          },
        },
      })}
    </div>
  );
}
