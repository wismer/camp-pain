import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

export type Db = BetterSQLite3Database<typeof schema> & { $client: Database.Database };

export const DEFAULT_DB_PATH = path.join(process.cwd(), "data", "codex.db");

export function createDb(filename: string = process.env.CODEX_DB_PATH ?? DEFAULT_DB_PATH): Db {
  if (filename !== ":memory:") {
    fs.mkdirSync(path.dirname(filename), { recursive: true });
  }
  const sqlite = new Database(filename);
  // SQLite leaves foreign keys off by default; Postgres always enforces them.
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("journal_mode = WAL");
  return drizzle(sqlite, { schema });
}

// Reuse one connection across dev-server hot reloads.
const globalForDb = globalThis as unknown as { codexDb?: Db };

export function getDb(): Db {
  globalForDb.codexDb ??= createDb();
  return globalForDb.codexDb;
}
