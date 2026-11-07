import { createDb, type Db } from "@/db/client";
import { runMigrations } from "@/db/migrate";

/** Fresh in-memory database with all migrations applied. */
export function testDb(): Db {
  const db = createDb(":memory:");
  runMigrations(db);
  return db;
}
