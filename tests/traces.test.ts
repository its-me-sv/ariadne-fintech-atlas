import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { WORLDS } from "../src/world/worlds";
import { filterTraces, HERO_SCENARIO_IDS } from "../src/views/traceFilter";

const scenarios: { id: string; market?: string }[] = JSON.parse(readFileSync(new URL("../evidence/scenarios.json", import.meta.url), "utf8"));
const scenarioIds = new Set(scenarios.map((s) => s.id));
const worldIds = new Set(WORLDS.map((w) => w.scenarioId));

describe("Has 3D view filter", () => {
  it("only returns ids that are hero scenarios in WORLDS and exist in scenarios.json", () => {
    const shown = filterTraces(scenarios, "all", true);
    expect(shown.length).toBeGreaterThan(0);
    for (const s of shown) {
      expect(worldIds.has(s.id), s.id).toBe(true);
      expect(scenarioIds.has(s.id), s.id).toBe(true);
    }
  });
  it("finds every world's hero trace", () => {
    expect(new Set(filterTraces(scenarios, "all", true).map((s) => s.id))).toEqual(worldIds);
    expect(HERO_SCENARIO_IDS).toEqual(worldIds);
  });
  it("combines with the jurisdiction filter", () => {
    for (const m of new Set(scenarios.map((s) => s.market ?? "GLOBAL"))) {
      const both = filterTraces(scenarios, m, true);
      for (const s of both) {
        expect(s.market ?? "GLOBAL").toBe(m);
        expect(worldIds.has(s.id)).toBe(true);
      }
    }
    expect(filterTraces(scenarios, "GLOBAL", true)).toEqual([]);
  });
  it("leaves the list alone when the toggle is off", () => {
    expect(filterTraces(scenarios, "all", false)).toHaveLength(scenarios.length);
  });
});
