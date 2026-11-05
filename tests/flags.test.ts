import { describe, it, expect } from "vitest";
import { flagParts, flagSrc, flagSrcSet } from "../src/ui/flags";

const isos = (code: string) => flagParts(code).map((p) => (p.kind === "flag" ? p.iso : p.kind));

describe("flag codes", () => {
  it("maps the six markets to flagcdn codes", () => {
    expect(isos("IN")).toEqual(["in"]);
    expect(isos("UK")).toEqual(["gb"]);
    expect(isos("US")).toEqual(["us"]);
    expect(isos("EU")).toEqual(["eu"]);
    expect(isos("SG")).toEqual(["sg"]);
    expect(isos("CN")).toEqual(["cn"]);
  });
  it("shows the EU flag for the euro area", () => {
    expect(isos("EA")).toEqual(["eu"]);
  });
  it("uses the globe icon for GLOBAL, not a flag", () => {
    expect(flagParts("GLOBAL")).toEqual([{ kind: "global", code: "GLOBAL", name: "Global" }]);
  });
  it("shows both flags for a combined code", () => {
    expect(isos("UK-IN")).toEqual(["gb", "in"]);
    expect(flagParts("UK-IN").map((p) => p.code)).toEqual(["UK", "IN"]);
  });
  it("names each flag for its alt text", () => {
    expect(flagParts("UK")[0].name).toBe("United Kingdom");
    expect(flagParts("EA")[0].name).toBe("Euro area");
  });
  it("ignores empty input and builds flagcdn URLs", () => {
    expect(flagParts(undefined)).toEqual([]);
    expect(flagParts("")).toEqual([]);
    expect(flagSrc("gb")).toBe("https://flagcdn.com/w40/gb.png");
    expect(flagSrcSet("gb")).toBe("https://flagcdn.com/w80/gb.png 2x");
  });
});
