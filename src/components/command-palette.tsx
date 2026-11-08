"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { quickSearch } from "@/app/actions/search";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { SearchResult } from "@/db/search";
import { ENTITY_TYPE_CHIP_CLASS, ENTITY_TYPE_LABELS, entityHref } from "@/lib/entities";
import { cn } from "@/lib/utils";

/** Cmd/Ctrl+K jump-to-entry palette. Mounted once in the root layout. */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  // Results arrive after the query changes, so highlight the top one ourselves (cmdk can't).
  const [selected, setSelected] = useState("");
  const latest = useRef(0);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpenRequest = () => setOpen(true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("codex:open-palette", onOpenRequest);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("codex:open-palette", onOpenRequest);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    // Ignore responses that arrive after a newer query was sent.
    const request = ++latest.current;
    quickSearch(query).then((r) => {
      if (request !== latest.current) return;
      setResults(r);
      setSelected(r[0]?.id ?? "");
    });
  }, [open, query]);

  const go = (result: SearchResult) => {
    setOpen(false);
    setQuery("");
    router.push(entityHref(result));
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Jump to entry"
      description="Search entries by name"
    >
      {/* Results come from the server already filtered and ranked, so cmdk's own filter is off. */}
      <Command shouldFilter={false} value={selected} onValueChange={setSelected}>
        <CommandInput
          placeholder="Jump to…"
          value={query}
          onValueChange={setQuery}
          aria-label="Jump to entry"
        />
        <CommandList>
          <CommandEmpty>No matching entries.</CommandEmpty>
          <CommandGroup heading={query.trim() ? "Entries" : "Recently edited"}>
            {results.map((r) => (
              <CommandItem key={r.id} value={r.id} onSelect={() => go(r)}>
                <span className="truncate">{r.name}</span>
                {/* The shortcut slot hides CommandItem's built-in check icon, which would also claim ml-auto. */}
                <span
                  data-slot="command-shortcut"
                  className={cn("ml-auto shrink-0 rounded px-1.5 text-xs", ENTITY_TYPE_CHIP_CLASS[r.type])}
                >
                  {ENTITY_TYPE_LABELS[r.type].singular}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}

/** Opens the palette from a click, for people who don't use the shortcut. */
export function OpenPaletteButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("codex:open-palette"))}
      className="flex items-center justify-between rounded-md border bg-background px-2 py-1 text-sm text-muted-foreground hover:text-foreground"
    >
      Jump to…
      <kbd className="text-xs">⌘K</kbd>
    </button>
  );
}
