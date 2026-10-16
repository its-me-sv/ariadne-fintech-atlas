import { useMemo } from "react";
import { useAtlas, prettyStatus, prettyType, statusTone, isGap } from "../data/store";
import type { AtlasNode, AtlasRule, Claim, Source } from "../data/types";
import { KIND_COLOR, kindOf } from "./kinds";
import { Icon } from "./icons";
import { fmtDate } from "./TopBar";

const CLAIM_TONE: Record<Claim["status"], { label: string; cls: string; color: string }> = {
  verified: { label: "Verified", cls: "t-good", color: "var(--good)" },
  supported: { label: "Secondary", cls: "t-info", color: "#7d95f0" },
  needs_verification: { label: "Needs verification", cls: "t-warn", color: "#e3a43a" },
  conflicting: { label: "Conflicting", cls: "t-bad", color: "var(--bad)" },
};

export function Pill({ status }: { status?: string }) {
  return <span className={`pill t-${statusTone(status)}`}>{prettyStatus(status)}</span>;
}

export function DetailPanel() {
  const { selected, actor, idx, select, showActor } = useAtlas();
  if (actor) {
    return (
      <aside className="detail glass" aria-label="Details">
        <div className="ph">
          <div className="tile-ic" style={{ background: `${actor.kindColor}22`, color: actor.kindColor }}><Icon name="building" size={24} /></div>
          <div><div className="cap">Actor in this trace</div><h2>{actor.title}</h2><div className="op">{actor.sub}</div></div>
          <button className="x" onClick={() => showActor(null)} aria-label="Close details"><Icon name="close" size={18} /></button>
        </div>
        <p className="purpose" style={{ marginTop: 12 }}>{actor.text}</p>
        {actor.links && actor.links.length > 0 && (
          <>
            <div className="sec-h">Related in the atlas</div>
            {actor.links.map((l) => (
              <div className="row" key={l.id}><div className="nm"><button className="link" onClick={() => select(l.id)}>{l.label}</button></div></div>
            ))}
          </>
        )}
      </aside>
    );
  }
  if (!selected || !idx) return null;
  const node = idx.node.get(selected);
  const rule = idx.rule.get(selected);
  if (node) return <NodeDetail node={node} />;
  if (rule) return <RuleDetail rule={rule} />;
  return null;
}

function useEvidence(subjectId: string, extraSourceIds: string[] = []) {
  const { claimsBySubject, sources } = useAtlas();
  return useMemo(() => {
    const claims = claimsBySubject?.get(subjectId) ?? [];
    const ids = new Set<string>(extraSourceIds);
    for (const c of claims) for (const s of c.sourceIds) ids.add(s);
    const srcs: Source[] = [];
    if (sources) for (const id of ids) { const s = sources.get(id); if (s) srcs.push(s); }
    return { claims, sources: srcs, loaded: !!claimsBySubject };
  }, [claimsBySubject, sources, subjectId, extraSourceIds]);
}

function EvidenceBar({ subjectId }: { subjectId: string }) {
  const stats = useAtlas((s) => s.core?.claimStats[subjectId]);
  const total = stats ? Object.values(stats).reduce((a, b) => a + b, 0) : 0;
  if (!total) return null;
  const order: Claim["status"][] = ["verified", "supported", "needs_verification", "conflicting"];
  return (
    <>
      <div className="bar"><span>Claims verified on primary sources</span><span className="num">{stats!.verified ?? 0} of {total}</span></div>
      <div className="track" role="img" aria-label={order.map((k) => `${stats![k] ?? 0} ${CLAIM_TONE[k].label.toLowerCase()}`).join(", ")}>
        {order.map((k) => (stats![k] ? <i key={k} style={{ width: `${(stats![k] / total) * 100}%`, background: CLAIM_TONE[k].color }} /> : null))}
      </div>
    </>
  );
}

