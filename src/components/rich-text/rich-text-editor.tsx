"use client";

import { EditorContent, useEditor, useEditorState, type Editor, type JSONContent } from "@tiptap/react";
import { useState } from "react";
import type { Doc } from "@/lib/entities";
import { mentionNode, richTextExtensions } from "@/lib/rich-text/extensions";
import type { MentionTarget } from "@/lib/rich-text/mentions";
import { cn } from "@/lib/utils";
import { mentionSuggestion } from "./mention-suggestions";
import { proseClass } from "./rich-text";

type Props = { name: string; label: string; defaultValue: Doc | null; mentionTargets: MentionTarget[] };

/** Rich-text field for forms: submits the document as JSON in a hidden input named `name`. */
export function RichTextEditor({ name, label, defaultValue, mentionTargets }: Props) {
  const [json, setJson] = useState(defaultValue ? JSON.stringify(defaultValue) : "");
  const editor = useEditor({
    extensions: [
      ...richTextExtensions.filter((e) => e !== mentionNode),
      mentionNode.configure({ suggestion: mentionSuggestion(mentionTargets) }),
    ],
    content: defaultValue ?? "",
    // Render on the client only; the server can't measure the DOM.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": label,
        class: cn(proseClass, "min-h-48 px-3 py-2 outline-none"),
      },
    },
    onUpdate: ({ editor }) =>
      setJson(editor.isEmpty ? "" : JSON.stringify(withoutTrailingEmpty(editor.getJSON()))),
  });

  return (
    <div className="rounded-md border focus-within:ring-3 focus-within:ring-ring/50">
      <input type="hidden" name={name} value={json} />
      {editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}

/** Drops the empty paragraphs the editor keeps at the end for cursor placement. */
function withoutTrailingEmpty(doc: JSONContent): JSONContent {
  const content = [...(doc.content ?? [])];
  while (content.length > 1 && content.at(-1)?.type === "paragraph" && !content.at(-1)?.content?.length) {
    content.pop();
  }
  return { ...doc, content };
}

function Toolbar({ editor }: { editor: Editor }) {
  // Re-render the toolbar when the selection's formatting changes.
  const active = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      heading: editor.isActive("heading", { level: 3 }),
      subheading: editor.isActive("heading", { level: 4 }),
      bulletList: editor.isActive("bulletList"),
      orderedList: editor.isActive("orderedList"),
      blockquote: editor.isActive("blockquote"),
    }),
  });
  const chain = () => editor.chain().focus();
  const buttons: { label: string; text: string; active: boolean; run: () => void }[] = [
    { label: "Bold", text: "B", active: active.bold, run: () => chain().toggleBold().run() },
    { label: "Italic", text: "I", active: active.italic, run: () => chain().toggleItalic().run() },
    {
      label: "Heading",
      text: "H",
      active: active.heading,
      run: () => chain().toggleHeading({ level: 3 }).run(),
    },
    {
      label: "Subheading",
      text: "h",
      active: active.subheading,
      run: () => chain().toggleHeading({ level: 4 }).run(),
    },
    {
      label: "Bullet list",
      text: "•",
      active: active.bulletList,
      run: () => chain().toggleBulletList().run(),
    },
    {
      label: "Numbered list",
      text: "1.",
      active: active.orderedList,
      run: () => chain().toggleOrderedList().run(),
    },
    { label: "Quote", text: "❝", active: active.blockquote, run: () => chain().toggleBlockquote().run() },
  ];

  return (
    <div role="toolbar" aria-label="Formatting" className="flex flex-wrap gap-1 border-b px-2 py-1">
      {buttons.map((b) => (
        <button
          key={b.label}
          type="button"
          aria-label={b.label}
          aria-pressed={b.active}
          // Keep focus (and the selection) in the editor; otherwise the next keystroke can be lost.
          onMouseDown={(e) => e.preventDefault()}
          onClick={b.run}
          className={cn(
            "min-w-8 rounded px-2 py-1 text-sm hover:bg-muted",
            b.active && "bg-muted font-semibold",
          )}
        >
          {b.text}
        </button>
      ))}
    </div>
  );
}
