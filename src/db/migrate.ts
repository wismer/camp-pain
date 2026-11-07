import fs from "node:fs";
import path from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import type { Db } from "./client";

export const MIGRATIONS_DIR = path.join(process.cwd(), "drizzle");

/** Applies pending migrations. Returns false when no migrations have been generated yet. */
export function runMigrations(db: Db, migrationsFolder: string = MIGRATIONS_DIR): boolean {
  if (!fs.existsSync(path.join(migrationsFolder, "meta", "_journal.json"))) {
    return false;
  }
  migrate(db, { migrationsFolder });
  return true;
}
