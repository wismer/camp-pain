import { expect, test, type Page } from "@playwright/test";

// Paths from the "Mention preview" flow in plan.md.

const castorChip = (page: Page) =>
  page.getByRole("main").getByRole("link", { name: "Investigator Castor", exact: true });

test.beforeEach(async ({ page }) => {
  await page.goto("/e/living-room");
  await expect(castorChip(page)).toBeVisible();
});

test("click navigates to the mentioned entry", async ({ page }) => {
  await castorChip(page).click();
  await expect(page.getByRole("heading", { level: 1, name: "Investigator Castor" })).toBeVisible();
});

test("shift+click previews in place; Esc closes; Open navigates", async ({ page }) => {
  await castorChip(page).click({ modifiers: ["Shift"] });
  const preview = page.getByRole("dialog", { name: "Preview of Investigator Castor" });
  await expect(preview).toBeVisible();
  await expect(preview).toContainText("City investigator");
  await expect(preview).toContainText("Find out what happened to the Habbins");
  await expect(page.getByRole("heading", { level: 1, name: "Living Room" })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(preview).toHaveCount(0);

  await castorChip(page).click({ modifiers: ["Shift"] });
  await page.getByRole("link", { name: "Open Investigator Castor →" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Investigator Castor" })).toBeVisible();
});

test("clicking outside the preview closes it", async ({ page }) => {
  await castorChip(page).click({ modifiers: ["Shift"] });
  const preview = page.getByRole("dialog", { name: "Preview of Investigator Castor" });
  await expect(preview).toBeVisible();
  await page.getByRole("heading", { level: 1, name: "Living Room" }).click();
  await expect(preview).toHaveCount(0);
});

test("cmd/ctrl+click opens the entry in a new tab", async ({ page, context }) => {
  const newTab = context.waitForEvent("page");
  await castorChip(page).click({ modifiers: ["ControlOrMeta"] });
  const tab = await newTab;
  await expect(tab).toHaveURL(/\/e\/investigator-castor$/);
  await expect(page.getByRole("heading", { level: 1, name: "Living Room" })).toBeVisible();
});

test("a mention of a deleted entry shows as missing", async ({ page }) => {
  // Create an entry, mention it from the study, then delete it.
  await page.goto("/new?type=item");
  await page.getByRole("textbox", { name: "Name" }).fill("Torn Letter");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Torn Letter" })).toBeVisible();

  await page.goto("/e/kitchen/edit");
  await page.getByRole("textbox", { name: "Description" }).click();
  await page.keyboard.type("A clue: @torn");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("main").getByRole("link", { name: "Torn Letter" })).toBeVisible();

  await page.goto("/e/torn-letter/edit");
  await expect(page.getByRole("textbox", { name: "Description" })).toBeVisible();
  await page.getByRole("button", { name: "Delete…" }).click();
  await page.getByRole("button", { name: "Yes, delete" }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/e/kitchen");
  const missing = page.getByRole("main").getByTitle("This entry was deleted");
  await expect(missing).toHaveText("Torn Letter");
  await expect(page.getByRole("main").getByRole("link", { name: "Torn Letter" })).toHaveCount(0);

  // Unlinking keeps the words but drops the chip.
  await missing.click();
  await page.getByRole("button", { name: "Unlink, keep the text" }).click();
  await expect(page.getByRole("main").getByTitle("This entry was deleted")).toHaveCount(0);
  await expect(page.getByRole("main").getByText("A clue: Torn Letter")).toBeVisible();
});

test("entries list where they are mentioned", async ({ page }) => {
  await page.goto("/e/investigator-castor");
  const mentionedIn = page.getByRole("region", { name: "Mentioned in" });
  await expect(mentionedIn.getByRole("link", { name: "Living Room" })).toBeVisible();
  await mentionedIn.getByRole("link", { name: "Living Room" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Living Room" })).toBeVisible();
});

test("renaming an entry updates its mentions everywhere", async ({ page }) => {
  await page.goto("/e/investigator-castor/edit");
  await expect(page.getByRole("textbox", { name: "Description" })).toBeVisible();
  await page.getByRole("textbox", { name: "Name" }).fill("Inspector Castor");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Inspector Castor" })).toBeVisible();

  await page.goto("/e/living-room");
  await expect(page.getByRole("main").getByRole("link", { name: "Inspector Castor", exact: true })).toBeVisible();

  // Put the name back for other tests sharing the database.
  await page.goto("/e/inspector-castor/edit");
  await expect(page.getByRole("textbox", { name: "Description" })).toBeVisible();
  await page.getByRole("textbox", { name: "Name" }).fill("Investigator Castor");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Investigator Castor" })).toBeVisible();
});
