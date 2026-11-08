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

test("add a layer and edit it", async ({ page }) => {
  await page.goto("/e/kitchen");
  await hidden(page).getByRole("link", { name: "+ Add hidden detail" }).click();
  await fillLayer(page, { check: "Perception", dc: "12" }, "Something scratches inside the cupboard.");
  await page.getByRole("button", { name: "Add layer" }).click();
  await expect(layer(page, "Perception DC 12")).toContainText("Something scratches inside the cupboard.");

  await page.getByRole("link", { name: "Edit Perception DC 12" }).click();
  await expect(page.getByRole("textbox", { name: "On success" })).toContainText("Something scratches");
  await page.getByRole("spinbutton", { name: "DC" }).fill("15");
  await page.getByRole("button", { name: "Save layer" }).click();
  await expect(layer(page, "Perception DC 15")).toBeVisible();
});

test("a free-text gate needs no DC", async ({ page }) => {
  await page.goto("/e/study/reveals/new");
  await fillLayer(page, { kind: "Other (free text)", trigger: "Opens the desk drawer" }, "A torn map.");
  await page.getByRole("button", { name: "Add layer" }).click();
  await expect(layer(page, "Opens the desk drawer")).toContainText("A torn map.");
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
