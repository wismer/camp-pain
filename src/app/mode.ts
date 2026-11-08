import { cookies } from "next/headers";
import type { Db } from "@/db/client";
import { getLiveSession } from "@/db/sessions";

export const MODE_COOKIE = "codex-mode";
export type Mode = "prep" | "play";

/** Play mode only counts while a session is live; otherwise everything renders as prep. */
export async function getMode(db: Db): Promise<Mode> {
  const wanted = (await cookies()).get(MODE_COOKIE)?.value;
  return wanted === "play" && (await getLiveSession(db)) ? "play" : "prep";
}
