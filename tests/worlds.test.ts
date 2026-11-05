// Integrity tests: every hand-authored 3D world must point at real dataset records,
// and every step it animates must exist in its scenario.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { WORLDS, PATHS, SLOT_POS } from "../src/world/worlds";

const ev = (f: string) => JSON.parse(readFileSync(new URL(`../evidence/${f}`, import.meta.url), "utf8"));
const nodes = new Map<string, { id: string; status?: string; type: string }>(ev("nodes.json").map((n: { id: string }) => [n.id, n]));
const scenarios = new Map<string, { steps: { n: number }[] }>(ev("scenarios.json").map((s: { id: string }) => [s.id, s]));

describe("3D worlds", () => {
  for (const w of WORLDS) {
    describe(w.jur, () => {
      it("uses an existing hero scenario", () => expect(scenarios.has(w.scenarioId)).toBe(true));
      it("points every building at a real node or explains the actor", () => {
        for (const b of w.buildings) {
          if (b.nodeId) expect(nodes.has(b.nodeId), `${w.jur} ${b.slot} -> ${b.nodeId}`).toBe(true);
          else expect((b.text ?? "").length, `${w.jur} ${b.slot} actor text`).toBeGreaterThan(20);
        }
      });
      it("uses each slot once", () => {
        const slots = w.buildings.map((b) => b.slot);
        expect(new Set(slots).size).toBe(slots.length);
      });
      it("maps only steps that exist, to slots and paths that exist", () => {
        const sc = scenarios.get(w.scenarioId)!;
        const nums = new Set(sc.steps.map((s) => s.n));
        const used = new Set(w.buildings.map((b) => b.slot));
        for (const [n, st] of Object.entries(w.steps)) {
          expect(nums.has(Number(n)), `${w.jur} step ${n}`).toBe(true);
          for (const f of st.focus) expect(used.has(f), `${w.jur} step ${n} focus ${f}`).toBe(true);
          for (const r of st.routes) expect(PATHS[r.path], `${w.jur} path ${r.path}`).toBeTruthy();
        }
      });
    });
  }
  it("never shows a CBDC building with a production label unless the data says production", () => {
    for (const w of WORLDS) for (const b of w.buildings) {
      if (b.kind !== "cbdc" || !b.nodeId) continue;
      const n = nodes.get(b.nodeId)!;
      if (/pilot|trial/i.test(b.sub)) expect(n.status).toBe("pilot");
      if (/design phase/i.test(b.sub)) expect(n.status).toBe("design_phase");
      if (/prohibited/i.test(b.sub)) expect(n.status).toBe("prohibited");
    }
  });
  it("keeps slot positions apart", () => {
    const pts = Object.values(SLOT_POS);
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      const d = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]);
      expect(d).toBeGreaterThan(6);
    }
  });
});

describe("user-facing copy", () => {
  it("has no em or en dashes in source text", () => {
    const files = ["src/world/worlds.ts", "src/views/Overview.tsx", "src/views/Traces.tsx", "src/views/Graph.tsx", "src/views/Compare.tsx", "src/views/Rules.tsx", "src/views/Money.tsx", "src/views/Blueprint.tsx", "src/views/Module.tsx", "src/ui/DetailPanel.tsx", "src/ui/TopBar.tsx",
      "src/App.tsx", "src/world/Globe.tsx", "src/ui/Flag.tsx", "src/ui/flags.ts", "src/ui/PhoneNotice.tsx", "src/views/traceFilter.ts", "src/views/Travel.tsx", "src/world/travel.ts", "index.html"];
    for (const f of files) expect(readFileSync(new URL(`../${f}`, import.meta.url), "utf8")).not.toMatch(/[–—]/);
  });
});
