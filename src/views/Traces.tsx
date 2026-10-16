import { useEffect, useMemo, useRef, useState } from "react";
import { useAtlas, prettyStatus, statusTone } from "../data/store";
import type { Scenario, ScenarioStep } from "../data/types";
import { go, href, useRoute } from "../router";
import { WORLDS } from "../world/worlds";
import { Icon } from "../ui/icons";
import { fmtDate } from "../ui/TopBar";

const MARKET_LABEL: Record<string, string> = {
  IN: "India", UK: "United Kingdom", US: "United States", EA: "Euro area", EU: "European Union", SG: "Singapore", CN: "Mainland China",
  GLOBAL: "Global", "UK-IN": "UK to India",
};
const MODULE_LABEL: Record<string, string> = { core: "Payments and banking", cbdc: "CBDC", capital_markets: "Capital markets", crypto: "Crypto and stablecoins", insurance: "Insurance" };

interface JournalLine { account?: string; debit?: number | string | null; credit?: number | string | null }
interface Journal { id: string; scenarioId?: string; step?: string; entity?: string; entityId?: string; lines?: JournalLine[]; assumptions?: string; notes?: string; illustrative?: boolean }

const label = (s: Scenario) => (/HYPOTHETICAL/i.test(s.name) ? "Hypothetical" : /illustrative/i.test(s.name) ? "Illustrative" : /pilot|trial/i.test(s.name) ? "Pilot" : null);

export default function Traces() {
  const { core, idx } = useAtlas();
  const route = useRoute();
  const [filter, setFilter] = useState<string>("all");
  const scenarios = core?.scenarios ?? [];
  const current = (route.param && idx?.scenario.get(route.param)) || scenarios[0];
  const markets = useMemo(() => [...new Set(scenarios.map((s) => s.market ?? "GLOBAL"))], [scenarios]);
  const shown = scenarios.filter((s) => filter === "all" || (s.market ?? "GLOBAL") === filter);

  useEffect(() => { if (!route.param && current) history.replaceState(null, "", href("traces", current.id)); }, [route.param, current]);
  if (!current) return null;

  return (
    <main className="page traces">
      <div className="page-head">
        <div>
          <h1>Transaction traces</h1>
          <p>Step-by-step journeys through real systems. Each step shows who acts, which system carries it, what the ledger does, the controls that apply and the sources behind it.</p>
        </div>
      </div>
      <div className="tr-layout">
        <nav className="tr-list glass" aria-label="Traces">
          <div className="seg tr-filter">
            <button aria-pressed={filter === "all"} onClick={() => setFilter("all")}>All <span className="faint num">{scenarios.length}</span></button>
            {markets.map((m) => <button key={m} aria-pressed={filter === m} onClick={() => setFilter(m)}>{m}</button>)}
          </div>
          {shown.map((s) => (
            <a key={s.id} href={href("traces", s.id)} className="tr-item" aria-current={s.id === current.id ? "page" : undefined}>
              <b>{s.name.replace(/^HYPOTHETICAL (\w)/, (_m, c: string) => c.toUpperCase())}</b>
              <small>{MARKET_LABEL[s.market ?? "GLOBAL"] ?? s.market}, {s.steps.length} steps{label(s) ? `, ${label(s)!.toLowerCase()}` : ""}</small>
            </a>
          ))}
        </nav>
        <TraceBody key={current.id} s={current} />
      </div>
    </main>
  );
}

