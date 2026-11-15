// One definition of "this journal entry balances", shared by the data integrity tests,
// the component tests (rendered table) and the E2E tests (DOM table).
//
// The evidence mixes two kinds of amount:
//   numeric:  1005, 5, 1000
//   symbolic: "INR amount", "1,000 x R"  (the amount depends on an FX rate or is a placeholder)
// Symbolic amounts cannot be summed, so an entry balances when
//   1. the numeric debits sum to the numeric credits, and
//   2. the symbolic labels on the debit side match the credit side one-for-one.

export type Amount = number | string | null | undefined;
export interface Line { debit?: Amount; credit?: Amount }

export interface Balance { balanced: boolean; numericDebit: number; numericCredit: number; symbolicDebit: string[]; symbolicCredit: string[] }

/** A rendered cell's text back to an amount: "" is empty, "1005" is a number, anything else is a label. */
export function parseCell(text: string): Amount {
  const t = text.trim();
  if (!t) return null;
  return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : t;
}

export function balance(lines: Line[]): Balance {
  let numericDebit = 0;
  let numericCredit = 0;
  const symbolicDebit: string[] = [];
  const symbolicCredit: string[] = [];
  for (const l of lines) {
    if (typeof l.debit === "number") numericDebit += l.debit;
    else if (typeof l.debit === "string" && l.debit.trim()) symbolicDebit.push(l.debit.trim());
    if (typeof l.credit === "number") numericCredit += l.credit;
    else if (typeof l.credit === "string" && l.credit.trim()) symbolicCredit.push(l.credit.trim());
  }
  symbolicDebit.sort();
  symbolicCredit.sort();
  const balanced =
    Math.abs(numericDebit - numericCredit) < 1e-9 &&
    symbolicDebit.length === symbolicCredit.length &&
    symbolicDebit.every((s, i) => s === symbolicCredit[i]);
  return { balanced, numericDebit, numericCredit, symbolicDebit, symbolicCredit };
}
