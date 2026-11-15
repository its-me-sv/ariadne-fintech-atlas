import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Rules from "../../src/views/Rules";
import { useAtlas } from "../../src/data/store";
import { loadAtlas, loaded } from "./atlas";

const registry = () => screen.getByRole("table");
const rowCount = () => within(registry()).getAllByRole("row").length - 1; // minus the header row
const matchLine = () => screen.getByText(/instruments match\.$/);

function renderRules() {
  const user = userEvent.setup();
  render(<Rules />);
  return user;
}

describe("Rules registry filters", () => {
  beforeEach(async () => { await loadAtlas(); });

  it("shows every rule and says so", () => {
    renderRules();
    const total = loaded().core.rules.length;
    expect(rowCount()).toBe(total);
    expect(matchLine()).toHaveTextContent(`${total} of ${total} instruments match.`);
  });

  it("filters by jurisdiction", async () => {
    const user = renderRules();
    await user.selectOptions(screen.getByRole("combobox", { name: "Jurisdiction" }), "SG");
    const expected = loaded().core.rules.filter((r) => (r.jurisdictions ?? []).includes("SG")).length;
    expect(expected).toBeGreaterThan(0);
    expect(rowCount()).toBe(expected);
  });

  it("filters by text across name, issuer and id, ignoring case", async () => {
    const user = renderRules();
    await user.type(screen.getByRole("searchbox", { name: "Filter rules" }), "psd2");
    const expected = loaded().core.rules.filter((r) => `${r.canonicalName} ${r.issuer ?? ""} ${r.id} ${r.applicability ?? ""}`.toLowerCase().includes("psd2")).length;
    expect(rowCount()).toBe(expected);
  });

  it("combines filters, and shows an empty table when nothing matches", async () => {
    const user = renderRules();
    await user.selectOptions(screen.getByRole("combobox", { name: "Jurisdiction" }), "IN");
    const afterJur = rowCount();
    await user.selectOptions(screen.getByRole("combobox", { name: "Binding level" }), "Binding law");
    expect(rowCount()).toBeLessThanOrEqual(afterJur);
    await user.type(screen.getByRole("searchbox", { name: "Filter rules" }), "zzzz-no-such-rule");
    expect(rowCount()).toBe(0);
    expect(matchLine()).toHaveTextContent(`0 of ${loaded().core.rules.length} instruments match.`);
  });

  it("filters by status and by instrument type", async () => {
    const user = renderRules();
    const { rules } = loaded().core;
    await user.selectOptions(screen.getByRole("combobox", { name: "Status" }), "in_force");
    expect(rowCount()).toBe(rules.filter((r) => (r.effectiveStatus ?? "unknown") === "in_force").length);
    await user.selectOptions(screen.getByRole("combobox", { name: "Status" }), "all");
    await user.selectOptions(screen.getByRole("combobox", { name: "Instrument type" }), "legislation");
    expect(rowCount()).toBe(rules.filter((r) => (r.instrumentType ?? "rule") === "legislation").length);
  });

  it("opens a rule in the detail panel from the table", async () => {
    const user = renderRules();
    const first = within(registry()).getAllByRole("button")[0];
    await user.click(first);
    const selected = useAtlas.getState().selected;
    expect(loaded().idx.rule.get(selected ?? "")?.canonicalName).toBe(first.textContent);
  });
});
