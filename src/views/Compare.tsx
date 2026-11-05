import { useMemo, useState } from "react";
import { useAtlas, inJur, isGap } from "../data/store";
import type { AtlasNode } from "../data/types";
import { MARKETS, NodeChip, Section, StatusPill, nodesIn } from "../ui/bits";
import { WORLDS } from "../world/worlds";
import { href } from "../router";
import { Flag } from "../ui/Flag";

const ROWS: { label: string; hint: string; types: string[]; filter?: (n: AtlasNode) => boolean }[] = [
  { label: "Central bank", hint: "Issues reserves and runs or oversees the RTGS", types: ["central_bank"] },
  { label: "High-value RTGS", hint: "Gross settlement in central bank money", types: ["rtgs"], filter: (n) => n.status !== "retired" },
  { label: "Instant payments", hint: "24x7 credit transfers to the payee in seconds", types: ["instant_payment_system"] },
  { label: "Batch and ACH", hint: "Bulk credits, debits and cheques", types: ["ach"] },
  { label: "Other rails and links", hint: "Bill pay, cross-border links, switches", types: ["rail"] },
  { label: "Card schemes", hint: "Four-party card networks", types: ["card_scheme"] },
  { label: "Regulators and ministries", hint: "Who writes and enforces the rules", types: ["regulator", "ministry", "fiu"], filter: (n) => n.status !== "retired" },
  { label: "Licence types", hint: "Routes for a firm to offer payments", types: ["licence_type"] },
];

