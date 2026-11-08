import { expect, test, type Page } from "@playwright/test";

// Paths from the "Starting and ending play" flow in plan.md.

const mode = (page: Page) => page.getByRole("radiogroup", { name: "Mode" });
const radio = (page: Page, name: "Prep" | "Play") => mode(page).getByRole("radio", { name });
const startOffer = (page: Page) => page.getByRole("group", { name: "Start a session" });

test("start a session, switch modes, and end it", async ({ page }) => {
  await page.goto("/");
  await expect(radio(page, "Prep")).toHaveAttribute("aria-checked", "true");

  // Play without a live session offers to start one; Cancel stays in prep. Retry until hydrated.
  await expect(async () => {
    await radio(page, "Play").click();
    await expect(startOffer(page)).toBeVisible({ timeout: 1000 });
  }).toPass();
  await startOffer(page).getByRole("button", { name: "Cancel" }).click();
  await expect(startOffer(page)).toHaveCount(0);
  await expect(radio(page, "Prep")).toHaveAttribute("aria-checked", "true");

  await radio(page, "Play").click();
  const start = startOffer(page).getByRole("button", { name: /^Start session \d+$/ });
  const number = (await start.textContent())!.match(/\d+/)![0];
  await start.click();
  await expect(radio(page, "Play")).toHaveAttribute("aria-checked", "true");
  const live = page.getByRole("link", { name: `Session ${number} · live` });
  await expect(live).toBeVisible();

  // Switching modes while live doesn't end the session or ask again.
  await radio(page, "Prep").click();
  await expect(radio(page, "Prep")).toHaveAttribute("aria-checked", "true");
  await expect(live).toBeVisible();
  await radio(page, "Play").click();
  await expect(radio(page, "Play")).toHaveAttribute("aria-checked", "true");
  await expect(startOffer(page)).toHaveCount(0);

  // The mode survives a reload (cookie).
  await page.reload();
  await expect(radio(page, "Play")).toHaveAttribute("aria-checked", "true");

  await live.click();
  await expect(page.getByRole("heading", { level: 1, name: `Session ${number}` })).toBeVisible();
  await expect(page.getByRole("list", { name: "Session log" })).toContainText("Session started");

  await page.getByRole("button", { name: "End session" }).click();
  await expect(radio(page, "Prep")).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("link", { name: /· live$/ })).toHaveCount(0);
  await expect(page.getByRole("list", { name: "Session log" })).toContainText("Session ended");

  await page.getByRole("link", { name: "Sessions", exact: true }).click();
  await expect(
    page.getByRole("list", { name: "Sessions" }).getByRole("link", { name: `Session ${number}` }),
  ).toBeVisible();
});
