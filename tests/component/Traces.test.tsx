import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Traces from "../../src/views/Traces";
import { useAtlas } from "../../src/data/store";
import { has3dView } from "../../src/views/traceFilter";
import { balance, parseCell } from "../support/ledger";
import { loadAtlas, loaded } from "./atlas";

const list = () => screen.getByRole("navigation", { name: "Traces" });
const traceLinks = () => within(list()).getAllByRole("link");
const timelineSteps = () => screen.getAllByRole("listitem").filter((li) => li.closest("ol.tr-timeline"));

function open(hash: string) {
  history.replaceState(null, "", hash);
  const user = userEvent.setup();
  render(<Traces />);
  return user;
}

describe("Traces list and filters", () => {
  beforeEach(async () => { await loadAtlas(); });

  it("lists every trace under All, with the total on the button", () => {
    open("#traces");
    const total = loaded().core.scenarios.length;
    expect(traceLinks()).toHaveLength(total);
    expect(within(list()).getByRole("button", { name: `All ${total}` })).toHaveAttribute("aria-pressed", "true");
  });

  it("opens the first trace when none is in the URL, and writes it to the URL", () => {
    open("#traces");
    const first = loaded().core.scenarios[0];
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(first.name);
    expect(location.hash).toBe(`#trace-${first.id}`);
  });

  it("narrows to one market", async () => {
    const user = open("#traces");
    const india = loaded().core.scenarios.filter((s) => (s.market ?? "GLOBAL") === "IN");
    await user.click(within(list()).getByTitle("India"));
    expect(within(list()).getByTitle("India")).toHaveAttribute("aria-pressed", "true");
    expect(traceLinks()).toHaveLength(india.length);
  });

  it("narrows to traces that have a 3D view, and combines with the market filter", async () => {
    const user = open("#traces");
    const { scenarios } = loaded().core;
    await user.click(screen.getByRole("button", { name: "Has 3D view" }));
    expect(traceLinks()).toHaveLength(scenarios.filter((s) => has3dView(s.id)).length);
    for (const link of traceLinks()) expect(within(link).getByRole("img", { name: "Has a 3D view" })).toBeInTheDocument();

    await user.click(within(list()).getByTitle("UK to India"));
    expect(screen.getByText(/No traces with a 3D view for this filter/)).toBeInTheDocument();
    expect(within(list()).queryAllByRole("link")).toHaveLength(0);
  });

  it("marks the open trace as the current page", () => {
    open("#trace-scn-uk-fps-sip");
    const current = traceLinks().filter((a) => a.getAttribute("aria-current") === "page");
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveAttribute("href", "#trace-scn-uk-fps-sip");
  });
});

describe("Trace detail", () => {
  beforeEach(async () => { await loadAtlas(); });

  it("renders every step with its actor, and the trace's sources", () => {
    open("#trace-scn-uk-fps-sip");
    const s = loaded().idx.scenario.get("scn-uk-fps-sip");
    if (!s) throw new Error("scenario missing");
    expect(timelineSteps()).toHaveLength(s.steps.length);
    expect(screen.getByText(`${s.steps.length} steps`)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sources for this trace" })).toBeInTheDocument();
  });

  it("offers Watch it in 3D only for traces that have a 3D city", () => {
    open("#trace-scn-uk-fps-sip");
    expect(screen.getByRole("link", { name: "Watch it in 3D" })).toHaveAttribute("href", "#overview-uk");
    cleanupAndOpen("#trace-scn-gbp-inr-serial");
    expect(screen.queryByRole("link", { name: "Watch it in 3D" })).not.toBeInTheDocument();
  });

  it("moves the active step with the arrow keys and j/k, and stops at the ends", async () => {
    const user = open("#trace-scn-uk-fps-sip");
    const active = () => timelineSteps().findIndex((li) => li.classList.contains("on"));
    expect(active()).toBe(0);
    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(active()).toBe(2);
    await user.keyboard("k");
    expect(active()).toBe(1);
    await user.keyboard("{ArrowUp}{ArrowUp}{ArrowUp}");
    expect(active()).toBe(0);
    for (let i = 0; i < 20; i++) await user.keyboard("j");
    expect(active()).toBe(timelineSteps().length - 1);
  });

  it("opens a rule in the detail panel from a step", async () => {
    const user = open("#trace-scn-uk-fps-sip");
    const s = loaded().idx.scenario.get("scn-uk-fps-sip");
    const ruleId = s?.steps.flatMap((st) => st.rules ?? [])[0];
    if (!ruleId) throw new Error("expected a rule on this trace");
    const name = loaded().idx.rule.get(ruleId)?.canonicalName ?? ruleId;
    await user.click(screen.getAllByRole("button", { name })[0]);
    expect(useAtlas.getState().selected).toBe(ruleId);
  });
});

describe("Ledger view", () => {
  beforeEach(async () => { await loadAtlas(); });

  const ledgerSection = () => screen.getByRole("heading", { name: "Illustrative ledger entries" }).closest("section") as HTMLElement;

  it("renders one block per journal entry, with a table or a no-entry note", () => {
    open("#trace-scn-gbp-inr-serial");
    const journal = loaded().core.journal as { scenarioId?: string; lines?: unknown[] }[];
    const entries = journal.filter((j) => j.scenarioId === "scn-gbp-inr-serial");
    const section = ledgerSection();
    expect(within(section).getAllByRole("table")).toHaveLength(entries.filter((j) => j.lines?.length).length);
    expect(within(section).getAllByText("No general ledger entry at this step.")).toHaveLength(entries.filter((j) => !j.lines?.length).length);
  });

  it("shows tables whose rendered debits equal their rendered credits", () => {
    open("#trace-scn-gbp-inr-serial");
    for (const table of within(ledgerSection()).getAllByRole("table")) {
      expect(within(table).getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Account", "Debit", "Credit"]);
      const lines = within(table).getAllByRole("row").slice(1).map((row) => {
        const [, debit, credit] = within(row).getAllByRole("cell").map((c) => parseCell(c.textContent ?? ""));
        return { debit, credit };
      });
      expect(lines.length).toBeGreaterThan(0);
      expect(balance(lines).balanced, table.textContent ?? "").toBe(true);
    }
  });

  it("is absent for traces with no journal entries", () => {
    open("#trace-scn-uk-fps-sip");
    expect(screen.queryByRole("heading", { name: "Illustrative ledger entries" })).not.toBeInTheDocument();
  });
});

function cleanupAndOpen(hash: string) {
  document.body.innerHTML = "";
  return open(hash);
}
