// Flow 5: shared links open the right place, survive a reload, and work with Back.
import { test, expect, atlasReady } from "./fixtures";

test("a trace link opens that trace directly and survives a reload", async ({ page }) => {
  await page.goto("./#trace-scn-uk-fps-sip");
  await atlasReady(page);
  const title = page.getByRole("heading", { level: 2 }).first();
  await expect(title).toContainText("FPS Single Immediate Payment");
  await page.reload();
  await atlasReady(page);
  await expect(title).toContainText("FPS Single Immediate Payment");
});

test("a system link opens its city with the detail panel", async ({ page }) => {
  await page.goto("./#node-in-upi");
  await expect(page).toHaveURL(/#overview-in$/);
  await atlasReady(page);
  await expect(page.getByRole("complementary", { name: "Details for Unified Payments Interface" })).toBeVisible();
  await expect(page.getByRole("button", { name: /systems, \d+ rules mapped/ })).toContainText("India");
});

test("a market link sets the market, and Back returns to the previous page", async ({ page }) => {
  await page.goto("./#rules");
  await atlasReady(page);
  await page.goto("./#graph-sg");
  await atlasReady(page);
  await expect(page.getByRole("button", { name: /systems, \d+ rules mapped/ })).toContainText("Singapore");
  await page.goBack();
  await expect(page).toHaveURL(/#rules$/);
  await expect(page.getByRole("heading", { level: 1, name: "Standards and rules" })).toBeVisible();
});

test("an unknown link falls back to the home page", async ({ page }) => {
  await page.goto("./#no-such-page");
  await expect(page.getByRole("heading", { level: 1, name: "Ariadne" })).toBeVisible();
});
