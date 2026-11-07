import { createDb } from "../src/db/client";
import { createEntity, listEntities } from "../src/db/entities";
import { runMigrations } from "../src/db/migrate";
import { textToDoc } from "../src/lib/entities";

// Sample data for development. Only runs against an empty database so it can't
// mix into a real campaign.
async function main() {
  const db = createDb();
  runMigrations(db);

  if ((await listEntities(db)).length > 0) {
    console.log("Database already has entities; not seeding.");
    db.$client.close();
    return;
  }

  const konigsberg = await createEntity(db, {
    type: "region",
    name: "Konigsberg",
    summary: "A rain-soaked river city of bridges, guildhalls and old debts.",
    attributes: { climate: "Cold, wet autumns", government: "Merchant council" },
  });
  const estate = await createEntity(db, {
    type: "place",
    name: "Habbin Estate",
    summary: "A walled estate on the city's north bank, long past its prime.",
    parentId: konigsberg.id,
    attributes: { kind: "Estate" },
  });
  const house = await createEntity(db, {
    type: "place",
    name: "Habbins House",
    summary: "The Habbin family home, abandoned after the family vanished.",
    parentId: estate.id,
    attributes: { kind: "House" },
  });
  await createEntity(db, {
    type: "location",
    name: "Living Room",
    summary: "Decrepit, reeking of mildew; Castor waits here.",
    parentId: house.id,
    body: textToDoc(
      "The room is decrepit; it stinks of mildew and rotted food. Though there is furniture, " +
        "most of it is rotted wood, all thrown in a strange disarray. Investigator Castor is " +
        "there waiting for you.",
    ),
  });
  await createEntity(db, {
    type: "character",
    name: "Investigator Castor",
    summary: "A tired city investigator who has seen too many empty houses.",
    attributes: {
      role: "City investigator",
      motivations: ["Find out what happened to the Habbins", "Stay in the merchant council's good graces"],
    },
  });

  console.log(`Seeded ${(await listEntities(db)).length} entities.`);
  db.$client.close();
}

main();
