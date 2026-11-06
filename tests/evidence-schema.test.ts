// Every record in evidence/ must match the zod schema in evidence/schema.ts, so data
// contributions that break the shape fail CI before they reach the site.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import type { ZodTypeAny } from "zod";
import { Claim, Edge, JournalEntry, Node, Rule, Scenario, Source } from "../evidence/schema";

const read = (f: string): unknown[] => JSON.parse(readFileSync(new URL(`../evidence/${f}`, import.meta.url), "utf8"));
const FILES: [string, ZodTypeAny][] = [
  ["sources.json", Source], ["nodes.json", Node], ["edges.json", Edge], ["rules.json", Rule],
  ["claims.json", Claim], ["scenarios.json", Scenario], ["journal-entries.json", JournalEntry],
];

describe("evidence matches evidence/schema.ts", () => {
  for (const [file, schema] of FILES) {
    it(file, () => {
      const rows = read(file);
      expect(rows.length).toBeGreaterThan(0);
      const errors = rows.flatMap((row, i) => {
        const r = schema.safeParse(row);
        return r.success ? [] : [`#${i} ${(row as { id?: string }).id ?? ""}: ${r.error.issues.slice(0, 3).map((e) => `${e.path.join(".")} ${e.message}`).join("; ")}`];
      });
      expect(errors.slice(0, 10), `${errors.length} invalid records`).toEqual([]);
    });
  }
});
