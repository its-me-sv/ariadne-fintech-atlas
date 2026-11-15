// Data integrity: the evidence must hang together, not just match the schema.
// evidence-schema.test.ts checks the shape of each record; this file checks the links between
// records, that facts carry sources, and that every illustrative journal entry balances.
//
// Each test reports the offending ids, so a failing run says exactly which record to fix.
// Known exceptions live in explicit allowlists below. A new violation fails CI, and an
// allowlist entry that stops being a violation also fails, so the lists cannot go stale.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import type { Claim, Edge, JournalEntry, Node, Rule, Scenario, Source } from "../evidence/schema";
import { balance } from "./support/ledger";
import { WORLDS } from "../src/world/worlds";

const read = <T>(f: string): T => JSON.parse(readFileSync(new URL(`../evidence/${f}`, import.meta.url), "utf8"));

const sources = read<Source[]>("sources.json");
const nodes = read<Node[]>("nodes.json");
const edges = read<Edge[]>("edges.json");
const rules = read<Rule[]>("rules.json");
const claims = read<Claim[]>("claims.json");
const scenarios = read<Scenario[]>("scenarios.json");
const journal = read<JournalEntry[]>("journal-entries.json");
const aliases = read<{ alias: string; canonical: string; collection: string }[]>("id-aliases.json");
const manifest = read<{ counts: Record<string, number> }>("manifest.json");

const ids = (rows: { id: string }[]) => new Set(rows.map((r) => r.id));
const sourceIds = ids(sources);
const nodeIds = ids(nodes);
const ruleIds = ids(rules);
const scenarioIds = ids(scenarios);

/**
 * Trace steps with no step-level source today. Their scenarios are sourced, but the step itself
 * is not. Listed so they can be sourced later; any new unsourced step fails CI.
 */
const UNSOURCED_STEPS_ALLOWLIST = new Set([
  "scn-uk-card-present#1",
  "scn-uk-card-present#3",
  "scn-uk-card-present#6",
  "scn-us-card-cnp-credit#6",
  "scn-ea-digital-euro-hypothetical#3",
]);

/**
 * Journal entries that are one-sided on purpose.
 *
 * je-fbo-load-subledger: a sponsor bank's sub-ledger posting for a "for benefit of" (FBO) account.
 * The double entry lives in the bank's general ledger (je-fbo-load-bank-gl: Dr reserves 500,
 * Cr custodial deposits 500, which balances). The sub-ledger only records which end customer owns
 * that custodial balance (Cr Alice 500), so it is a single-sided memo by design, not an error.
 */
const ONE_SIDED_JOURNAL_ALLOWLIST = new Set(["je-fbo-load-subledger"]);

describe("ids", () => {
  it("are unique within each collection", () => {
    const dupes = Object.entries({ sources, nodes, edges, rules, claims, scenarios, journal }).flatMap(([name, rows]) => {
      const seen = new Set<string>();
      const repeated: string[] = [];
      for (const r of rows) {
        if (seen.has(r.id)) repeated.push(`${name}:${r.id}`);
        seen.add(r.id);
      }
      return repeated;
    });
    expect(dupes).toEqual([]);
  });

  it("match the counts in manifest.json", () => {
    const actual = { sources: sources.length, nodes: nodes.length, edges: edges.length, rules: rules.length, claims: claims.length, scenarios: scenarios.length, "journal-entries": journal.length };
    for (const [k, v] of Object.entries(actual)) expect(v, k).toBe(manifest.counts[k]);
  });

  it("id aliases point at a record that exists, and no alias is still in use as a live id", () => {
    const live = { nodes: nodeIds, rules: ruleIds, sources: sourceIds, scenarios: scenarioIds } as Record<string, Set<string>>;
    const bad = aliases.filter((a) => live[a.collection] && (!live[a.collection].has(a.canonical) || live[a.collection].has(a.alias)));
    expect(bad.map((a) => `${a.collection}:${a.alias}->${a.canonical}`)).toEqual([]);
  });
});

