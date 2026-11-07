import type { Extensions } from "@tiptap/core";
import Mention from "@tiptap/extension-mention";
import StarterKit from "@tiptap/starter-kit";

/** A link to an entry, stored as `{ id: entityId, label }`; the label is refreshed from the current name. */
export const mentionNode = Mention.configure({
  HTMLAttributes: { class: "mention" },
  renderText: ({ node }) => String(node.attrs.label ?? ""),
  renderHTML: ({ node, options }) => [
    "span",
    { ...options.HTMLAttributes, "data-type": "mention", "data-id": node.attrs.id },
    String(node.attrs.label ?? ""),
  ],
});

// One extension list for the editor and the renderer, so what you write is what you see.
// The editor swaps in a copy of mentionNode with the @ picker attached.
export const richTextExtensions: Extensions = [
  StarterKit.configure({
    // Entity pages use h1 for the name and h2 for sections, so content headings start at h3.
    heading: { levels: [3, 4] },
    code: false,
    codeBlock: false,
    link: false,
  }),
  mentionNode,
];
