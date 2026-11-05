import { describe, it, expect } from "vitest";
import { travelMode } from "../src/world/travel";
import type { Jur } from "../src/data/types";

const CITIES: Jur[] = ["IN", "UK", "US", "EU", "SG", "CN"];

describe("travelMode", () => {
  it("sails between the UK and the EU, both ways", () => {
    expect(travelMode("UK", "EU")).toBe("ship");
    expect(travelMode("EU", "UK")).toBe("ship");
  });
  it("flies between every other pair of market cities", () => {
    for (const a of CITIES) for (const b of CITIES) {
      if (a === b || (a === "UK" && b === "EU") || (a === "EU" && b === "UK")) continue;
      expect(travelMode(a, b), `${a} to ${b}`).toBe("plane");
    }
  });
  it("does not travel to or from the globe, or to the same market", () => {
    for (const c of CITIES) {
      expect(travelMode("GLOBAL", c)).toBeNull();
      expect(travelMode(c, "GLOBAL")).toBeNull();
      expect(travelMode(c, c)).toBeNull();
    }
    expect(travelMode("GLOBAL", "GLOBAL")).toBeNull();
  });
});
