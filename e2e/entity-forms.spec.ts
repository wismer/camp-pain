import { expect, test, type Page } from "@playwright/test";

// Next 16 keeps recently visited routes mounted but hidden, so locate by role (which skips
// hidden elements) rather than by label.
const main = (page: Page) => page.getByRole("main");

test("create a region, add a room inside it, edit and delete it", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "+ New entry" }).click();
  await page.getByRole("textbox", { name: "Name" }).fill("Marsh Hollow");
  await page.getByRole("textbox", { name: "Climate" }).fill("Foggy");
  await page
    .getByRole("textbox", { name: "Description" })
    .fill("Reeds and black water.\n\nThe bells never stop.");
  await page.getByRole("button", { name: "Create" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Marsh Hollow" })).toBeVisible();
  await expect(page.getByText("The bells never stop.")).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Entities" }).getByRole("link", { name: "Marsh Hollow" }),
  ).toBeVisible();

  await main(page).getByRole("link", { name: "+ Add inside Marsh Hollow" }).click();
  await page.getByRole("combobox", { name: "Type" }).selectOption("location");
  await expect(page.getByRole("combobox", { name: "Inside" })).toHaveValue(/.+/);
  await page.getByRole("textbox", { name: "Name" }).fill("Bell Tower");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link")).toHaveText([
    "Marsh Hollow",
  ]);

  await main(page).getByRole("link", { name: "Edit" }).click();
  await page.getByRole("textbox", { name: "Name" }).fill("Sunken Bell Tower");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Sunken Bell Tower" })).toBeVisible();

  await main(page).getByRole("link", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Delete…" }).click();
  await page.getByRole("button", { name: "Yes, delete" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Marsh Hollow" })).toBeVisible();
  await expect(main(page).getByText("Sunken Bell Tower")).toHaveCount(0);
});

test("deleting an entry with things inside it shows an error", async ({ page }) => {
  await page.goto("/e/habbins-house/edit");
  // The editor mounts client-side, so its presence means the page is hydrated and clickable.
  await expect(page.getByRole("textbox", { name: "Description" })).toBeVisible();
  await page.getByRole("button", { name: "Delete…" }).click();
  await page.getByRole("button", { name: "Yes, delete" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "inside it" })).toBeVisible();
});

test("add and remove an exit", async ({ page }) => {
  await page.goto("/e/kitchen");
  const form = page.getByRole("form", { name: "Add exit" });
  await form.getByRole("textbox", { name: "Exit label" }).fill("Back door");
  await form.getByRole("combobox", { name: "Leads to" }).selectOption({ label: "Study" });
  await form.getByRole("textbox", { name: "Label from the other side" }).fill("Servants' passage");
  await form.getByRole("button", { name: "Add exit" }).click();

  await expect(main(page).getByText("Back door →")).toBeVisible();
  await main(page).getByRole("link", { name: "Study" }).click();
  await expect(main(page).getByText("Servants' passage →")).toBeVisible();

  await page.getByRole("button", { name: "Remove exit Servants' passage" }).click();
  await expect(main(page).getByText("Servants' passage →")).toHaveCount(0);
});

test("rich-text formatting survives saving and re-editing", async ({ page }) => {
  await page.goto("/e/study/edit");
  await page.getByRole("textbox", { name: "Description" }).click();
  await page.getByRole("button", { name: "Heading", exact: true }).click();
  await page.keyboard.type("The desk");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Bold" }).click();
  await page.keyboard.type("Forced open");
  await page.getByRole("button", { name: "Bold" }).click();
  await page.keyboard.type(", and recently.");
  await page.getByRole("button", { name: "Save changes" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Study", exact: true })).toBeVisible();
  await expect(main(page).getByRole("heading", { level: 3, name: "The desk" })).toBeVisible();
  await expect(main(page).locator("strong", { hasText: "Forced open" })).toBeVisible();

  // Nothing but what was typed is saved (no trailing empty paragraphs).
  await expect(main(page).locator(".prose > p")).toHaveCount(1);

  // Round trip: the editor reloads the same structure.
  await main(page).getByRole("link", { name: "Edit" }).click();
  const editor = page.getByRole("textbox", { name: "Description" });
  await expect(editor.getByRole("heading", { level: 3, name: "The desk" })).toBeVisible();
  await expect(editor.locator("strong", { hasText: "Forced open" })).toBeVisible();
});

test("mention an entry with @, narrowed by type", async ({ page }) => {
  await page.goto("/e/hallway/edit");
  const editor = page.getByRole("textbox", { name: "Description" });
  await editor.click();
  await page.keyboard.type("Someone waits: @char/cas");

  const suggestions = page.getByRole("listbox", { name: "Mention suggestions" });
  await expect(suggestions.getByRole("option")).toHaveText(["Investigator CastorCharacter"]);
  await page.keyboard.press("Enter");
  await expect(suggestions).toHaveCount(0);
  await page.keyboard.type("and @kit");
  await page.keyboard.press("ArrowDown"); // wraps within a single match
  await page.keyboard.press("Enter");
  await expect(editor.locator('[data-type="mention"]')).toHaveText(["Investigator Castor", "Kitchen"]);

  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Hallway", exact: true })).toBeVisible();
  await expect(main(page).locator('[data-type="mention"]')).toHaveText(["Investigator Castor", "Kitchen"]);
});
