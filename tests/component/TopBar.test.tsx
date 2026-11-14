import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TopBar } from "../../src/ui/TopBar";
import { DetailPanel } from "../../src/ui/DetailPanel";
import { useAtlas, inJur } from "../../src/data/store";
import { loadAtlas } from "./atlas";

const searchBox = () => screen.getByRole("searchbox", { name: "Search the atlas" });
const scopeButton = () => screen.getByRole("button", { name: /systems, .* rules mapped/ });

function renderBar() {
  const user = userEvent.setup();
  render(<><TopBar /><DetailPanel /></>);
  return user;
}

describe("TopBar search", () => {
  beforeEach(async () => { await loadAtlas(); });

  it("waits for two characters before showing results", async () => {
    const user = renderBar();
    await user.type(searchBox(), "U");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    await user.type(searchBox(), "P");
    expect(await screen.findByRole("listbox")).toBeInTheDocument();
  });

  it("finds UPI by name and caps the list at 10 results", async () => {
    const user = renderBar();
    await user.type(searchBox(), "UPI");
    const options = within(await screen.findByRole("listbox")).getAllByRole("option");
    expect(options.length).toBeGreaterThan(0);
    expect(options.length).toBeLessThanOrEqual(10);
    expect(options.map((o) => o.textContent).join(" ")).toMatch(/Unified Payments Interface/);
  });

  it("moves the active result with the arrow keys", async () => {
    const user = renderBar();
    await user.type(searchBox(), "payments");
    const options = within(await screen.findByRole("listbox")).getAllByRole("option");
    expect(options[0]).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{ArrowDown}");
    expect(options[1]).toHaveAttribute("aria-selected", "true");
    expect(options[0]).toHaveAttribute("aria-selected", "false");
    await user.keyboard("{ArrowUp}{ArrowUp}");
    expect(options[0]).toHaveAttribute("aria-selected", "true");
  });

  it("opens the system detail panel when a system is chosen with Enter", async () => {
    const user = renderBar();
    await user.type(searchBox(), "Unified Payments Interface");
    await screen.findByRole("listbox");
    await user.keyboard("{Enter}");
    const panel = await screen.findByRole("complementary", { name: "Details for Unified Payments Interface" });
    expect(within(panel).getByRole("heading", { level: 2 })).toHaveTextContent("Unified Payments Interface");
    expect(searchBox()).toHaveValue("");
  });

  it("navigates to the trace when a transaction trace is chosen", async () => {
    const user = renderBar();
    await user.type(searchBox(), "GBP to INR remittance via serial");
    const listbox = await screen.findByRole("listbox");
    const trace = within(listbox).getAllByRole("option").find((o) => o.textContent?.includes("Transaction trace"));
    expect(trace).toBeDefined();
    await user.pointer({ keys: "[MouseLeft>]", target: trace! });
    expect(location.hash).toBe("#trace-scn-gbp-inr-serial");
  });

  it("closes the results on Escape", async () => {
    const user = renderBar();
    await user.type(searchBox(), "UPI");
    await screen.findByRole("listbox");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("focuses the search box when / is pressed", async () => {
    const user = renderBar();
    expect(searchBox()).not.toHaveFocus();
    await user.keyboard("/");
    expect(searchBox()).toHaveFocus();
  });
});

describe("TopBar market switcher", () => {
  beforeEach(async () => { await loadAtlas(); });

  const countLabel = (jur: Parameters<typeof inJur>[1]) => {
    const core = useAtlas.getState().core!;
    const nodes = core.nodes.filter((n) => !n.stub && inJur(n.jurisdictions, jur)).length;
    const rules = core.rules.filter((r) => inJur(r.jurisdictions, jur)).length;
    return `${nodes} systems, ${rules} rules mapped`;
  };

  it("lists all seven markets", async () => {
    const user = renderBar();
    await user.click(scopeButton());
    const items = within(screen.getByRole("menu")).getAllByRole("menuitem");
    expect(items.map((i) => i.textContent)).toEqual([
      "Global", "India", "United Kingdom", "United States", "EU and euro area", "Singapore", "Mainland China",
    ]);
    expect(items[0]).toHaveAttribute("aria-current", "true");
  });

  it("shows the global counts, then the India counts after switching", async () => {
    const user = renderBar();
    expect(scopeButton()).toHaveTextContent(countLabel("GLOBAL"));
    await user.click(scopeButton());
    await user.click(screen.getByRole("menuitem", { name: /India/ }));
    expect(useAtlas.getState().scope).toBe("IN");
    expect(scopeButton()).toHaveTextContent(`India${countLabel("IN")}`);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("rewrites the URL to the new market on the overview page", async () => {
    history.replaceState(null, "", "#overview-global");
    const user = renderBar();
    await user.click(scopeButton());
    await user.click(screen.getByRole("menuitem", { name: /Singapore/ }));
    expect(location.hash).toBe("#overview-sg");
  });

  it("leaves the URL alone on pages that are not market-scoped", async () => {
    history.replaceState(null, "", "#rules");
    const user = renderBar();
    await user.click(scopeButton());
    await user.click(screen.getByRole("menuitem", { name: /United States/ }));
    expect(location.hash).toBe("#rules");
    expect(useAtlas.getState().scope).toBe("US");
  });
});
