// App-level states that do not need WebGL: loading errors and the page router.
// The 3D overview is covered by the Playwright suite; here we only route to views without a canvas.
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "../../src/App";
import { stubAtlasFetch } from "./atlas";

function openApp(hash: string) {
  history.replaceState(null, "", hash);
  return render(<App />);
}

describe("App data loading", () => {
  it("explains how to generate the data when the dev server answers with HTML", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<!doctype html>", { headers: { "content-type": "text/html" } })));
    openApp("#rules");
    expect(await screen.findByRole("heading", { name: "Data unavailable" })).toBeInTheDocument();
    expect(screen.getByText(/Run npm run data/)).toBeInTheDocument();
  });

  it("reports the HTTP status when the data request fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 503 })));
    openApp("#rules");
    expect(await screen.findByText(/core\.json returned 503/)).toBeInTheDocument();
  });

  it("renders the routed view once data loads", async () => {
    stubAtlasFetch();
    openApp("#rules");
    expect(await screen.findByRole("heading", { level: 1, name: "Standards and rules" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Search the atlas" })).toBeInTheDocument();
  });

  it("opens a trace from a deep link", async () => {
    stubAtlasFetch();
    openApp("#trace-scn-gbp-inr-serial");
    expect(await screen.findByRole("heading", { level: 2, name: /GBP to INR remittance via serial correspondent/ })).toBeInTheDocument();
  });
});
