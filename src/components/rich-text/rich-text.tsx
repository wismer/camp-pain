import { renderToReactElement } from "@tiptap/static-renderer/pm/react";
import type { Doc } from "@/lib/entities";
import { richTextExtensions } from "@/lib/rich-text/extensions";

export const proseClass = "prose prose-neutral max-w-none dark:prose-invert";

/** Server-rendered, read-only view of a rich-text document. Ships no editor code. */
export function RichText({ doc }: { doc: Doc }) {
  return (
    <div className={proseClass}>{renderToReactElement({ content: doc, extensions: richTextExtensions })}</div>
  );
}
