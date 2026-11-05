import { useEffect, useMemo, useRef, useState } from "react";
import { JURS, useAtlas, inJur } from "../data/store";
import type { Jur } from "../data/types";
import { go, href, jurToken, useRoute } from "../router";
import { Icon } from "./icons";
import { Flag } from "./Flag";

const KIND_BADGE = { node: ["N", "#3d63ea"], rule: ["R", "#b45309"], scenario: ["T", "#14b8a6"] } as const;

export function TopBar() {
  const { core, idx, scope, setScope, select } = useAtlas();
  const route = useRoute();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const [scopeOpen, setScopeOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") { e.preventDefault(); input.current?.focus(); }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);

  const hits = useMemo(() => (idx && q.trim().length > 1 ? idx.search.search(q).slice(0, 10) : []), [idx, q]);

  const choose = (h: { id: string; kind: string }) => {
    setOpen(false); setQ("");
    if (h.kind === "scenario") go("traces", h.id);
    else select(h.id);
  };

  const counts = useMemo(() => {
    if (!core) return null;
    const nodes = core.nodes.filter((n) => !n.stub && inJur(n.jurisdictions, scope)).length;
    const rules = core.rules.filter((r) => inJur(r.jurisdictions, scope)).length;
    return { nodes, rules };
  }, [core, scope]);

  const pickScope = (j: Jur) => {
    setScope(j); setScopeOpen(false);
    if (route.view === "overview" || route.view === "graph") go(route.view, jurToken(j));
  };
  const cur = JURS.find((j) => j.id === scope)!;

  return (
    <header className="topbar">
      <a className="logo" href={href("overview", jurToken(scope))} aria-label="Ariadne, Fintech Atlas home">
        <LogoMark />
        <span className="logo-text"><b>Ariadne</b><small>Fintech Atlas</small></span>
      </a>
      <div className="search" role="combobox" aria-expanded={open && hits.length > 0} aria-haspopup="listbox">
        <Icon name="search" size={16} />
        <input
          ref={input} id="atlas-search" type="search" value={q} placeholder="Search rails, rules, institutions, traces"
          aria-label="Search the atlas" autoComplete="off"
          onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            if (e.key === "Enter" && hits[active]) choose(hits[active] as never);
            if (e.key === "Escape") { setOpen(false); input.current?.blur(); }
          }}
        />
        <kbd>/</kbd>
        {open && hits.length > 0 && (
          <div className="results" role="listbox">
            {hits.map((h, i) => {
              const [letter, color] = KIND_BADGE[h.kind as keyof typeof KIND_BADGE];
              return (
                <button key={h.id} role="option" aria-selected={i === active} onMouseDown={() => choose(h as never)}>
                  <span className="kind-dot" style={{ background: color }}>{letter}</span>
                  <span><b>{h.title}</b><small>{h.sub}</small></span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="scope">
        <button aria-haspopup="menu" aria-expanded={scopeOpen} onClick={() => setScopeOpen((o) => !o)}>
          <span className="scope-flag"><Flag code={scope} w={24} /></span>
          <span><b>{cur.label}</b><small className="num">{counts ? `${counts.nodes} systems, ${counts.rules} rules mapped` : "Loading"}</small></span>
          <Icon name="chevron" size={16} />
        </button>
        {scopeOpen && (
          <div className="scope-menu" role="menu">
            {JURS.map((j) => (
              <button key={j.id} role="menuitem" aria-current={j.id === scope} onClick={() => pickScope(j.id)}>
                <span className="scope-flag"><Flag code={j.id} w={22} /></span>
                <span style={{ fontWeight: 700 }}>{j.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="asof" title="All facts were checked against sources on this date"><i />Evidence {core ? fmtDate(core.asOf) : ""}</div>
    </header>
  );
}

export function LogoMark({ size = 30 }: { size?: number }) {
  const s = Math.round(size * 0.53);
  return (
    <i className="logo-mark" style={{ width: size, height: size }}>
      <svg width={s} height={s} viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1 14.5 4.7v6.6L8 15 1.5 11.3V4.7z" fill="none" stroke="#fff" strokeWidth="1.8" /><path d="M8 8v7M1.5 4.7 8 8l6.5-3.3" stroke="#fff" strokeWidth="1.4" fill="none" /></svg>
    </i>
  );
}

export function fmtDate(d?: string | null) {
  if (!d) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (!m) return d;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${Number(m[3])} ${months[Number(m[2]) - 1]} ${m[1]}`;
}
