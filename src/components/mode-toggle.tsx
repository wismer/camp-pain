"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { endSessionAndPrep, setMode, startSessionAndPlay } from "@/app/actions/sessions";
import type { Mode } from "@/app/mode";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = { mode: Mode; liveSession: number | null; nextSession: number };

/** Prep | Play switch. Play needs a live session, so choosing it without one offers to start one. */
export function ModeToggle({ mode, liveSession, nextSession }: Props) {
  const [pending, startTransition] = useTransition();
  const [offeringStart, setOfferingStart] = useState(false);
  const run = (action: () => Promise<void>) => startTransition(action);

  const choose = (next: Mode) => {
    if (next === mode) return;
    if (next === "play" && liveSession === null) return setOfferingStart(true);
    run(() => setMode(next));
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        role="radiogroup"
        aria-label="Mode"
        className="grid grid-cols-2 rounded-md border bg-background p-0.5 text-sm"
      >
        {(["prep", "play"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            disabled={pending}
            onClick={() => choose(m)}
            className={cn(
              "rounded px-2 py-1 capitalize text-muted-foreground",
              mode === m && "bg-foreground font-medium text-background",
            )}
          >
            {m}
          </button>
        ))}
      </div>

      {offeringStart && liveSession === null && (
        <div
          role="group"
          aria-label="Start a session"
          className="flex flex-col gap-2 rounded-md border bg-background p-2 text-sm"
        >
          <span>Play needs a live session.</span>
          <div className="flex gap-2">
            <Button size="sm" disabled={pending} onClick={() => run(startSessionAndPlay)}>
              Start session {nextSession}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOfferingStart(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {liveSession !== null && (
        <div className="flex items-center justify-between gap-2 text-xs">
          <Link href={`/sessions/${liveSession}`} className="font-medium text-foreground hover:underline">
            Session {liveSession} · live
          </Link>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(endSessionAndPrep)}
            className="text-muted-foreground hover:text-foreground hover:underline"
          >
            End session
          </button>
        </div>
      )}
    </div>
  );
}
