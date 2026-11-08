// Display formatting. The app runs locally, so the server's time zone is the user's.

export function formatDateTime(date: Date): string {
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** "2h 15m", "45m", "under a minute". */
export function formatDuration(from: Date, to: Date): string {
  const minutes = Math.floor((to.getTime() - from.getTime()) / 60_000);
  if (minutes < 1) return "under a minute";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h${m ? ` ${m}m` : ""}` : `${m}m`;
}
