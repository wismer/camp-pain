import { createDb } from "../src/db/client";

// Seed data (Konigsberg, Habbins House, Investigator Castor) arrives in slice 1.2.
const db = createDb();
console.log("Nothing to seed yet.");
db.$client.close();
