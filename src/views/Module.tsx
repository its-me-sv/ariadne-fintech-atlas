import { useMemo } from "react";
import { useAtlas, prettyType } from "../data/store";
import type { AtlasNode } from "../data/types";
import { useRoute, href } from "../router";
import { NodeChip, Section, StatusPill } from "../ui/bits";
import { KIND_LABEL, kindOf, type Kind } from "../ui/kinds";

const MODULES: Record<string, { key: string; title: string; lead: string }> = {
  cbdc: { key: "cbdc", title: "Central bank digital currency", lead: "CBDCs and tokenised central bank money, kept apart from deposits, e-money and stablecoins. Status labels follow the sources: production, pilot, design phase, research, concluded or prohibited." },
  insurance: { key: "insurance", title: "Insurance", lead: "How policies are sold, priced, paid for and claimed, and where insurance touches the payments core (premium collection and claim payouts)." },
  markets: { key: "capital_markets", title: "Capital markets", lead: "Trading, clearing, settlement and custody of securities, and the cash legs that settle in central bank money." },
  crypto: { key: "crypto", title: "Crypto-assets and stablecoins", lead: "Issuers, exchanges, custody and the rules for stablecoins and crypto service providers. A stablecoin is a private liability, never a CBDC." },
};

export default function Module() {
  const route = useRoute();
  const { core, idx } = useAtlas();
  const m = MODULES[route.param ?? "cbdc"] ?? MODULES.cbdc;
  const data = useMemo(() => {
    if (!core) return null;
    const nodes = core.nodes.filter((n) => !n.stub && (n.module === m.key || (m.key === "cbdc" && ["cbdc", "cbdc_project"].includes(n.type))));
    const ids = new Set(nodes.map((n) => n.id));
    const rules = core.rules.filter((r) => r.module === m.key || (r.affects ?? []).some((a) => ids.has(a)));
    const scenarios = core.scenarios.filter((s) => s.module === m.key);
    const links = core.edges.filter((e) => e.integrationPoint && (ids.has(e.from) || ids.has(e.to)));
    let claims = 0, verified = 0;
    for (const id of [...ids, ...rules.map((r) => r.id)]) { const s = core.claimStats[id]; if (!s) continue; for (const [k, v] of Object.entries(s)) { claims += v; if (k === "verified") verified += v; } }
    const byKind = new Map<Kind, AtlasNode[]>();
    for (const n of nodes) { const k = kindOf(n.type); byKind.set(k, [...(byKind.get(k) ?? []), n]); }
    return { nodes, rules, scenarios, links, claims, verified, byKind };
  }, [core, m.key]);
  if (!data || !idx) return null;

  return (
    <main className="page module">
      <div className="page-head"><div><h1>{m.title}</h1><p>{m.lead}</p></div></div>
      <div className="mod-stats">
        <div className="card"><small>Systems and roles</small><b className="num">{data.nodes.length}</b></div>
        <div className="card"><small>Rules</small><b className="num">{data.rules.length}</b></div>
        <div className="card"><small>Claims verified</small><b className="num">{data.claims ? Math.round((data.verified / data.claims) * 100) : 0}%</b><span className="faint num">{data.verified} of {data.claims}</span></div>
        <div className="card"><small>Traces</small><b className="num">{data.scenarios.length}</b></div>
      </div>

      {m.key === "cbdc" && <CbdcTables nodes={data.nodes} />}

      {data.scenarios.length > 0 && (
        <Section title="Traces in this module">
          <ul className="mod-list">{data.scenarios.map((s) => <li key={s.id}><a href={href("traces", s.id)}>{s.name}</a> <span className="faint">{s.steps.length} steps</span></li>)}</ul>
        </Section>
      )}

      {data.links.length > 0 && (
        <Section title="Where it connects to the payments core" lead="Links marked as integration points in the dataset.">
          <ul className="mod-list">
            {data.links.map((e) => (
              <li key={e.id}><b>{idx.node.get(e.from)?.canonicalName ?? e.from}</b> {e.verb} <b>{idx.node.get(e.to)?.canonicalName ?? e.to}</b> <span className="faint">({e.flowClass})</span></li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Systems, institutions and roles">
        {[...data.byKind.entries()].map(([k, list]) => (
          <div key={k} className="mod-group">
            <h3>{KIND_LABEL[k]} <span className="faint num">{list.length}</span></h3>
            <div className="chips">{list.map((n) => <NodeChip key={n.id} n={n} />)}</div>
          </div>
        ))}
      </Section>

      <Section title="Rules">
        <div className="tbl-wrap glass">
          <table className="tbl">
            <thead><tr><th>Instrument</th><th>Type</th><th>Where</th><th>Status</th></tr></thead>
            <tbody>{data.rules.map((r) => <tr key={r.id}><td><RuleLink id={r.id} name={r.canonicalName} /></td><td>{prettyType(r.instrumentType ?? "rule")}</td><td>{(r.jurisdictions ?? []).join(", ")}</td><td><StatusPill status={r.effectiveStatus} /></td></tr>)}</tbody>
          </table>
        </div>
      </Section>
    </main>
  );
}

function RuleLink({ id, name }: { id: string; name: string }) {
  const select = useAtlas((s) => s.select);
  return <button className="linklike-plain" onClick={() => select(id)}>{name}</button>;
}

function CbdcTables({ nodes }: { nodes: AtlasNode[] }) {
  const dims = useAtlas((s) => s.core?.cbdcDims ?? []);
  const cbdcs = nodes.filter((n) => n.type === "cbdc");
  const projects = nodes.filter((n) => n.type === "cbdc_project");
  return (
    <>
      <Section title="CBDCs by status" lead="Retail and wholesale CBDCs in the dataset. Select one for its design, ledger and open questions.">
        <div className="tbl-wrap glass">
          <table className="tbl">
            <thead><tr><th>CBDC</th><th>Where</th><th>Status</th><th>What it is</th></tr></thead>
            <tbody>{cbdcs.map((n) => <tr key={n.id}><td><NodeChip n={n} showStatus={false} label={n.canonicalName} /></td><td>{(n.jurisdictions ?? []).join(", ")}</td><td><StatusPill status={n.status} /></td><td>{n.purpose}</td></tr>)}</tbody>
          </table>
        </div>
      </Section>
      <Section title="Projects and experiments" lead="Research prototypes, real-value trials and pilots. A project that settles tokenised reserves or deposits is not automatically a retail CBDC.">
        <div className="tbl-wrap glass">
          <table className="tbl">
            <thead><tr><th>Project</th><th>Status</th><th>What it tests</th></tr></thead>
            <tbody>{projects.map((n) => <tr key={n.id}><td><NodeChip n={n} showStatus={false} label={n.canonicalName} /></td><td><StatusPill status={n.status} /></td><td>{n.purpose}</td></tr>)}</tbody>
          </table>
        </div>
      </Section>
      {dims.length > 0 && (
        <Section title="The design choices every CBDC makes" lead="From BIS and IMF work. Each market answers these differently; select a CBDC above to see its answers where they are documented.">
          <div className="cards">
            {dims.map((d) => (
              <article key={d.id} className="card mcard">
                <b>{d.name}</b>
                {d.options && <div className="chips" style={{ marginTop: 6 }}>{d.options.map((o) => <span key={o} className="pill t-muted">{o}</span>)}</div>}
                {d.notes && <p>{d.notes}</p>}
              </article>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}
