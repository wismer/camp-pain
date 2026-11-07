import { expect, test } from "@playwright/test";

test("sidebar lists seeded entities grouped by type", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Entities" });
  // Other tests add entries, so check membership rather than exact lists.
  await expect(
    nav
      .getByRole("region", { name: "Regions" })
      .getByRole("link", { name: "Konigsberg" }),
  ).toBeVisible();
  await expect(
    nav
      .getByRole("region", { name: "Characters" })
      .getByRole("link", { name: "Investigator Castor" }),
  ).toBeVisible();
});

test("navigate from a region down into a room and out through an exit", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Entities" })
    .getByRole("link", { name: "Konigsberg" })
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Konigsberg" }),
  ).toBeVisible();
  await expect(page.getByText("Merchant council")).toBeVisible();

  await page
    .getByRole("main")
    .getByRole("link", { name: "Habbin Estate" })
    .click();
  await page
    .getByRole("main")
    .getByRole("link", { name: "Habbins House" })
    .click();
  await page
    .getByRole("main")
    .getByRole("link", { name: "Living Room" })
    .click();

  await expect(
    page.getByRole("heading", { level: 1, name: "Living Room" }),
  ).toBeVisible();
  const breadcrumb = page.getByRole("navigation", { name: "Breadcrumb" });
  await expect(breadcrumb.getByRole("link")).toHaveText([
    "Konigsberg",
    "Habbin Estate",
    "Habbins House",
  ]);
  await expect(page.getByText("The room is decrepit")).toBeVisible();

  await page.getByRole("main").getByRole("link", { name: "Kitchen" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Kitchen" }),
  ).toBeVisible();
  await expect(
    page.getByRole("main").getByText("West doorway →"),
  ).toBeVisible();

  await breadcrumb.getByRole("link", { name: "Konigsberg" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Konigsberg" }),
  ).toBeVisible();
});

test("shows a character's attributes", async ({ page }) => {
  await page.goto("/e/investigator-castor");
  await expect(
    page.getByText("City investigator", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("listitem")
      .filter({ hasText: "Find out what happened to the Habbins" }),
  ).toBeVisible();
});

test("unknown slugs show not found", async ({ page }) => {
  await page.goto("/e/nowhere");
  await expect(page.getByText("404")).toBeVisible();
});
