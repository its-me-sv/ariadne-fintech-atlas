// Flow 3: open a transaction trace from the dock, check the ledger entries render and balance.
import { test, expect, data, atlasReady } from "./fixtures";
import { balance, parseCell } from "../tests/support/ledger";

const journal = data<{ journal: { scenarioId?: string; lines?: unknown[] }[] }>("core.json").journal;

test("open a trace, step through it, and check its ledger entries balance", async ({ page }) => {
  await page.goto("./#rules");
  await atlasReady(page);
  await page.getByRole("navigation", { name: "Views" }).getByRole("link", { name: "Traces" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Transaction traces" })).toBeVisible();

  await page.getByRole("navigation", { name: "Traces" }).getByRole("link", { name: /GBP to INR remittance via serial/ }).click();
  await expect(page).toHaveURL(/#trace-scn-gbp-inr-serial$/);

  // steps: the first is active, the arrow key moves it
  const steps = page.locator("ol.tr-timeline > li");
  await expect(steps).toHaveCount(5);
  await expect(steps.nth(0)).toHaveClass(/\bon\b/);
  await page.keyboard.press("ArrowDown");
  await expect(steps.nth(1)).toHaveClass(/\bon\b/);
  await expect(steps.nth(0)).not.toHaveClass(/\bon\b/);

  // ledger: one table per entry with lines, each balanced when read back from the DOM
  const ledger = page.locator("section", { has: page.getByRole("heading", { name: "Illustrative ledger entries" }) });
  await expect(ledger).toBeVisible();
  const entries = journal.filter((j) => j.scenarioId === "scn-gbp-inr-serial");
  const tables = ledger.getByRole("table");
  await expect(tables).toHaveCount(entries.filter((j) => j.lines?.length).length);
  await expect(ledger.getByText("No general ledger entry at this step.")).toHaveCount(entries.filter((j) => !j.lines?.length).length);

  for (const table of await tables.all()) {
    await expect(table.getByRole("columnheader")).toHaveText(["Account", "Debit", "Credit"]);
    const rows = await table.locator("tbody tr").evaluateAll((trs) => trs.map((tr) => [...tr.querySelectorAll("td")].map((td) => td.textContent ?? "")));
    expect(rows.length).toBeGreaterThan(0);
    const lines = rows.map(([, debit, credit]) => ({ debit: parseCell(debit), credit: parseCell(credit) }));
    expect(balance(lines).balanced, JSON.stringify(rows)).toBe(true);
  }
});

test("a rule cited by a step opens in the detail panel", async ({ page }) => {
  await page.goto("./#trace-scn-uk-fps-sip");
  await atlasReady(page);
  const firstRule = page.locator(".tr-refs button").first();
  const name = (await firstRule.textContent())?.trim() ?? "";
  await firstRule.click();
  await expect(page.getByRole("complementary", { name: `Details for ${name}` })).toBeVisible();
});
