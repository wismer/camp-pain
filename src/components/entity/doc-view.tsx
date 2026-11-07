import { docBlocks, type Doc } from "@/lib/entities";

// Minimal read-only renderer for paragraphs of text. Replaced by the TipTap renderer in slice 1.4.
export function DocView({ doc }: { doc: Doc }) {
  return (
    <div className="flex flex-col gap-3 leading-7">
      {docBlocks(doc).map((text, i) => (
        <p key={i}>{text}</p>
      ))}
    </div>
  );
}