export default function Compare() {
  const { core, idx } = useAtlas();
  const [railMarket, setRailMarket] = useState<string>("all");
  const cov = useMemo(() => {
    const out: Record<string, { claims: number; verified: number; sources: number; depth: string; gaps: string }> = {};
    for (const m of MARKETS) {
      const rows = (core?.coverage.jurisdictions ?? []).filter((c) => c.codes.some((x) => (m.id === "EU" ? ["EU", "EA"] : [m.id]).includes(x)));
      const claims = rows.reduce((a, r) => a + (r.counts.claims ?? 0), 0);
      const verified = rows.reduce((a, r) => a + (r.counts.claimsByStatus?.verified ?? 0), 0);
      const sources = rows.reduce((a, r) => a + (r.counts.sources ?? 0), 0);
      const mr = rows.flatMap((r) => r.manifestRows ?? []);
      out[m.id] = { claims, verified, sources, depth: rows.map((r) => r.depth).filter(Boolean).join(", ") || "Not labelled", gaps: mr.map((x) => x.mainGaps).join("; ") };
    }
    return out;
  }, [core]);

  if (!core || !idx) return null;
  const rails = MARKETS.flatMap((m) => nodesIn(core.nodes, m.id, ["rtgs", "instant_payment_system", "ach", "rail"]).map((n) => ({ n, m })))
    .filter(({ m }) => railMarket === "all" || m.id === railMarket);
  const seen = new Set<string>();
  const railRows = rails.filter(({ n }) => (seen.has(n.id) ? false : (seen.add(n.id), true)));

  return (
    <main className="page compare">
      <div className="page-head">
        <div>
          <h1>Country comparison</h1>
          <p>The same building blocks, side by side for the six markets. Select any item to open its evidence. Gaps are shown as gaps, not filled in.</p>
        </div>
      </div>

      <div className="tbl-wrap glass cmp-wrap">
        <table className="cmp">
          <thead>
            <tr><th scope="col" className="cmp-k">Building block</th>{MARKETS.map((m) => <th scope="col" key={m.id}><a className="cmp-h" href={href("overview", m.id.toLowerCase())}><Flag code={m.id} />{m.label}</a></th>)}</tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.label}>
                <th scope="row" className="cmp-k"><b>{r.label}</b><small>{r.hint}</small></th>
                {MARKETS.map((m) => {
                  const list = nodesIn(core.nodes, m.id, r.types).filter((n) => !r.filter || r.filter(n));
                  return <td key={m.id}>{list.length ? <div className="chips">{list.map((n) => <NodeChip key={n.id} n={n} />)}</div> : <span className="faint">None in the dataset</span>}</td>;
                })}
              </tr>
            ))}
            <tr>
              <th scope="row" className="cmp-k"><b>Retail or wholesale CBDC</b><small>Status as of the evidence date</small></th>
              {MARKETS.map((m) => {
                const list = nodesIn(core.nodes, m.id, ["cbdc"]);
                return <td key={m.id}><div className="chips">{list.map((n) => <span key={n.id} className="cmp-cbdc"><NodeChip n={n} showStatus={false} /><StatusPill status={n.status} /></span>)}</div></td>;
              })}
            </tr>
            <tr>
              <th scope="row" className="cmp-k"><b>Rules tracked</b><small>In force, coming, proposed</small></th>
              {MARKETS.map((m) => {
                const rs = core.rules.filter((r) => inJur(r.jurisdictions, m.id));
                const c = (s: string[]) => rs.filter((r) => s.includes(r.effectiveStatus ?? "")).length;
                return <td key={m.id} className="num"><b>{rs.length}</b> total<br /><span className="pill t-good">{c(["in_force"])} in force</span> <span className="pill t-warn">{c(["adopted_not_effective"])} coming</span> <span className="pill t-warn">{c(["proposed", "consultation"])} proposed</span></td>;
              })}
            </tr>
            <tr>
              <th scope="row" className="cmp-k"><b>Evidence depth</b><small>Claims checked on an opened primary source</small></th>
              {MARKETS.map((m) => {
                const c = cov[m.id];
                const pct = c.claims ? Math.round((c.verified / c.claims) * 100) : 0;
                return (
                  <td key={m.id}>
                    <div className="num"><b>{pct}%</b> of {c.claims} claims verified</div>
                    <div className="mini-track" role="img" aria-label={`${pct}% verified`}><i style={{ width: `${pct}%` }} /></div>
                    <div className="faint" style={{ fontSize: 12 }}>{c.sources} sources, depth: {c.depth}</div>
                  </td>
                );
              })}
            </tr>
            <tr>
              <th scope="row" className="cmp-k"><b>Main gaps</b><small>What this pass could not confirm</small></th>
              {MARKETS.map((m) => <td key={m.id} className="gap-text cmp-gaps">{cov[m.id].gaps || "None listed"}</td>)}
            </tr>
            <tr>
              <th scope="row" className="cmp-k"><b>Hero trace</b><small>Animated in the 3D overview</small></th>
              {MARKETS.map((m) => {
                const w = WORLDS.find((x) => x.jur === m.id);
                const s = w ? idx.scenario.get(w.scenarioId) : undefined;
                return <td key={m.id}>{s ? <a href={href("traces", s.id)}>{s.name}</a> : "None"}</td>;
              })}
            </tr>
          </tbody>
        </table>
      </div>

      <Section title="Rails side by side" lead="How each rail clears and settles. A settlement field that reads 'not publicly specified' means no opened source stated it.">
        <div className="seg" style={{ marginBottom: 10 }}>
          <button aria-pressed={railMarket === "all"} onClick={() => setRailMarket("all")}>All markets</button>
          {MARKETS.map((m) => <button key={m.id} aria-pressed={railMarket === m.id} onClick={() => setRailMarket(m.id)}>{m.short}</button>)}
        </div>
        <div className="tbl-wrap glass">
          <table className="tbl rails-tbl">
            <thead><tr><th>Rail</th><th>Market</th><th>Operator</th><th>Settlement model</th><th>Settlement asset</th><th>Hours</th><th>Messages</th><th>Status</th></tr></thead>
            <tbody>
              {railRows.map(({ n, m }) => (
                <tr key={n.id}>
                  <td><NodeChip n={n} showStatus={false} label={n.canonicalName} /></td>
                  <td>{m.short}</td>
                  <td>{n.operator ?? <span className="faint">Not stated</span>}</td>
                  <td className={isGap(n.settlementModel) ? "gap-text" : ""}>{n.settlementModel ?? "Not stated"}</td>
                  <td className={isGap(n.settlementAsset) ? "gap-text" : ""}>{n.settlementAsset ?? "Not stated"}</td>
                  <td className={isGap(n.hours) ? "gap-text" : ""}>{n.hours ?? "Not stated"}</td>
                  <td>{n.messageStandards?.join("; ") ?? <span className="faint">Not stated</span>}</td>
                  <td><StatusPill status={n.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </main>
  );
}