function Claims({ subjectId, extra }: { subjectId: string; extra?: string[] }) {
  const ev = useEvidence(subjectId, extra);
  if (!ev.loaded) return <p className="faint" style={{ fontSize: 12.5, marginTop: 8 }}>Loading evidence</p>;
  return (
    <>
      {ev.claims.length > 0 && <div className="sec-h">Sourced claims<span className="num">{ev.claims.length}</span></div>}
      {ev.claims.slice(0, 40).map((c) => (
        <div className="claim" key={c.id}>
          {c.claim}
          <div className="src">
            <span className={`pill ${CLAIM_TONE[c.status].cls}`}>{CLAIM_TONE[c.status].label}</span>
            {c.sourceIds.slice(0, 2).map((sid) => <SourceLink key={sid} id={sid} />)}
          </div>
        </div>
      ))}
      {ev.sources.length > 0 && <div className="sec-h">Sources<span className="num">{ev.sources.length}</span></div>}
      {ev.sources.slice(0, 30).map((s) => (
        <div className="row" key={s.id}>
          <div className="nm">
            <a href={s.url} target="_blank" rel="noreferrer" style={{ color: "var(--ink)", fontWeight: 600, textDecoration: "none" }}>{s.title}</a>
            <small>{[s.issuer, fmtDate(s.publicationDate ?? s.lastUpdatedDate ?? s.effectiveDate), s.translationNote].filter(Boolean).join(", ")}</small>
          </div>
          <span className={`pill ${s.sourceClass === "secondary_analysis" ? "t-info" : s.opened ? "t-good" : "t-muted"}`}>
            {s.sourceClass === "secondary_analysis" ? "Secondary" : s.opened ? "Primary, opened" : "Not opened"}
          </span>
        </div>
      ))}
    </>
  );
}

function SourceLink({ id }: { id: string }) {
  const s = useAtlas((st) => st.sources?.get(id));
  if (!s) return null;
  return <a href={s.url} target="_blank" rel="noreferrer">{s.issuer ?? s.title}</a>;
}

function NodeDetail({ node }: { node: AtlasNode }) {
  const { idx, select } = useAtlas();
  const kind = kindOf(node.type);
  const color = KIND_COLOR[kind];
  const rules = idx?.rulesByNode.get(node.id) ?? [];
  const regs = (node.regulatedBy ?? []).map((r) => idx?.node.get(r)).filter(Boolean) as AtlasNode[];
  const gaps = [node.settlementAsset, node.settlementModel, node.hours, node.clearingModel].filter((v) => v && isGap(v)).length + (node.unknowns?.length ?? 0);
  const edges = idx?.edgesByNode.get(node.id) ?? [];
  const tiles: [string, string | undefined][] = [
    ["Settlement asset", node.settlementAsset], ["Settlement model", node.settlementModel],
    ["Hours", node.hours], ["Clearing", node.clearingModel], ["Limits", node.limits], ["Finality", node.finalityNotes],
  ];
  return (
    <aside className="detail glass" aria-label={`Details for ${node.canonicalName}`}>
      <div className="ph">
        <div className="tile-ic" style={{ background: `${color}22`, color }}><Icon name="building" size={24} /></div>
        <div style={{ minWidth: 0 }}>
          <div className="cap">{prettyType(node.type)}, {node.id}</div>
          <h2>{node.canonicalName}</h2>
          {(node.operator || regs.length > 0) && (
            <div className="op">{[node.operator && `Operated by ${node.operator}`, regs.length && `regulated by ${regs.map((r) => r.canonicalName).join(", ")}`].filter(Boolean).join(", ")}</div>
          )}
        </div>
        <button className="x" onClick={() => select(null)} aria-label="Close details"><Icon name="close" size={18} /></button>
      </div>
      <div className="pills">
        <Pill status={node.status} />
        {node.jurisdictions?.map((j) => <span key={j} className="pill t-muted">{j}</span>)}
        {gaps > 0 && <span className="pill t-warn">{gaps} open {gaps === 1 ? "gap" : "gaps"}</span>}
        {node.stub && <span className="pill t-warn">Referenced, not researched</span>}
      </div>
      {node.purpose && <p className="purpose">{node.purpose}</p>}
      {node.doesNot && <p className="doesnot"><b>Does not:</b> {node.doesNot}</p>}
      <div className="tiles">
        {tiles.filter(([, v]) => v).slice(0, 4).map(([k, v]) => (
          <div className="card" key={k}><small>{k}</small><b className={isGap(v) ? "gap-text" : ""}>{v}</b></div>
        ))}
      </div>
      <EvidenceBar subjectId={node.id} />
      {node.messageStandards && node.messageStandards.length > 0 && (
        <><div className="sec-h">Messages and standards</div><ul className="list-plain">{node.messageStandards.map((m) => <li key={m}>{m}</li>)}</ul></>
      )}
      {node.failureModes && node.failureModes.length > 0 && (
        <><div className="sec-h">Failure paths</div><ul className="list-plain">{node.failureModes.map((m) => <li key={m}>{m}</li>)}</ul></>
      )}
      {rules.length > 0 && (
        <>
          <div className="sec-h">Rules that govern it<span className="num">{rules.length} linked</span></div>
          {rules.slice(0, 8).map((r) => (
            <div className="row" key={r.id}>
              <div className="nm"><button className="link" onClick={() => select(r.id)}>{r.canonicalName}</button><small>{prettyType(r.instrumentType ?? "rule")}{r.dates?.effective ? `, effective ${fmtDate(r.dates.effective)}` : ""}</small></div>
              <Pill status={r.effectiveStatus} />
            </div>
          ))}
        </>
      )}
      {edges.length > 0 && (
        <>
          <div className="sec-h">Connections<span className="num">{edges.length}</span></div>
          {edges.slice(0, 10).map((e) => {
            const otherId = e.from === node.id ? e.to : e.from;
            const other = idx?.node.get(otherId);
            return (
              <div className="row" key={e.id}>
                <span className="pill" style={{ background: `var(--flow-${e.flowClass}, #94a3b8)`, color: "#fff" }}>{e.flowClass}</span>
                <div className="nm">
                  <span className="faint">{e.from === node.id ? "" : `${other?.canonicalName ?? otherId} `}{e.verb}{e.from === node.id ? " " : ""}</span>
                  {e.from === node.id && <button className="link" onClick={() => select(otherId)}>{other?.canonicalName ?? otherId}</button>}
                </div>
              </div>
            );
          })}
        </>
      )}
      {node.unknowns && node.unknowns.length > 0 && (
        <><div className="sec-h">Open questions</div><ul className="list-plain">{node.unknowns.map((u) => <li key={u} className="gap-text">{u}</li>)}</ul></>
      )}
      <Claims subjectId={node.id} extra={node.sourceIds} />
    </aside>
  );
}

