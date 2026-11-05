import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useAtlas, inJur, prettyStatus, statusTone, prettyType, JURS } from "../data/store";
import type { Jur } from "../data/types";
import { worldFor, type Building } from "../world/worlds";
import { FLOW_COLOR, type CamCmd } from "../world/flow";
import { KIND_COLOR, type Kind } from "../ui/kinds";
import { Icon } from "../ui/icons";
import { href, go, jurToken } from "../router";
import { fmtDate } from "../ui/TopBar";
import { TravelOverlay, useTravel } from "./Travel";

const Scene = lazy(() => import("../world/Scene"));
const Globe = lazy(() => import("../world/Globe"));

const RAIL_TYPES = new Set(["rail", "rtgs", "ach", "instant_payment_system", "card_scheme"]);

const PANELS_KEY = "ariadne.overview.hidePanels";
function readHidden() {
  try { return localStorage.getItem(PANELS_KEY) === "1"; } catch { return false; }
}
function saveHidden(v: boolean) {
  try { localStorage.setItem(PANELS_KEY, v ? "1" : "0"); } catch { /* storage blocked: keep the choice for this visit only */ }
}

function useReducedMotion() {
  const [r, setR] = useState(() => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const m = matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setR(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return r;
}

export default function Overview() {
  const { core, idx, scope, select, showActor, selected, actor } = useAtlas();
  const world = scope === "GLOBAL" ? null : worldFor(scope);
  const scenario = world ? idx?.scenario.get(world.scenarioId) : undefined;
  const stepNums = useMemo(() => (scenario ? scenario.steps.map((s) => s.n) : []), [scenario]);
  const [stepN, setStepN] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [cmd, setCmd] = useState<CamCmd>(null);
  const reduced = useReducedMotion();
  const [panelsHidden, setPanelsHidden] = useState(readHidden);
  const togglePanels = () => setPanelsHidden((h) => { saveHidden(!h); return !h; });
  const panelOpen = !!(selected || actor);
  const travel = useTravel(scope, reduced);
  // the canvas lags the scope while the travel overlay fades in over the old city
  const sceneWorld = travel.sceneScope === "GLOBAL" ? null : worldFor(travel.sceneScope);
  useEffect(() => { setCmd(null); }, [scope]);
  const [wide, setWide] = useState(() => innerWidth > 820);
  useEffect(() => { const on = () => setWide(innerWidth > 820); addEventListener("resize", on); return () => removeEventListener("resize", on); }, []);

  // start each world on the step that best shows "instant is not settled" (the step before interbank settlement), or step 1
  useEffect(() => {
    if (!world || !scenario) { setStepN(null); return; }
    const first = Object.entries(world.steps).find(([, s]) => s.routes.some((r) => r.path === "switch_payeeBank"))?.[0];
    setStepN(first ? Number(first) : stepNums[0]);
    setPlaying(!reduced);
  }, [world, scenario, stepNums, reduced]);

  useEffect(() => {
    if (!playing || stepN === null || stepNums.length === 0) return;
    const t = setTimeout(() => {
      const i = stepNums.indexOf(stepN);
      setStepN(stepNums[(i + 1) % stepNums.length]);
    }, 5200);
    return () => clearTimeout(t);
  }, [playing, stepN, stepNums]);

  const kpis = useMemo(() => {
    if (!core) return null;
    const nodes = core.nodes.filter((n) => !n.stub && inJur(n.jurisdictions, scope));
    const prio: Record<string, number> = { instant_payment_system: 0, rtgs: 1, ach: 2, rail: 3, card_scheme: 4 };
    const rails = nodes.filter((n) => RAIL_TYPES.has(n.type)).sort((a, b) => (prio[a.type] ?? 9) - (prio[b.type] ?? 9));
    const rules = core.rules.filter((r) => inJur(r.jurisdictions, scope));
    const inForce = rules.filter((r) => r.effectiveStatus === "in_force").length;
    const upcoming = rules.filter((r) => r.effectiveStatus === "adopted_not_effective" || r.effectiveStatus === "proposed").length;
    let claims = 0, verified = 0;
    const ids = new Set([...nodes.map((n) => n.id), ...rules.map((r) => r.id)]);
    for (const [k, v] of Object.entries(core.claimStats)) {
      if (scope !== "GLOBAL" && !ids.has(k)) continue;
      for (const [s, c] of Object.entries(v)) { claims += c; if (s === "verified") verified += c; }
    }
    const live = rails.filter((r) => r.status === "production").length;
    return { rails, live, rules: rules.length, inForce, upcoming, claims, verified, nodes: nodes.length };
  }, [core, scope]);

  const onPick = (b: Building) => {
    if (b.nodeId) { select(b.nodeId); return; }
    const color = b.kind === "home" ? KIND_COLOR.person : KIND_COLOR[b.kind as Kind];
    showActor({
      title: b.label, sub: b.sub, text: b.text ?? "", kindColor: color,
      links: (b.links ?? []).map((id) => ({ id, label: idx?.node.get(id)?.canonicalName ?? id })),
    });
  };

  const step = world && stepN !== null && sceneWorld === world ? world.steps[stepN] ?? null : null;
  const stepData = scenario?.steps.find((s) => s.n === stepN);
  const allSteps = sceneWorld ? Object.values(sceneWorld.steps) : [];
  const shiftX = !wide ? 0 : panelOpen ? 150 : -40;

  return (
    <main className="stage ov">
      <h1 className="sr-only">{world ? `${JURS.find((j) => j.id === scope)?.label ?? scope} payment infrastructure` : "Global financial infrastructure"}</h1>
      <p className="sr-only">The 3D city is a visual summary. Every system in it can also be reached from search, the Rails, Rules and Sources table on wide screens, and the Graph and Compare pages. The trace controls below step through the same transaction.</p>
      <div className="ov-canvas" aria-hidden="true">
        <Suspense fallback={travel.trip ? null : <div className="loading">{world ? "Building the city" : "Drawing the globe"}</div>}>
          {sceneWorld ? (
            <Scene key={sceneWorld.jur} buildings={sceneWorld.buildings} step={step} allSteps={allSteps} onPick={onPick} cmd={cmd} shiftX={shiftX} reducedMotion={reduced}
              onReady={() => travel.ready(sceneWorld.jur)} />
          ) : (
            <Globe onPick={(j: Jur) => go("overview", jurToken(j))} cmd={cmd} reducedMotion={reduced} panelsHidden={panelsHidden} rightInset={panelOpen && wide ? 414 : 0} />
          )}
        </Suspense>
      </div>

      {travel.trip && <TravelOverlay trip={travel.trip} reduced={reduced} onSkip={travel.skip} />}
      <p className="sr-only" aria-live="polite">{travel.announce}</p>

      {kpis && (
        <section className={`ov-kpis ov-fade${panelsHidden ? " is-hidden" : ""}`} aria-label="Key figures" aria-hidden={panelsHidden || undefined}>
          <Kpi icon="rail" label="Payment rails" value={String(kpis.rails.length)} delta={`${kpis.live} live`} sub={kpis.rails.slice(0, 4).map((r) => r.aliases?.[0] ?? r.canonicalName.split(" (")[0]).join(", ")} />
          <Kpi icon="rules" label="Rules tracked" value={String(kpis.rules)} delta={`${kpis.inForce} in force`} sub={`${kpis.upcoming} proposed or not yet effective`} />
          <Kpi icon="check" label="Claims verified" value={`${kpis.claims ? Math.round((kpis.verified / kpis.claims) * 100) : 0}%`} delta={`${kpis.verified} of ${kpis.claims}`} sub="Primary source opened and read" />
        </section>
      )}

      {world && <div className="ov-legend glass" aria-label="Flow legend">
        {(["value", "message", "data", "control"] as const).map((f) => (
          <span key={f}><i className={`lg lg-${f}`} style={{ borderColor: FLOW_COLOR[f] }} />{f === "value" ? "Money settles" : f === "message" ? "Payment message" : f === "data" ? "Data or check" : "Control"}</span>
        ))}
      </div>}

      <div className={`ov-mapctl glass${panelOpen ? " shifted" : ""}`} role="toolbar" aria-label="Map controls">
        <button aria-label="Zoom in" onClick={() => setCmd({ type: "in", n: Date.now() })}><Icon name="plus" size={18} /></button>
        <button aria-label="Zoom out" onClick={() => setCmd({ type: "out", n: Date.now() })}><Icon name="minus" size={18} /></button>
        <hr />
        <button aria-label="Rotate left" onClick={() => setCmd({ type: "left", n: Date.now() })}><Icon name="rotl" size={18} /></button>
        <button aria-label="Rotate right" onClick={() => setCmd({ type: "right", n: Date.now() })}><Icon name="rotr" size={18} /></button>
        <hr />
        <button aria-label="Reset view" onClick={() => setCmd({ type: "reset", n: Date.now() })}><Icon name="home" size={18} /></button>
        <hr />
        <button aria-pressed={panelsHidden} aria-label={panelsHidden ? "Show panels" : "Hide panels"} title={panelsHidden ? "Show panels" : "Hide panels"} onClick={togglePanels}>
          <Icon name={panelsHidden ? "eye" : "eyeOff"} size={18} />
        </button>
      </div>

      {world && scenario && stepN !== null && (
        <section className="ov-trace glass" aria-label="Transaction trace">
          <div className="tr-head">
            <Icon name="van" size={18} />
            <b>Transaction trace</b>
            <span className="tr-name">{scenario.name}</span>
            <div className="tr-ctl">
              <button aria-label="Previous step" onClick={() => { setPlaying(false); setStepN(stepNums[Math.max(0, stepNums.indexOf(stepN) - 1)]); }}><Icon name="prev" size={16} /></button>
              <button aria-label={playing ? "Pause" : "Play"} onClick={() => setPlaying((p) => !p)}><Icon name={playing ? "pause" : "play"} size={16} /></button>
              <button aria-label="Next step" onClick={() => { setPlaying(false); setStepN(stepNums[Math.min(stepNums.length - 1, stepNums.indexOf(stepN) + 1)]); }}><Icon name="next" size={16} /></button>
            </div>
          </div>
          <ol className="tr-steps" style={{ ["--n" as string]: stepNums.length }}>
            {stepNums.map((n) => {
              const st = n < stepN ? "done" : n === stepN ? "now" : "todo";
              return (
                <li key={n} className={st}>
                  <button onClick={() => { setPlaying(false); setStepN(n); }} aria-current={n === stepN ? "step" : undefined} aria-label={`Step ${n}`}>
                    {st === "done" ? <Icon name="check" size={14} stroke={2.4} /> : n}
                  </button>
                </li>
              );
            })}
          </ol>
          {stepData && (
            <div className="tr-detail" aria-live={playing ? "off" : "polite"}>
              <div className="tr-who"><b>Step {stepData.n}</b><span>{[stepData.actor, stepData.system].filter(Boolean).join(" on ")}</span></div>
              <p>{stepData.action}</p>
              {stepData.ledgerEffect && <p className="tr-ledger"><b>Ledger:</b> {stepData.ledgerEffect}</p>}
            </div>
          )}
          <a className="tr-more" href={href("traces", scenario.id)}>Open the full trace with controls, failures and sources</a>
        </section>
      )}

      {kpis && <ScopeTable scope={scope} hidden={panelsHidden} />}
    </main>
  );
}

function Kpi({ icon, label, value, delta, sub }: { icon: string; label: string; value: string; delta: string; sub: string }) {
  return (
    <div className="kpi glass">
      <div className="ic"><Icon name={icon} size={20} /></div>
      <div style={{ minWidth: 0 }}>
        <small>{label}</small>
        <strong className="num">{value}<em>{delta}</em></strong>
        <span>{sub}</span>
      </div>
    </div>
  );
}

function ScopeTable({ scope, hidden }: { scope: Jur; hidden: boolean }) {
  const { core, sources, select } = useAtlas();
  const [tab, setTab] = useState<"rails" | "rules" | "sources">("rails");
  const rails = useMemo(() => (core ? core.nodes.filter((n) => !n.stub && RAIL_TYPES.has(n.type) && inJur(n.jurisdictions, scope))
    .sort((a, b) => (a.status === "production" ? 0 : 1) - (b.status === "production" ? 0 : 1)) : []), [core, scope]);
  const rules = useMemo(() => (core ? core.rules.filter((r) => inJur(r.jurisdictions, scope))
    .sort((a, b) => (b.dates?.effective ?? "").localeCompare(a.dates?.effective ?? "")) : []), [core, scope]);
  const srcs = useMemo(() => (sources ? [...sources.values()].filter((s) => scope === "GLOBAL" || inJur([s.jurisdiction ?? ""], scope))
    .sort((a, b) => (b.publicationDate ?? "").localeCompare(a.publicationDate ?? "")) : []), [sources, scope]);
  return (
    <section className={`ov-table glass ov-fade${hidden ? " is-hidden" : ""}`} aria-label="Rails, rules and sources" aria-hidden={hidden || undefined}>
      <div className="seg" role="tablist">
        <button role="tab" aria-pressed={tab === "rails"} aria-selected={tab === "rails"} onClick={() => setTab("rails")}>Rails <span className="faint num">{rails.length}</span></button>
        <button role="tab" aria-pressed={tab === "rules"} aria-selected={tab === "rules"} onClick={() => setTab("rules")}>Rules <span className="faint num">{rules.length}</span></button>
        <button role="tab" aria-pressed={tab === "sources"} aria-selected={tab === "sources"} onClick={() => setTab("sources")}>Sources <span className="faint num">{sources ? srcs.length : ""}</span></button>
      </div>
      <div className="ov-rows">
        {tab === "rails" && rails.map((n) => (
          <button key={n.id} className="ov-row" onClick={() => select(n.id)}>
            <span className="nm"><b>{n.aliases?.[0] && n.aliases[0].length < 12 ? n.aliases[0] : n.canonicalName}</b><small>{n.operator ?? prettyType(n.type)}</small></span>
            <span className="md">{n.settlementModel && n.settlementModel !== "not publicly specified" ? n.settlementModel : prettyType(n.type)}{n.hours && !/not publicly/.test(n.hours) ? `, ${n.hours}` : ""}</span>
            <span className={`pill t-${statusTone(n.status)}`}>{prettyStatus(n.status)}</span>
          </button>
        ))}
        {tab === "rules" && rules.map((r) => (
          <button key={r.id} className="ov-row" onClick={() => select(r.id)}>
            <span className="nm"><b>{r.canonicalName}</b><small>{prettyType(r.instrumentType ?? "rule")}{r.dates?.effective ? `, effective ${fmtDate(r.dates.effective)}` : ""}</small></span>
            <span className={`pill t-${statusTone(r.effectiveStatus)}`}>{prettyStatus(r.effectiveStatus)}</span>
          </button>
        ))}
        {tab === "sources" && (sources ? srcs.slice(0, 120).map((s) => (
          <a key={s.id} className="ov-row" href={s.url} target="_blank" rel="noreferrer">
            <span className="nm"><b>{s.title}</b><small>{[s.issuer, fmtDate(s.publicationDate)].filter(Boolean).join(", ")}</small></span>
            <span className={`pill ${s.sourceClass === "secondary_analysis" ? "t-info" : s.opened ? "t-good" : "t-muted"}`}>{s.sourceClass === "secondary_analysis" ? "Secondary" : s.opened ? "Primary" : "Not opened"}</span>
          </a>
        )) : <p className="faint" style={{ padding: 10 }}>Loading sources</p>)}
      </div>
    </section>
  );
}
