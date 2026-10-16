import type { View } from "../router";

const NEXT: Partial<Record<View, string>> = {
  graph: "The architecture graph arrives in checkpoint 3.",
  traces: "Transaction traces arrive in checkpoint 3.",
  compare: "Country comparison arrives in checkpoint 4.",
  rules: "The standards and rules registry arrives in checkpoint 4.",
  money: "The money-type comparison arrives in checkpoint 4.",
  blueprint: "The product blueprint arrives in checkpoint 4.",
  module: "Module pages arrive in checkpoint 4.",
};

export default function Placeholder({ view }: { view: View }) {
  return (
    <main className="page">
      <div className="page-head"><div><h1>Still being built</h1><p>{NEXT[view] ?? "This view is still being built."} The overview is live now: use Overview in the dock.</p></div></div>
    </main>
  );
}
