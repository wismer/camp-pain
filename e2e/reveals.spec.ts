import { expect, test, type Page } from "@playwright/test";

test("hidden details show each layer with its check, nested under the right outcome", async ({ page }) => {
  await page.goto("/e/living-room");
  const hidden = page.getByRole("region", { name: "Hidden details" });
  await expect(hidden).toBeVisible();

  const investigation = hidden.getByRole("listitem", { name: "Investigation DC 14" });
  const onSuccess = investigation.getByRole("group", { name: "On success" }).first();
  const onFailure = investigation.getByRole("group", { name: "On failure" });
  await expect(onSuccess).toContainText("You see blood underneath one of the broken chairs.");
  await expect(onFailure).toContainText("A rat bolts from the chairs");

  // The Strength check hangs off the Investigation success, not the failure.
  const strength = onSuccess.getByRole("listitem", { name: "Strength DC 12" });
  await expect(strength).toContainText("Moving the chairs reveals a hatch down to the Cellar.");
  await expect(onFailure.getByRole("listitem", { name: "Strength DC 12" })).toHaveCount(0);

  // Mentions inside layers are live chips.
  await strength.getByRole("link", { name: "Cellar" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Cellar" })).toBeVisible();
});

test("entries without layers offer to add one", async ({ page }) => {
  await page.goto("/e/konigsberg");
  const hidden = page.getByRole("region", { name: "Hidden details" });
  await expect(hidden.getByRole("link", { name: "+ Add hidden detail" })).toBeVisible();
  await expect(hidden.getByRole("listitem")).toHaveCount(0);
});

// Paths from the "Authoring a reveal" flow in plan.md, on the kitchen.

const hidden = (page: Page) => page.getByRole("region", { name: "Hidden details" });
const layer = (page: Page, gate: string) => hidden(page).getByRole("listitem", { name: gate, exact: true });

async function fillLayer(
  page: Page,
  gate: { kind?: string; check?: string; trigger?: string; dc?: string },
  text: string,
) {
  await expect(page.getByRole("textbox", { name: "On success" })).toBeVisible(); // hydrated
  if (gate.kind) await page.getByRole("combobox", { name: "Gate" }).selectOption({ label: gate.kind });
  if (gate.check) await page.getByRole("combobox", { name: /^(Skill|Ability)$/ }).selectOption(gate.check);
  if (gate.trigger) await page.getByRole("textbox", { name: "Trigger" }).fill(gate.trigger);
  if (gate.dc !== undefined) await page.getByRole("spinbutton", { name: /^DC/ }).fill(gate.dc);
  await page.getByRole("textbox", { name: "On success" }).fill(text);
}

test("add a layer, nest deeper layers on both outcomes, edit and reorder", async ({ page }) => {
  await page.goto("/e/kitchen");
  await hidden(page).getByRole("link", { name: "+ Add hidden detail" }).click();
  await fillLayer(page, { check: "Perception", dc: "12" }, "Something scratches inside the cupboard.");
  await page.getByRole("button", { name: "Add layer" }).click();
  await expect(layer(page, "Perception DC 12")).toContainText("Something scratches inside the cupboard.");

  await layer(page, "Perception DC 12").getByRole("link", { name: "+ Deeper on success" }).click();
  await expect(page.getByText("deeper, on success of Perception DC 12")).toBeVisible();
  await fillLayer(page, { kind: "Other (free text)", trigger: "Opens the cupboard" }, "A cat leaps out.");
  await page.getByRole("button", { name: "Add layer" }).click();
  const onSuccess = layer(page, "Perception DC 12").getByRole("group", { name: "On success" });
  await expect(onSuccess.getByRole("listitem", { name: "Opens the cupboard" })).toContainText(
    "A cat leaps out.",
  );

  await layer(page, "Perception DC 12").getByRole("link", { name: "+ Deeper on failure" }).last().click();
  await fillLayer(page, { kind: "Saving throw", check: "Wisdom", dc: "10" }, "You feel watched.");
  await page.getByRole("button", { name: "Add layer" }).click();
  const onFailure = layer(page, "Perception DC 12").getByRole("group", { name: "On failure" });
  await expect(onFailure.getByRole("listitem", { name: "Wisdom save DC 10" })).toBeVisible();

  await page.getByRole("link", { name: "Edit Perception DC 12" }).click();
  await expect(page.getByRole("textbox", { name: "On success" })).toContainText("Something scratches");
  await page.getByRole("spinbutton", { name: "DC" }).fill("15");
  await page.getByRole("button", { name: "Save layer" }).click();
  await expect(layer(page, "Perception DC 15")).toBeVisible();

  await hidden(page).getByRole("link", { name: "+ Add hidden detail" }).click();
  await fillLayer(page, { check: "Insight", dc: "10" }, "The house feels recently left.");
  await page.getByRole("button", { name: "Add layer" }).click();
  const topLevel = hidden(page).locator(":scope > ul > li");
  await expect(topLevel).toHaveCount(2);
  await expect(topLevel.first()).toHaveAttribute("aria-label", "Perception DC 15");
  await page.getByRole("button", { name: "Move Insight DC 10 up" }).click();
  await expect(topLevel.first()).toHaveAttribute("aria-label", "Insight DC 10");

  // Deleting takes the deeper layers with it.
  await page.getByRole("link", { name: "Edit Perception DC 15" }).click();
  await expect(page.getByRole("textbox", { name: "On success" })).toBeVisible();
  await page.getByRole("button", { name: "Delete…" }).click();
  await expect(page.getByText("Delete Perception DC 15 and the 2 deeper layers under it?")).toBeVisible();
  await page.getByRole("button", { name: "Yes, delete" }).click();
  await expect(topLevel).toHaveCount(1);
  await expect(hidden(page).getByRole("listitem", { name: "Opens the cupboard" })).toHaveCount(0);
});

test("deleting a layer with deeper layers says how many go with it", async ({ page }) => {
  await page.goto("/e/living-room");
  await page.getByRole("link", { name: "Edit Investigation DC 14" }).click();
  await expect(page.getByRole("textbox", { name: "On success" })).toBeVisible();
  await page.getByRole("button", { name: "Delete…" }).click();
  await expect(page.getByText("Delete Investigation DC 14 and the 1 deeper layer under it?")).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("button", { name: "Delete…" })).toBeVisible();
});

test("an out-of-range DC is refused and the form keeps its input", async ({ page }) => {
  await page.goto("/e/hallway/reveals/new");
  await fillLayer(page, { check: "Stealth", dc: "45" }, "Footprints in the dust.");
  await page.getByRole("button", { name: "Add layer" }).click();
  const dc = page.getByRole("spinbutton", { name: "DC" });
  expect(await dc.evaluate((el: HTMLInputElement) => el.validity.rangeOverflow)).toBe(true);
  await expect(page.getByRole("heading", { level: 1, name: "New hidden detail" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "On success" })).toContainText("Footprints in the dust.");
});

test("a mention inside a layer shows in backlinks with the check that hides it", async ({ page }) => {
  await page.goto("/e/cellar/reveals/new");
  await fillLayer(page, { check: "Perception", dc: "11" }, "");
  await page.getByRole("textbox", { name: "On success" }).click();
  await page.keyboard.type("Fresh boot prints: @char/cas");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Add layer" }).click();
  await expect(layer(page, "Perception DC 11")).toBeVisible();

  await page.goto("/e/investigator-castor");
  const mentionedIn = page.getByRole("region", { name: "Mentioned in" });
  await expect(mentionedIn.getByRole("listitem").filter({ hasText: "Cellar" })).toContainText(
    "hidden behind Perception DC 11",
  );
});

test("a deleted entry mentioned inside a layer can be unlinked there", async ({ page }) => {
  await page.goto("/new?type=item");
  await page.getByRole("textbox", { name: "Name" }).fill("Old Key");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Old Key" })).toBeVisible();

  await page.goto("/e/study/reveals/new");
  await fillLayer(page, { check: "Investigation", dc: "13" }, "");
  await page.getByRole("textbox", { name: "On success" }).click();
  await page.keyboard.type("Taped under the desk: @old");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Add layer" }).click();
  await expect(layer(page, "Investigation DC 13").getByRole("link", { name: "Old Key" })).toBeVisible();

  await page.goto("/e/old-key/edit");
  await expect(page.getByRole("textbox", { name: "Description" })).toBeVisible();
  await page.getByRole("button", { name: "Delete…" }).click();
  await page.getByRole("button", { name: "Yes, delete" }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/e/study");
  const missing = layer(page, "Investigation DC 13").getByTitle("This entry was deleted");
  await missing.click();
  await page.getByRole("button", { name: "Unlink, keep the text" }).click();
  await expect(layer(page, "Investigation DC 13").getByTitle("This entry was deleted")).toHaveCount(0);
  await expect(layer(page, "Investigation DC 13")).toContainText("Taped under the desk: Old Key");
});
