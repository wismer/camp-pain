import { expect, test } from "@playwright/test";

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

test("entries without hidden layers have no hidden details section", async ({ page }) => {
  await page.goto("/e/konigsberg");
  await expect(page.getByRole("heading", { level: 1, name: "Konigsberg" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Hidden details" })).toHaveCount(0);
});
