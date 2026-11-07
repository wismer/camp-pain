import { createDb } from "../src/db/client";
import { runMigrations } from "../src/db/migrate";

const db = createDb();
console.log(runMigrations(db) ? "Migrations applied." : "No migrations to apply yet.");
db.$client.close();
