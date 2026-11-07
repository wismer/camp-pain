import StarterKit from "@tiptap/starter-kit";
import type { Extensions } from "@tiptap/core";

// One extension list for the editor and the renderer, so what you write is what you see.
export const richTextExtensions: Extensions = [
  StarterKit.configure({
    // Entity pages use h1 for the name and h2 for sections, so content headings start at h3.
    heading: { levels: [3, 4] },
    code: false,
    codeBlock: false,
    // Links come with @mentions (slice 1.5).
    link: false,
  }),
];
