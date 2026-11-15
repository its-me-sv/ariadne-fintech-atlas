// Flow 6: on a phone the atlas shows a notice instead, and never downloads the 3D or graph code.
import { test, expect } from "./fixtures";

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test("a phone gets the notice, with no 3D or graph code requested", async ({ page }) => {
  const scripts: string[] = [];
  page.on("request", (r) => { if (r.resourceType() === "script") scripts.push(new URL(r.url()).pathname); });

  await page.goto("./#overview-in");
  await expect(page.getByRole("heading", { level: 1, name: "Ariadne works best on a laptop or PC" })).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
  await page.waitForLoadState("networkidle");

  const heavy = scripts.filter((p) => /\/assets\/(three|graph|geo|Scene|Globe|Overview|Graph)-/.test(p));
  expect(heavy, "3D or graph chunks requested on a phone").toEqual([]);
  // the app shell itself did load, so the check above is not vacuous
  expect(scripts.some((p) => /\/assets\/index-/.test(p))).toBe(true);

  await page.getByRole("link", { name: "Read about Ariadne" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Ariadne" })).toBeVisible();
});
