import type { JSONContent } from "@tiptap/core";
import type { Doc, EntityType } from "../entities";

/** Type prefixes for narrowing the @ picker, e.g. "@char/cas". */
export const MENTION_PREFIXES: Record<string, EntityType> = {
  reg: "region",
  place: "place",
  loc: "location",
  char: "character",
  item: "item",
  fac: "faction",
};

export type MentionTarget = { id: string; name: string; type: EntityType };

/**
 * Entries matching an @ query. Without a prefix every type is searched; matches are names
 * starting with the query, then names with any word starting with it.
 */
export function filterMentionTargets(targets: MentionTarget[], query: string, limit = 8): MentionTarget[] {
  const slash = query.indexOf("/");
  const type = slash > 0 ? MENTION_PREFIXES[query.slice(0, slash).toLowerCase()] : undefined;
  const term = (type ? query.slice(slash + 1) : query).toLowerCase();

  const rank = (t: MentionTarget) => {
    const name = t.name.toLowerCase();
    if (name.startsWith(term)) return 0;
    return name.split(/\s+/).some((word) => word.startsWith(term)) ? 1 : -1;
  };
  return targets
    .filter((t) => !type || t.type === type)
    .map((t) => ({ t, r: rank(t) }))
    .filter(({ r }) => r >= 0)
    .sort((a, b) => a.r - b.r || a.t.name.localeCompare(b.t.name))
    .slice(0, limit)
    .map(({ t }) => t);
}

function mapMentions(node: JSONContent, fn: (attrs: Record<string, unknown>) => Record<string, unknown>): JSONContent {
  const attrs = node.type === "mention" && node.attrs ? fn(node.attrs) : node.attrs;
  return {
    ...node,
    ...(attrs ? { attrs } : {}),
    ...(node.content ? { content: node.content.map((c) => mapMentions(c, fn)) } : {}),
  };
}

/** Replaces each mention's stored label with the entry's current name, so renames show up in the editor. */
export function refreshMentionLabels(doc: Doc, names: Map<string, string>): Doc {
  return mapMentions(doc as JSONContent, (attrs) => ({
    ...attrs,
    label: names.get(String(attrs.id)) ?? attrs.label,
  })) as Doc;
}

function walk(node: JSONContent, visit: (node: JSONContent) => void) {
  visit(node);
  node.content?.forEach((child) => walk(child, visit));
}

/** Distinct ids of the entries a document mentions, in order of first appearance. */
export function mentionedIds(doc: Doc): string[] {
  const ids = new Set<string>();
  walk(doc as JSONContent, (node) => {
    if (node.type === "mention" && node.attrs?.id) ids.add(String(node.attrs.id));
  });
  return [...ids];
}

/** Turns mentions of one entry back into plain text, keeping the visible label. */
export function unlinkMention(doc: Doc, id: string): Doc {
  const unlink = (node: JSONContent): JSONContent =>
    node.type === "mention" && String(node.attrs?.id) === id
      ? { type: "text", text: String(node.attrs?.label ?? "") }
      : node.content
        ? { ...node, content: node.content.map(unlink).filter((n) => n.type !== "text" || n.text) }
        : node;
  return unlink(doc as JSONContent) as Doc;
}
