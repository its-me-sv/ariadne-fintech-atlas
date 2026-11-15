import { describe, it, expect, beforeEach } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DetailPanel } from "../../src/ui/DetailPanel";
import { useAtlas } from "../../src/data/store";
import { loadAtlas, loaded } from "./atlas";

function renderSelected(id: string) {
  const user = userEvent.setup();
  render(<><input aria-label="Some input" /><DetailPanel /></>);
  act(() => useAtlas.getState().select(id));
  return user;
}

describe("DetailPanel for a system", () => {
  beforeEach(async () => { await loadAtlas(); });

  it("renders nothing when nothing is selected", () => {
    render(<DetailPanel />);
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });

  it("shows the system's name, type, status, jurisdiction and purpose", () => {
    renderSelected("in-upi");
    const node = loaded().idx.node.get("in-upi");
    if (!node) throw new Error("in-upi missing");
    const panel = screen.getByRole("complementary", { name: "Details for Unified Payments Interface" });
    expect(within(panel).getByRole("heading", { level: 2 })).toHaveTextContent("Unified Payments Interface");
    expect(panel).toHaveTextContent("in-upi");
    expect(within(panel).getByText("IN")).toBeInTheDocument();
    if (node.purpose) expect(within(panel).getByText(node.purpose)).toBeInTheDocument();
  });

  it("lists sources as external links", () => {
    renderSelected("in-upi");
    const panel = screen.getByRole("complementary");
    expect(within(panel).getByText("Sources")).toBeInTheDocument();
    const external = within(panel).getAllByRole("link").filter((a) => a.getAttribute("target") === "_blank");
    expect(external.length).toBeGreaterThan(0);
    for (const a of external) {
      expect(a.getAttribute("href")).toMatch(/^https?:\/\//);
      expect(a).toHaveAttribute("rel", "noreferrer");
    }
  });

  it("follows a linked rule to the rule's own panel", async () => {
    const user = renderSelected("in-upi");
    const rules = loaded().idx.rulesByNode.get("in-upi") ?? [];
    expect(rules.length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: rules[0].canonicalName }));
    expect(screen.getByRole("complementary", { name: `Details for ${rules[0].canonicalName}` })).toBeInTheDocument();
  });

  it("closes with the close button", async () => {
    const user = renderSelected("in-upi");
    await user.click(screen.getByRole("button", { name: "Close details" }));
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });

  it("closes on Escape, but not while typing in an input", async () => {
    const user = renderSelected("in-upi");
    await user.click(screen.getByRole("textbox", { name: "Some input" }));
    await user.keyboard("{Escape}");
    expect(screen.getByRole("complementary")).toBeInTheDocument();
    await user.click(screen.getByRole("heading", { level: 2 }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });
});

describe("DetailPanel for a rule", () => {
  beforeEach(async () => { await loadAtlas(); });

  it("shows issuer, status, dates and the systems it applies to", () => {
    const rule = loaded().core.rules.find((r) => (r.affects?.length ?? 0) > 1 && r.issuer);
    if (!rule) throw new Error("expected a rule that affects several systems");
    renderSelected(rule.id);
    const panel = screen.getByRole("complementary", { name: `Details for ${rule.canonicalName}` });
    expect(panel).toHaveTextContent(`Issued by ${rule.issuer}`);
    expect(within(panel).getByText("Effective")).toBeInTheDocument();
    expect(within(panel).getByText("Applies to")).toBeInTheDocument();
    const affected = (rule.affects ?? []).map((id) => loaded().idx.node.get(id)?.canonicalName);
    for (const name of affected) if (name) expect(within(panel).getByRole("button", { name })).toBeInTheDocument();
  });
});
