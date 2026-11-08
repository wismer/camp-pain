import { createDb } from "../src/db/client";
import { rebuildAllLinks } from "../src/db/links";
import { runMigrations } from "../src/db/migrate";

async function main() {
  const db = createDb();
  if (runMigrations(db)) {
    // Links are derived from descriptions; rebuilding keeps them right after schema changes.
    await rebuildAllLinks(db);
    console.log("Migrations applied; links rebuilt.");
  } else {
    console.log("No migrations to apply yet.");
  }
  db.$client.close();
}

main();