describe("every fact has a source", () => {
  const unsourced = (rows: { id: string; sourceIds: string[] }[]) => rows.filter((r) => r.sourceIds.length === 0).map((r) => r.id);

  it("every system (node) has at least one source", () => expect(unsourced(nodes)).toEqual([]));
  it("every rule has at least one source", () => expect(unsourced(rules)).toEqual([]));
  it("every edge has at least one source", () => expect(unsourced(edges)).toEqual([]));
  it("every claim has at least one source", () => expect(unsourced(claims)).toEqual([]));
  it("every transaction trace has at least one source", () => expect(unsourced(scenarios)).toEqual([]));

  it("every trace step has its own source, apart from the allowlist", () => {
    const missing = scenarios.flatMap((s) => s.steps.filter((st) => st.sourceIds.length === 0).map((st) => `${s.id}#${st.n}`));
    expect(missing.filter((k) => !UNSOURCED_STEPS_ALLOWLIST.has(k)), "new unsourced steps").toEqual([]);
    expect([...UNSOURCED_STEPS_ALLOWLIST].filter((k) => !missing.includes(k)), "allowlisted steps that now have a source: remove them from the list").toEqual([]);
  });

  it("every source id that a record cites exists in sources.json", () => {
    const cited: [string, string[]][] = [
      ...[...nodes, ...edges, ...rules, ...claims, ...scenarios].map((r): [string, string[]] => [r.id, r.sourceIds]),
      ...scenarios.flatMap((s) => s.steps.map((st): [string, string[]] => [`${s.id}#${st.n}`, st.sourceIds])),
    ];
    const dangling = cited.flatMap(([owner, list]) => list.filter((id) => !sourceIds.has(id)).map((id) => `${owner}->${id}`));
    expect(dangling).toEqual([]);
  });
});

describe("cross references resolve", () => {
  it("every edge connects two systems that exist", () => {
    expect(edges.filter((e) => !nodeIds.has(e.from) || !nodeIds.has(e.to)).map((e) => `${e.id}: ${e.from}->${e.to}`)).toEqual([]);
  });

  it("rules, regulators and related rules point at records that exist", () => {
    const bad = [
      ...rules.flatMap((r) => (r.affects ?? []).filter((a) => !nodeIds.has(a)).map((a) => `${r.id}.affects->${a}`)),
      ...nodes.flatMap((n) => (n.relatedRules ?? []).filter((x) => !ruleIds.has(x)).map((x) => `${n.id}.relatedRules->${x}`)),
      ...nodes.flatMap((n) => (n.regulatedBy ?? []).filter((x) => !nodeIds.has(x)).map((x) => `${n.id}.regulatedBy->${x}`)),
    ];
    expect(bad).toEqual([]);
  });

  it("every rule cited in a trace step exists", () => {
    const bad = scenarios.flatMap((s) => s.steps.flatMap((st) => (st.rules ?? []).filter((r) => !ruleIds.has(r)).map((r) => `${s.id}#${st.n}->${r}`)));
    expect(bad).toEqual([]);
  });

  it("every claim is about a system, rule or trace that exists", () => {
    const subjects = new Set([...nodeIds, ...ruleIds, ...scenarioIds]);
    expect(claims.filter((c) => !subjects.has(c.subjectId)).map((c) => `${c.id}->${c.subjectId}`)).toEqual([]);
  });

  it("journal entries point at a trace and ledger owner that exist", () => {
    const bad = journal.flatMap((j) => [
      ...(j.scenarioId && !scenarioIds.has(j.scenarioId) ? [`${j.id}.scenarioId->${j.scenarioId}`] : []),
      ...(j.entityId && !nodeIds.has(j.entityId) ? [`${j.id}.entityId->${j.entityId}`] : []),
    ]);
    expect(bad).toEqual([]);
  });

  it("every 3D city animates a trace that exists", () => {
    expect(WORLDS.filter((w) => !scenarioIds.has(w.scenarioId)).map((w) => w.scenarioId)).toEqual([]);
  });
});

describe("transaction traces", () => {
  it("number their steps 1, 2, 3 ... with no gaps or repeats", () => {
    const bad = scenarios.filter((s) => s.steps.some((st, i) => st.n !== i + 1)).map((s) => s.id);
    expect(bad).toEqual([]);
  });
});

describe("ledger entries balance (debits equal credits)", () => {
  const withLines = journal.filter((j) => j.lines.length > 0);

  it("there are entries to check (guards against a vacuous pass)", () => {
    expect(withLines.length).toBeGreaterThanOrEqual(30);
  });

  it("every journal entry balances, apart from the one-sided allowlist", () => {
    const unbalanced = withLines.filter((j) => !balance(j.lines).balanced).map((j) => j.id);
    expect(unbalanced.filter((id) => !ONE_SIDED_JOURNAL_ALLOWLIST.has(id)), "new unbalanced entries").toEqual([]);
    expect([...ONE_SIDED_JOURNAL_ALLOWLIST].filter((id) => !unbalanced.includes(id)), "allowlisted entries that now balance: remove them from the list").toEqual([]);
  });

  it("every entry shown on a trace page balances, with no exceptions", () => {
    // These are the entries users see in the "Illustrative ledger entries" table.
    const shown = withLines.filter((j) => j.scenarioId);
    expect(shown.length).toBeGreaterThan(0);
    expect(shown.filter((j) => !balance(j.lines).balanced).map((j) => j.id)).toEqual([]);
  });

  it("no line debits and credits the same account in one line", () => {
    expect(journal.flatMap((j) => j.lines.filter((l) => l.debit != null && l.credit != null).map((l) => `${j.id}: ${l.account}`))).toEqual([]);
  });
});
