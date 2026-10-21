import { useAtlas } from "../data/store";
import type { AtlasNode } from "../data/types";
import { MARKETS, NodeChip, Section, StatusPill, splitLabelled, nodesIn } from "../ui/bits";

const ORDER = [
  "global-money-cash", "global-money-reserves", "global-money-retail-cbdc", "global-money-wholesale-cbdc",
  "global-money-commercial-deposit", "global-money-tokenised-deposit", "global-money-emoney", "global-money-safeguarded-balance",
  "global-money-stablecoin", "global-money-crypto-asset",
];
const CB = new Set(["global-money-cash", "global-money-reserves", "global-money-retail-cbdc", "global-money-wholesale-cbdc"]);
const BANK = new Set(["global-money-commercial-deposit", "global-money-tokenised-deposit"]);

function parts(n: AtlasNode) {
  const a = splitLabelled(n.purpose, ["Issuer and claim"]);
  const b = splitLabelled(n.settlementAsset, ["Backing", "Ledger of record", "Typical rails"]);
  const c = splitLabelled(n.finalityNotes, ["Redemption", "Protection", "Regime"]);
  const d = splitLabelled(n.participants, ["Holder eligibility"]);
  return {
    claim: a["Issuer and claim"] ?? a._lead ?? n.purpose ?? "",
    holder: d["Holder eligibility"] ?? d._lead ?? "",
    backing: b.Backing ?? b._lead ?? "", ledger: b["Ledger of record"] ?? "", rails: b["Typical rails"] ?? "",
    finality: c._lead ?? "", redemption: c.Redemption ?? "", protection: c.Protection ?? "", regime: c.Regime ?? "",
  };
}

export default function Money() {
  const { core, idx } = useAtlas();
  if (!core || !idx) return null;
  const types = ORDER.map((id) => idx.node.get(id)).filter(Boolean) as AtlasNode[];
  const local = core.nodes.filter((n) => n.type === "money_type" && !ORDER.includes(n.id));
  const cols: [keyof ReturnType<typeof parts>, string][] = [
    ["claim", "Issuer and legal claim"], ["holder", "Who can hold it"], ["backing", "Backing"], ["ledger", "Ledger of record"],
    ["rails", "Moves over"], ["finality", "Finality"], ["redemption", "Redemption"], ["protection", "Protection if the issuer fails"], ["regime", "Main rules"],
  ];
  return (
    <main className="page money">
      <div className="page-head">
        <div>
          <h1>Money types</h1>
          <p>Ten kinds of money, compared on the question that matters most: whose liability is it, and what protects you if that party fails. The ledger technology is a separate question. A tokenised deposit is still a deposit; a stablecoin is still a private promise; only cash, reserves and CBDC are claims on a central bank.</p>
        </div>
      </div>

      <div className="money-key">
        <span><i style={{ background: "#8b5cf6" }} />Claim on the central bank</span>
        <span><i style={{ background: "#3d63ea" }} />Claim on a commercial bank</span>
        <span><i style={{ background: "#f97316" }} />Claim on a non-bank or no one</span>
      </div>
      <div className="tbl-wrap glass">
        <table className="tbl money-tbl">
          <thead><tr><th scope="col">Money type</th>{cols.map(([, l]) => <th scope="col" key={l}>{l}</th>)}</tr></thead>
          <tbody>
            {types.map((n) => {
              const p = parts(n);
              const tone = CB.has(n.id) ? "#8b5cf6" : BANK.has(n.id) ? "#3d63ea" : "#f97316";
              return (
                <tr key={n.id}>
                  <th scope="row"><span className="money-name" style={{ ["--t" as string]: tone }}><NodeChip n={n} showStatus={false} label={n.canonicalName} /></span>{n.doesNot && <small className="faint">{n.doesNot}</small>}</th>
                  {cols.map(([k]) => <td key={k}>{p[k] ? p[k].charAt(0).toUpperCase() + p[k].slice(1) : <span className="faint">Not stated</span>}</td>)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Section title="Country-specific money" lead="Records where a market's rules change the answer, such as China's e-CNY 2.0 bank-wallet balances or India's prepaid instruments.">
        <div className="cards">
          {local.map((n) => (
            <article key={n.id} className="card mcard">
              <div className="mcard-h"><NodeChip n={n} showStatus={false} label={n.canonicalName} /><StatusPill status={n.status} /></div>
              {n.purpose && <p>{n.purpose}</p>}
              {n.doesNot && <p className="faint">{n.doesNot}</p>}
              {n.limits && <p><b>Limits:</b> {n.limits}</p>}
            </article>
          ))}
        </div>
      </Section>

      <Section title="CBDC in each market" lead="Central bank digital currency is its own money type. It is not a rail, a deposit, e-money or a stablecoin.">
        <div className="cards">
          {MARKETS.map((m) => nodesIn(core.nodes, m.id, ["cbdc"]).map((n) => (
            <article key={n.id} className="card mcard">
              <div className="mcard-h"><b className="mk">{m.label}</b><StatusPill status={n.status} /></div>
              <NodeChip n={n} showStatus={false} label={n.canonicalName} />
              {n.purpose && <p>{n.purpose}</p>}
            </article>
          )))}
        </div>
      </Section>
    </main>
  );
}
