import { expect, test, type Page } from "@playwright/test";

const palette = (page: Page) => page.getByRole("dialog", { name: "Jump to entry" });

/** The shortcut listener attaches on hydration, so retry until the palette opens. */
async function openWithShortcut(page: Page) {
  await expect(async () => {
    if (!(await palette(page).isVisible())) await page.keyboard.press("ControlOrMeta+k");
    await expect(palette(page)).toBeVisible({ timeout: 1000 });
  }).toPass();
}

test("Cmd/Ctrl+K, a name prefix and Enter jumps to the entry", async ({ page }) => {
  await page.goto("/e/konigsberg");
  await openWithShortcut(page);

  await page.keyboard.type("kit");
  await expect(palette(page).getByRole("option")).toHaveText([/^Kitchen/]);
  await page.keyboard.press("Enter");

  await expect(page.getByRole("heading", { level: 1, name: "Kitchen" })).toBeVisible();
  await expect(palette(page)).toHaveCount(0);
});

test("matches words inside names and ranks name prefixes first", async ({ page }) => {
  await page.goto("/");
  await openWithShortcut(page);
  await page.keyboard.type("hab");
  await expect(palette(page).getByRole("option").first()).toHaveText(/^Habbin Estate/);

  await page.getByRole("combobox", { name: "Jump to entry" }).fill("castor");
  await expect(palette(page).getByRole("option").first()).toHaveText(/^Investigator Castor/);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1, name: "Investigator Castor" })).toBeVisible();
});

test("the sidebar button opens it, showing recent entries; Escape closes", async ({ page }) => {
  await page.goto("/");
  await expect(async () => {
    if (!(await palette(page).isVisible())) await page.getByRole("button", { name: "Jump to…" }).click();
    await expect(palette(page)).toBeVisible({ timeout: 1000 });
  }).toPass();
  await expect(palette(page).getByText("Recently edited")).toBeVisible();
  await expect(palette(page).getByRole("option").first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(palette(page)).toHaveCount(0);
});