function TraceBody({ s }: { s: Scenario }) {
  const { core, idx, select, sources } = useAtlas();
  const [active, setActive] = useState(s.steps[0]?.n ?? 1);
  const refs = useRef<Record<number, HTMLElement | null>>({});
  const world = WORLDS.find((w) => w.scenarioId === s.id);
  const journals = useMemo(() => ((core?.journal ?? []) as Journal[]).filter((j) => j.scenarioId === s.id), [core, s.id]);
  const tag = label(s);

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      const i = s.steps.findIndex((x) => x.n === active);
      if (e.key === "ArrowDown" || e.key === "j") { e.preventDefault(); const n = s.steps[Math.min(i + 1, s.steps.length - 1)].n; setActive(n); refs.current[n]?.scrollIntoView({ block: "center", behavior: "smooth" }); }
      if (e.key === "ArrowUp" || e.key === "k") { e.preventDefault(); const n = s.steps[Math.max(i - 1, 0)].n; setActive(n); refs.current[n]?.scrollIntoView({ block: "center", behavior: "smooth" }); }
    };
    addEventListener("keydown", on);
    return () => removeEventListener("keydown", on);
  }, [active, s.steps]);

  return (
    <article className="tr-body">
      <header className="tr-title glass">
        <div className="tr-badges">
          <span className="pill t-muted">{MARKET_LABEL[s.market ?? "GLOBAL"] ?? s.market}</span>
          <span className="pill t-muted">{MODULE_LABEL[s.module ?? "core"] ?? s.module}</span>
          {tag && <span className={`pill ${tag === "Hypothetical" ? "t-warn" : "t-info"}`}>{tag}</span>}
          <span className="pill t-muted num">{s.steps.length} steps</span>
        </div>
        <h2>{s.name}</h2>
        {s.endState && <p className="tr-end"><b>Where it ends:</b> {s.endState}</p>}
        {s.limitations && <p className="tr-lim"><b>Limits of this trace:</b> {s.limitations}</p>}
        <div className="tr-actions">
          {world && <a className="btn primary" href={href("overview", world.jur.toLowerCase())}><Icon name="overview" size={16} />Watch it in 3D</a>}
          <span className="faint" style={{ fontSize: 12.5 }}>Use the arrow keys to move between steps</span>
        </div>
      </header>

      <ol className="tr-timeline">
        {s.steps.map((st) => (
          <li key={st.n} ref={(el) => { refs.current[st.n] = el; }} className={st.n === active ? "on" : ""} onClick={() => setActive(st.n)}>
            <span className="tr-n" aria-hidden="true">{st.n}</span>
            <StepCard st={st} onRule={(id) => select(id)} ruleName={(id) => idx?.rule.get(id)?.canonicalName ?? id} ruleStatus={(id) => idx?.rule.get(id)?.effectiveStatus}
              srcs={(st.sourceIds ?? []).map((id) => sources?.get(id)).filter(Boolean) as { id: string; title: string; url: string; issuer?: string; publicationDate?: string }[]} />
          </li>
        ))}
      </ol>

      {journals.length > 0 && (
        <section className="tr-journal glass">
          <h3>Illustrative ledger entries</h3>
          <p className="muted" style={{ fontSize: 13, margin: "4px 0 10px" }}>These entries show the shape of the bookkeeping under the stated assumptions. They are examples, not universal accounting rules.</p>
          {journals.map((j) => (
            <div key={j.id} className="je">
              <div className="je-h"><b>{j.step}</b><span>{idx?.node.get(j.entityId ?? "")?.canonicalName ?? j.entity}</span></div>
              {j.lines && j.lines.length > 0 ? (
                <div className="tbl-wrap"><table className="tbl">
                  <thead><tr><th>Account</th><th className="r">Debit</th><th className="r">Credit</th></tr></thead>
                  <tbody>{j.lines.map((l, i) => <tr key={i}><td>{l.account}</td><td className="r num">{l.debit ?? ""}</td><td className="r num">{l.credit ?? ""}</td></tr>)}</tbody>
                </table></div>
              ) : <p className="faint" style={{ fontSize: 12.5 }}>No general ledger entry at this step.</p>}
              {j.notes && <p className="je-note">{j.notes}</p>}
              {j.assumptions && <p className="je-note faint">Assumptions: {j.assumptions}</p>}
            </div>
          ))}
        </section>
      )}

      {s.sourceIds && s.sourceIds.length > 0 && (
        <section className="tr-sources">
          <h3>Sources for this trace</h3>
          <ul>{s.sourceIds.map((id) => { const x = sources?.get(id); return x ? <li key={id}><a href={x.url} target="_blank" rel="noreferrer">{x.title}</a> <span className="faint">{[x.issuer, fmtDate(x.publicationDate)].filter(Boolean).join(", ")}</span></li> : null; })}</ul>
        </section>
      )}
      <p className="faint" style={{ fontSize: 12.5, margin: "16px 0 0" }}>Spotted something wrong? Each step lists its sources; open them to check, then <button className="linklike" onClick={() => go("rules")}>see the rules registry</button>.</p>
    </article>
  );
}

function Field({ k, v, gap }: { k: string; v?: string | null; gap?: boolean }) {
  if (!v) return null;
  const isGap = gap ?? /not publicly specified|needs verification|not confirmed/i.test(v);
  return <div className="tr-f"><dt>{k}</dt><dd className={isGap ? "gap-text" : ""}>{v}</dd></div>;
}

function StepCard({ st, onRule, ruleName, ruleStatus, srcs }: {
  st: ScenarioStep; onRule: (id: string) => void; ruleName: (id: string) => string; ruleStatus: (id: string) => string | undefined;
  srcs: { id: string; title: string; url: string; issuer?: string; publicationDate?: string }[];
}) {
  return (
    <div className="tr-card glass">
      <div className="tr-card-h">
        <b>{st.actor ?? "Actor not stated"}</b>
        {st.system && <span className="pill t-info">{st.system}</span>}
        {st.branch && <span className="pill t-warn">Branch: {st.branch}</span>}
        {st.timing && <span className="pill t-muted">{st.timing}</span>}
      </div>
      {st.action && <p className="tr-action">{st.action}</p>}
      <dl className="tr-fields">
        <Field k="Message" v={st.messageOrPayload} />
        <Field k="Ledger" v={st.ledgerEffect} />
        <Field k="Controls" v={st.controls} />
        <Field k="Failures" v={st.failures} />
        <Field k="Note" v={st.note} gap={false} />
        <Field k="Gap" v={st.gap} gap />
      </dl>
      {(st.rules?.length || srcs.length) ? (
        <div className="tr-refs">
          {st.rules?.map((r) => <button key={r} className={`pill t-${statusTone(ruleStatus(r))}`} onClick={(e) => { e.stopPropagation(); onRule(r); }} title={prettyStatus(ruleStatus(r))}><Icon name="doc" size={12} />{ruleName(r)}</button>)}
          {srcs.map((x) => <a key={x.id} className="pill t-muted" href={x.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}><Icon name="link" size={12} />{x.issuer ?? x.title}</a>)}
        </div>
      ) : null}
    </div>
  );
}
