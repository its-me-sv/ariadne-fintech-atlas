import { describe, it, expect } from "vitest";
import { balance, parseCell } from "./support/ledger";

describe("ledger balance rule", () => {
  it("balances numeric debits against numeric credits", () => {
    expect(balance([{ debit: 1005 }, { credit: 5 }, { credit: 1000 }]).balanced).toBe(true);
    expect(balance([{ debit: 1005 }, { credit: 1000 }]).balanced).toBe(false);
  });

  it("matches symbolic amounts by label, one-for-one", () => {
    expect(balance([{ debit: "INR amount" }, { credit: "INR amount" }]).balanced).toBe(true);
    expect(balance([{ debit: "INR amount" }, { credit: "GBP amount" }]).balanced).toBe(false);
    expect(balance([{ debit: "X" }, { debit: "X" }, { credit: "X" }]).balanced).toBe(false);
  });

  it("does not let a symbolic amount cancel a numeric one", () => {
    expect(balance([{ debit: 500 }, { credit: "500 x R" }]).balanced).toBe(false);
  });

  it("treats a single-sided line as unbalanced", () => {
    expect(balance([{ debit: null, credit: 500 }]).balanced).toBe(false);
  });

  it("reads rendered table cells back to amounts", () => {
    expect(parseCell("")).toBeNull();
    expect(parseCell(" 1005 ")).toBe(1005);
    expect(parseCell("1,000 x R")).toBe("1,000 x R");
  });
});
