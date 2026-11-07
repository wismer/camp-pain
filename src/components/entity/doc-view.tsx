import type { Doc } from "@/lib/entities";

type Node = { type?: unknown; text?: unknown; content?: unknown };

// Minimal read-only renderer for paragraphs of text. Replaced by the TipTap renderer in slice 1.4.
export function DocView({ doc }: { doc: Doc }) {
  return (
    <div className="flex flex-col gap-3 leading-7">
      {(doc.content ?? []).map((block, i) => (
        <p key={i}>{textOf(block)}</p>
      ))}
    </div>
  );
}

function textOf(node: Node): string {
  if (typeof node.text === "string") return node.text;
  return Array.isArray(node.content) ? node.content.map(textOf).join("") : "";
}
