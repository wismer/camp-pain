import { describe, expect, it } from "vitest";
import {
  filterMentionTargets,
  mentionedIds,
  refreshMentionLabels,
  unlinkMention,
  type MentionTarget,
} from "./mentions";

const targets: MentionTarget[] = [
  { id: "1", name: "Investigator Castor", type: "character" },
  { id: "2", name: "Castor's Office", type: "location" },
  { id: "3", name: "Konigsberg", type: "region" },
  { id: "4", name: "Kitchen", type: "location" },
];
const names = (q: string) => filterMentionTargets(targets, q).map((t) => t.name);

describe("filterMentionTargets", () => {
  it("ranks name prefixes before word prefixes, case-insensitively", () => {
    expect(names("cas")).toEqual(["Castor's Office", "Investigator Castor"]);
    expect(names("K")).toEqual(["Kitchen", "Konigsberg"]);
  });

  it("narrows by type prefix", () => {
    expect(names("char/cas")).toEqual(["Investigator Castor"]);
    expect(names("loc/")).toEqual(["Castor's Office", "Kitchen"]);
    expect(names("LOC/kit")).toEqual(["Kitchen"]);
  });

  it("treats an unknown prefix as part of the search", () => {
    expect(names("npc/cas")).toEqual([]);
  });

  it("returns everything for an empty query, up to the limit", () => {
    expect(filterMentionTargets(targets, "", 2)).toHaveLength(2);
  });
});

describe("refreshMentionLabels", () => {
  it("updates labels of nested mentions and keeps unknown ones", () => {
    const doc = {
      type: "doc" as const,
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Meet " },
            { type: "mention", attrs: { id: "1", label: "Castor" } },
            { type: "mention", attrs: { id: "gone", label: "Old name" } },
          ],
        },
      ],
    };
    const refreshed = refreshMentionLabels(doc, new Map([["1", "Investigator Castor"]]));
    expect(refreshed.content?.[0]).toMatchObject({
      content: [
        { type: "text", text: "Meet " },
        { attrs: { id: "1", label: "Investigator Castor" } },
        { attrs: { id: "gone", label: "Old name" } },
      ],
    });
  });
});

const docWith = (...nodes: object[]) => ({
  type: "doc" as const,
  content: [{ type: "paragraph", content: nodes as Record<string, unknown>[] }],
});

describe("mentionedIds", () => {
  it("lists distinct mentioned ids in order", () => {
    const doc = docWith(
      { type: "mention", attrs: { id: "b", label: "B" } },
      { type: "text", text: " and " },
      { type: "mention", attrs: { id: "a", label: "A" } },
      { type: "mention", attrs: { id: "b", label: "B" } },
    );
    expect(mentionedIds(doc)).toEqual(["b", "a"]);
    expect(mentionedIds({ type: "doc" })).toEqual([]);
  });
});

describe("unlinkMention", () => {
  it("replaces mentions of one entry with their label and leaves others", () => {
    const doc = docWith(
      { type: "text", text: "See " },
      { type: "mention", attrs: { id: "gone", label: "Torn Letter" } },
      { type: "text", text: " and " },
      { type: "mention", attrs: { id: "kept", label: "Castor" } },
    );
    expect(unlinkMention(doc, "gone").content?.[0].content).toEqual([
      { type: "text", text: "See " },
      { type: "text", text: "Torn Letter" },
      { type: "text", text: " and " },
      { type: "mention", attrs: { id: "kept", label: "Castor" } },
    ]);
  });

  it("drops a mention with no label rather than leaving an empty text node", () => {
    const doc = docWith({ type: "mention", attrs: { id: "gone" } });
    expect(unlinkMention(doc, "gone").content?.[0].content).toEqual([]);
  });
});
