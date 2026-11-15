// Flow 2: search for a system by its short code, open its detail panel, close it.
import { test, expect, atlasReady } from "./fixtures";

test("search UPI with the keyboard and open the system's detail", async ({ page }) => {
  await page.goto("./#rules");
  await atlasReady(page);

  await page.keyboard.press("/");
  const search = page.getByRole("searchbox", { name: "Search the atlas" });
  await expect(search).toBeFocused();
  await search.fill("UPI");

  const options = page.getByRole("listbox").getByRole("option");
  await expect(options.first()).toContainText("Unified Payments Interface");
  await expect(options.first()).toHaveAttribute("aria-selected", "true");
  await search.press("Enter");

  const panel = page.getByRole("complementary", { name: "Details for Unified Payments Interface" });
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("heading", { level: 2 })).toHaveText("Unified Payments Interface");
  // evidence.json loads after first paint; the sources list appears once it arrives
  // the heading renders as "Sources" + a count badge, so its text is e.g. "Sources8"
  await expect(panel.getByText(/^Sources\d+$/)).toBeVisible();
  await expect(panel.locator('a[target="_blank"]').first()).toHaveAttribute("href", /^https?:\/\//);
  await expect(search).toHaveValue("");

  await panel.getByRole("heading", { level: 2 }).click();
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
});

test("a search hit for a trace opens that trace", async ({ page }) => {
  await page.goto("./#rules");
  await atlasReady(page);
  const search = page.getByRole("searchbox", { name: "Search the atlas" });
  await search.fill("GBP to INR remittance via serial");
  await page.getByRole("option").filter({ hasText: "Transaction trace" }).first().click();
  await expect(page).toHaveURL(/#trace-scn-gbp-inr-serial$/);
  await expect(page.getByRole("heading", { level: 2 })).toContainText("GBP to INR remittance via serial correspondent");
});