function RuleDetail({ rule }: { rule: AtlasRule }) {
  const { idx, select } = useAtlas();
  const affects = (rule.affects ?? []).map((a) => idx?.node.get(a)).filter(Boolean) as AtlasNode[];
  return (
    <aside className="detail glass" aria-label={`Details for ${rule.canonicalName}`}>
      <div className="ph">
        <div className="tile-ic" style={{ background: "#b4530922", color: "#b45309" }}><Icon name="doc" size={24} /></div>
        <div style={{ minWidth: 0 }}>
          <div className="cap">{prettyType(rule.instrumentType ?? "rule")}, {rule.id}</div>
          <h2>{rule.canonicalName}</h2>
          {rule.issuer && <div className="op">Issued by {rule.issuer}</div>}
        </div>
        <button className="x" onClick={() => select(null)} aria-label="Close details"><Icon name="close" size={18} /></button>
      </div>
      <div className="pills">
        <Pill status={rule.effectiveStatus} />
        {rule.bindingLevel && <span className="pill t-muted">{rule.bindingLevel.replace(/_/g, " ")}</span>}
        {rule.jurisdictions?.map((j) => <span key={j} className="pill t-muted">{j}</span>)}
      </div>
      {rule.applicability && <p className="purpose">{rule.applicability}</p>}
      <div className="tiles">
        <div className="card"><small>Version</small><b>{rule.version ?? "Not stated"}</b></div>
        <div className="card"><small>Effective</small><b>{rule.dates?.effective ? fmtDate(rule.dates.effective) : "Not stated"}</b></div>
      </div>
      {rule.dates?.transition && rule.dates.transition.length > 0 && (
        <>
          <div className="sec-h">Dates</div>
          {rule.dates.transition.map((t, i) => (
            <div className="row" key={i}><span className="num faint" style={{ width: 86, flex: "none" }}>{t.date ? fmtDate(t.date) : "No date"}</span><div className="nm">{t.what}</div></div>
          ))}
        </>
      )}
      {affects.length > 0 && (
        <>
          <div className="sec-h">Applies to<span className="num">{affects.length}</span></div>
          {affects.map((n) => (
            <div className="row" key={n.id}><div className="nm"><button className="link" onClick={() => select(n.id)}>{n.canonicalName}</button><small>{prettyType(n.type)}</small></div><Pill status={n.status} /></div>
          ))}
        </>
      )}
      <EvidenceBar subjectId={rule.id} />
      <Claims subjectId={rule.id} extra={rule.sourceIds} />
    </aside>
  );
}
