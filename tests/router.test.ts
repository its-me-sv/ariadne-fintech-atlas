import { describe, it, expect } from "vitest";
import { parseHash, href } from "../src/router";

describe("hash routes", () => {
  it("parses plain tokens", () => {
    expect(parseHash("#overview-in")).toEqual({ view: "overview", param: "in" });
    expect(parseHash("#graph-uk")).toEqual({ view: "graph", param: "uk" });
    expect(parseHash("#trace-scn-uk-fps-sip")).toEqual({ view: "traces", param: "scn-uk-fps-sip" });
    expect(parseHash("#rules")).toEqual({ view: "rules", param: null });
    expect(parseHash("#node-in-upi")).toEqual({ view: "node", param: "in-upi" });
  });
  it("falls back to the India overview", () => {
    expect(parseHash("")).toEqual({ view: "overview", param: "in" });
    expect(parseHash("#nonsense")).toEqual({ view: "overview", param: "in" });
  });
  it("only produces tokens the artifact host passes through", () => {
    for (const h of [href("traces", "scn-in-erupee-cbdc-qr-vs-upi-qr"), href("overview", "eu"), href("module", "cbdc"), href("blueprint", "neobank")])
      expect(h).toMatch(/^#[A-Za-z0-9._~-]+$/);
  });
});
