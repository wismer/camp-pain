import { createDb } from "../src/db/client";
import { createConnection } from "../src/db/connections";
import { createEntity, listEntities } from "../src/db/entities";
import { runMigrations } from "../src/db/migrate";
import { createReveal } from "../src/db/reveals";
import type { Doc } from "../src/lib/entities";

/** A one-paragraph doc from text and mentions. */
function paragraph(...parts: (string | { id: string; name: string })[]): Doc {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: parts.map((p) =>
          typeof p === "string"
            ? { type: "text", text: p }
            : { type: "mention", attrs: { id: p.id, label: p.name } },
        ),
      },
    ],
  };
}

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

  const castor = await createEntity(db, {
    type: "character",
    name: "Investigator Castor",
    summary: "A tired city investigator who has seen too many empty houses.",
    attributes: {
      role: "City investigator",
      motivations: ["Find out what happened to the Habbins", "Stay in the merchant council's good graces"],
    },
  });
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
  const livingRoom = await createEntity(db, {
    type: "location",
    name: "Living Room",
    summary: "Decrepit, reeking of mildew; Castor waits here.",
    parentId: house.id,
    body: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text:
                "The room is decrepit; it stinks of mildew and rotted food. Though there is furniture, " +
                "most of it is rotted wood, all thrown in a strange disarray. ",
            },
            { type: "mention", attrs: { id: castor.id, label: castor.name } },
            { type: "text", text: " is there waiting for you." },
          ],
        },
      ],
    },
  });
  const room = (name: string, summary: string) =>
    createEntity(db, { type: "location", name, summary, parentId: house.id });
  const kitchen = await room("Kitchen", "Rotten food on every surface; flies thick in the air.");
  const study = await room("Study", "Shelves stripped bare; a desk with its drawers forced.");
  const hallway = await room("Hallway", "Narrow and dark; the front door hangs off one hinge.");

  const cellar = await room("Cellar", "Low, damp and recently disturbed.");

  // What a careful search of the living room turns up.
  const blood = await createReveal(db, {
    entityId: livingRoom.id,
    checkKind: "skill",
    check: "Investigation",
    dc: 14,
    successBody: paragraph("You see blood underneath one of the broken chairs."),
    failureBody: paragraph("A rat bolts from the chairs; you're sure nothing's there."),
  });
  const moveChairs = await createReveal(db, {
    entityId: livingRoom.id,
    parentId: blood.id,
    branch: "success",
    checkKind: "ability",
    check: "Strength",
    dc: 12,
    successBody: paragraph("Moving the chairs reveals a hatch down to the ", cellar, "."),
  });

  // The hatch only appears once the chairs are moved.
  await createConnection(db, {
    fromId: livingRoom.id,
    toId: cellar.id,
    label: "Hatch",
    reverseLabel: "Ladder up",
    revealId: moveChairs.id,
  });

  // The living room's three doorways.
  await createConnection(db, {
    fromId: livingRoom.id,
    toId: kitchen.id,
    label: "East doorway",
    reverseLabel: "West doorway",
  });
  await createConnection(db, {
    fromId: livingRoom.id,
    toId: study.id,
    label: "North doorway",
    reverseLabel: "South doorway",
  });
  await createConnection(db, {
    fromId: livingRoom.id,
    toId: hallway.id,
    label: "South doorway",
    reverseLabel: "Living room door",
  });
  await createConnection(db, {
    fromId: hallway.id,
    toId: konigsberg.id,
    label: "Front door",
    reverseLabel: "Habbins House",
  });

  console.log(`Seeded ${(await listEntities(db)).length} entities.`);
  db.$client.close();
}

main();
