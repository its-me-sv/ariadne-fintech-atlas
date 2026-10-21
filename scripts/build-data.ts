/**
 * Builds the app's runtime data from the vendored evidence package (evidence/*.json).
 * Output: public/data/core.json (loaded at startup) and public/data/evidence.json
 * (claims + sources, loaded after first paint). No facts are added here: fields are
 * only trimmed, renamed for size, or indexed.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SRC = join(ROOT, "evidence");
const OUT = join(ROOT, "public", "data");
mkdirSync(OUT, { recursive: true });

const read = (f: string) => JSON.parse(readFileSync(join(SRC, f), "utf8"));
const drop = <T extends Record<string, unknown>>(o: T, keys: string[]) => {
  const c: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (keys.includes(k)) continue;
    if (v === null || v === undefined) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    c[k] = v;
  }
  return c;
};

const nodes = read("nodes.json").map((n: Record<string, unknown>) => drop(n, ["mergedIds", "statusHistory", "topics", "aliasesFrom"]));
const edges = read("edges.json").map((e: Record<string, unknown>) => drop(e, ["mergedIds", "topics"]));
const rules = read("rules.json").map((r: Record<string, unknown>) => drop(r, ["mergedIds", "statusHistory", "topics"]));
const scenarios = read("scenarios.json");
const coverage = read("coverage.json");
const conflicts = read("conflicts.json");
const gaps = read("gaps.json");
const manifest = read("manifest.json");
const journal = read("journal-entries.json");
const timelines = read("timelines.json");
const operatingModels = read("operating-models.json");
const cbdcDims = read("cbdc-design-dimensions.json");
const claims = read("claims.json").map((c: Record<string, unknown>) => drop(c, ["originalStatus", "topic"]));
const sources = read("sources.json").map((s: Record<string, unknown>) => drop(s, ["mergedIds", "topics", "canonicalUrl"]));

// small per-subject claim stats so panels can show counts before evidence.json loads
const claimStats: Record<string, Record<string, number>> = {};
for (const c of claims as Array<{ subjectId: string; status: string }>) {
  const s = (claimStats[c.subjectId] ??= {});
  s[c.status] = (s[c.status] ?? 0) + 1;
}

const core = {
  asOf: manifest.asOf ?? "2026-10-15",
  counts: manifest.counts,
  claimsByStatus: manifest.claimsByStatus,
  nodes, edges, rules, scenarios, coverage, conflicts, gaps,
  journal, timelines, operatingModels, cbdcDims, claimStats,
};
writeFileSync(join(OUT, "core.json"), JSON.stringify(core));
writeFileSync(join(OUT, "evidence.json"), JSON.stringify({ claims, sources }));
const kb = (f: string) => Math.round(readFileSync(join(OUT, f)).length / 1024);
console.log(`data: core.json ${kb("core.json")} KB, evidence.json ${kb("evidence.json")} KB; nodes ${nodes.length}, edges ${edges.length}, rules ${rules.length}, scenarios ${scenarios.length}, claims ${claims.length}, sources ${sources.length}`);
