// The home page must stay light: its static import graph may not reach the 3D, graph or map libraries.
// Dynamic import() calls (the Overview prefetch) are allowed and not followed.
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { makeLabyrinth } from "../src/home/labyrinth";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FORBIDDEN = /^(three|three-stdlib|@react-three\/|@xyflow\/|elkjs|d3-geo|topojson-client|world-atlas)/;

function staticGraph(entry: string) {
  const seen = new Set<string>();
  const bare = new Set<string>();
  const visit = (file: string) => {
    if (seen.has(file)) return;
    seen.add(file);
    if (!/\.(tsx?|mjs|js)$/.test(file)) return;
    const src = readFileSync(file, "utf8");
    // import x from "y"; import { a } from "y"; import "y"; export ... from "y" (not import("y"))
    for (const m of src.matchAll(/^\s*(?:import|export)\s[^;]*?from\s+["']([^"']+)["']|^\s*import\s+["']([^"']+)["']/gm)) {
      const spec = m[1] ?? m[2];
      if (spec.startsWith(".")) {
        const base = resolve(dirname(file), spec);
        const hit = [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`, base].find((p) => existsSync(p) && /\.(tsx?|css)$/.test(p));
        if (hit) visit(hit);
      } else bare.add(spec);
    }
  };
  visit(entry);
  return { files: [...seen].map((f) => f.slice(root.length + 1).split("\\").join("/")), bare: [...bare] };
}

describe("home page", () => {
  const g = staticGraph(resolve(root, "src/views/Home.tsx"));
  it("really walks the graph (guards against a vacuous pass)", () => {
    expect(g.files).toEqual(expect.arrayContaining(["src/ui/Flag.tsx", "src/home/labyrinth.ts", "src/data/store.ts"]));
    expect(g.bare).toContain("react");
    expect(staticGraph(resolve(root, "src/world/Scene.tsx")).bare.some((b) => FORBIDDEN.test(b))).toBe(true);
  });
  it("does not import three, @react-three, @xyflow, elkjs or the globe map libraries", () => {
    expect(g.bare.filter((b) => FORBIDDEN.test(b))).toEqual([]);
  });
  it("does not pull in the 3D, globe or graph modules", () => {
    expect(g.files.filter((f) => /src\/world\/(Scene|Globe)|src\/views\/(Overview|Graph)/.test(f))).toEqual([]);
  });
  it("draws a single-path labyrinth that starts outside and ends at the centre", () => {
    const L = makeLabyrinth(100);
    expect(L.path.startsWith("M")).toBe(true);
    expect((L.path.match(/M/g) ?? []).length).toBe(1); // one continuous path
    expect((L.path.match(/A/g) ?? []).length).toBe(7); // seven circuits
    const end = L.path.match(/L(-?[\d.]+) (-?[\d.]+)$/)!;
    expect(Math.hypot(+end[1], +end[2])).toBeLessThan(0.01); // finishes at the centre
  });
});
