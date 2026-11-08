"use server";

import { cookies } from "next/headers";
import { getDb } from "@/db/client";
import { endSession, startSession } from "@/db/sessions";
import { MODE_COOKIE, type Mode } from "../mode";
import { refreshAll } from "./shared";

async function setModeCookie(mode: Mode) {
  (await cookies()).set(MODE_COOKIE, mode, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
}

/** Switches mode. Asking for play without a live session is answered by the UI offering to start one. */
export async function setMode(mode: Mode): Promise<void> {
  await setModeCookie(mode);
  refreshAll();
}

export async function startSessionAndPlay(): Promise<void> {
  await startSession(getDb());
  await setModeCookie("play");
  refreshAll();
}

export async function endSessionAndPrep(): Promise<void> {
  await endSession(getDb());
  await setModeCookie("prep");
  refreshAll();
}
