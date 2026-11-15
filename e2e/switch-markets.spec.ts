// Flow 4: switch markets from the top bar and see the URL, labels, counts and city follow.
import { test, expect, data, atlasReady } from "./fixtures";

interface N { stub?: boolean; jurisdictions?: string[] }
const core = data<{ nodes: N[]; rules: { jurisdictions?: string[] }[]; scenarios: { market?: string }[] }>("core.json");
const count = (codes: string[]) => ({
  systems: core.nodes.filter((n) => !n.stub && (n.jurisdictions ?? []).some((c) => codes.includes(c))).length,
  rules: core.rules.filter((r) => (r.jurisdictions ?? []).some((c) => codes.includes(c))).length,
});

test("switching from Global to India and on to the UK", async ({ page }) => {
  await page.goto("./#overview-global");
  await atlasReady(page);
  const scope = page.getByRole("button", { name: /systems, \d+ rules mapped/ });
  await expect(scope).toContainText("Global");

  await scope.click();
  const menu = page.getByRole("menu");
  await expect(menu.getByRole("menuitem")).toHaveCount(7);
  await menu.getByRole("menuitem", { name: "India" }).click();

  const india = count(["IN"]);
  await expect(page).toHaveURL(/#overview-in$/);
  await expect(scope).toContainText("India");
  await expect(scope).toContainText(`${india.systems} systems, ${india.rules} rules mapped`);
  await expect(page.getByRole("heading", { level: 1, name: "India payment infrastructure" })).toBeAttached();
  await expect(page.getByRole("region", { name: "Transaction trace" })).toBeVisible();

  await scope.click();
  await page.getByRole("menu").getByRole("menuitem", { name: "United Kingdom" }).click();
  const uk = count(["UK", "GB"]);
  await expect(page).toHaveURL(/#overview-uk$/);
  await expect(scope).toContainText(`${uk.systems} systems, ${uk.rules} rules mapped`);
  await expect(page.getByRole("heading", { level: 1, name: "United Kingdom payment infrastructure" })).toBeAttached();
});

test("the traces page filters by market", async ({ page }) => {
  await page.goto("./#traces");
  await atlasReady(page);
  const list = page.getByRole("navigation", { name: "Traces" });
  await expect(list.getByRole("link")).toHaveCount(core.scenarios.length);
  await list.getByTitle("Singapore").click();
  await expect(list.getByTitle("Singapore")).toHaveAttribute("aria-pressed", "true");
  await expect(list.getByRole("link")).toHaveCount(core.scenarios.filter((s) => s.market === "SG").length);
});
