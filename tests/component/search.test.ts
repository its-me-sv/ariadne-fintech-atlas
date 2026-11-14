// Regression: payment systems must be findable by their short code.
// Before the fix, aliases were indexed with the low-weight prose, so searching "UPI" ranked the
// Unified Payments Interface 59th of 74 matches, outside the 10-result dropdown.
import { describe, it, expect, beforeEach } from "vitest";
import { searchAtlas } from "../../src/data/store";
import { loadAtlas, loaded } from "./atlas";

const RAIL_TYPES = new Set(["rail", "rtgs", "ach", "instant_payment_system", "card_scheme", "cbdc"]);
/** A short code: 2 to 8 capitals or digits, e.g. UPI, RTGS, FedACH. */
const SHORT_CODE = /^[A-Z0-9-]{2,8}$/;

function shortCodeCases() {
  return loaded().core.nodes
    .filter((n) => !n.stub && RAIL_TYPES.has(n.type))
    .flatMap((n) => (n.aliases ?? [])
      .filter((a) => SHORT_CODE.test(a) && !n.canonicalName.includes(a))
      .map((code) => ({ code, id: n.id, name: n.canonicalName })));
}

const rankOf = (q: string, id: string) => {
  const i = searchAtlas(loaded().idx, q).findIndex((h) => h.id === id);
  return i < 0 ? null : i + 1;
};

describe("search by a payment system's short code", () => {
  beforeEach(async () => { await loadAtlas(); });

  it("covers every rail-type system whose short code is not in its name", () => {
    // 9 systems when this test was written; the set is derived from the data, so new ones join automatically.
    expect(shortCodeCases().length).toBeGreaterThanOrEqual(9);
  });

  it("ranks each one in the top 3 for its short code", () => {
    const ranks = shortCodeCases().map((c) => ({ ...c, rank: rankOf(c.code, c.id) }));
    const missed = ranks.filter((r) => r.rank === null || r.rank > 3).map((r) => `${r.code} -> ${r.name}: rank ${r.rank ?? "not found"}`);
    expect(missed).toEqual([]);
  });

  it("puts the Unified Payments Interface first for UPI, in any case", () => {
    for (const q of ["UPI", "upi", " Upi "]) expect(rankOf(q, "in-upi"), q).toBe(1);
  });

  it("does not demote a system found by its full name", () => {
    expect(rankOf("Unified Payments Interface", "in-upi")).toBe(1);
  });

  it("keeps relevance order for everything that is not an exact alias match", () => {
    const { idx } = loaded();
    const plain = idx.search.search("instant payment").map((h) => h.id);
    expect(searchAtlas(idx, "instant payment").map((h) => h.id)).toEqual(plain);
  });
});
