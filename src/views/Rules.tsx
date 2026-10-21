import { useMemo, useState } from "react";
import { useAtlas, prettyType, prettyStatus } from "../data/store";
import { Section, StatusPill } from "../ui/bits";
import { fmtDate } from "../ui/TopBar";

const BINDING: Record<string, string> = {
  binding_law: "Binding law", binding_scheme_rule: "Scheme rule", mandatory_standard_by_reference: "Standard made mandatory",
  advisory: "Advisory", voluntary: "Voluntary", proposed: "Proposed",
};

export default function Rules() {
  const { core, select } = useAtlas();
  const [q, setQ] = useState("");
  const [jur, setJur] = useState("all");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [binding, setBinding] = useState("all");
  const rules = core?.rules ?? [];
  const asOf = core?.asOf ?? "2026-10-15";

  const opts = useMemo(() => ({
    jur: [...new Set(rules.flatMap((r) => r.jurisdictions ?? []))].sort(),
    type: [...new Set(rules.map((r) => r.instrumentType ?? "rule"))].sort(),
    status: [...new Set(rules.map((r) => r.effectiveStatus ?? "unknown"))].sort(),
    binding: [...new Set(rules.map((r) => r.bindingLevel ?? "unknown"))].sort(),
  }), [rules]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rules.filter((r) =>
      (jur === "all" || (r.jurisdictions ?? []).includes(jur)) &&
      (type === "all" || (r.instrumentType ?? "rule") === type) &&
      (status === "all" || (r.effectiveStatus ?? "unknown") === status) &&
      (binding === "all" || (r.bindingLevel ?? "unknown") === binding) &&
      (!t || `${r.canonicalName} ${r.issuer ?? ""} ${r.id} ${r.applicability ?? ""}`.toLowerCase().includes(t)),
    ).sort((a, b) => (b.dates?.effective ?? b.dates?.published ?? "").localeCompare(a.dates?.effective ?? a.dates?.published ?? ""));
  }, [rules, q, jur, type, status, binding]);

  const upcoming = useMemo(() => {
    const out: { date: string; what: string; id: string; name: string; jur: string }[] = [];
    for (const r of rules) {
      const j = (r.jurisdictions ?? []).join(", ");
      if (r.dates?.effective && r.dates.effective > asOf) out.push({ date: r.dates.effective, what: "Takes effect", id: r.id, name: r.canonicalName, jur: j });
      for (const t of r.dates?.transition ?? []) if (t.date && t.date > asOf) out.push({ date: t.date, what: t.what ?? "Transition date", id: r.id, name: r.canonicalName, jur: j });
    }
    return out.sort((a, b) => a.date.localeCompare(b.date));
  }, [rules, asOf]);

  const months = useMemo(() => {
    const g = new Map<string, typeof upcoming>();
    for (const u of upcoming) { const k = u.date.slice(0, 7); g.set(k, [...(g.get(k) ?? []), u]); }
    return [...g.entries()];
  }, [upcoming]);
  const monthName = (k: string) => { const [y, m] = k.split("-"); return `${["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][Number(m) - 1]} ${y}`; };

  return (
    <main className="page rules">
      <div className="page-head">
        <div>
          <h1>Standards and rules</h1>
          <p>Laws, regulator directions, scheme rulebooks, standards and proposals, each with its binding level, status and dates. A proposal is never shown as law, and a standard is binding only where a law or scheme makes it so.</p>
        </div>
      </div>

      <Section title="Coming up" lead={`Dated changes after the evidence date (${fmtDate(asOf)}), in order. Select one to see what it affects.`}>
        <div className="upc glass">
          {months.length === 0 && <p className="faint">No dated changes after the evidence date.</p>}
          {months.map(([k, items]) => (
            <div className="upc-m" key={k}>
              <h3>{monthName(k)}</h3>
              <ul>
                {items.map((u, i) => (
                  <li key={`${u.id}-${i}`}>
                    <span className="num upc-d">{fmtDate(u.date)}</span>
                    <button className="linklike-plain" onClick={() => select(u.id)}><b>{u.name}</b></button>
                    <span className="faint"> {u.jur ? `(${u.jur}) ` : ""}{u.what}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Registry" lead={`${shown.length} of ${rules.length} instruments match.`}>
        <div className="filters">
          <input id="rules-q" type="search" placeholder="Filter by name, issuer or what it covers" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter rules" />
          <select id="rules-jur" value={jur} onChange={(e) => setJur(e.target.value)} aria-label="Jurisdiction"><option value="all">All jurisdictions</option>{opts.jur.map((o) => <option key={o} value={o}>{o}</option>)}</select>
          <select id="rules-type" value={type} onChange={(e) => setType(e.target.value)} aria-label="Instrument type"><option value="all">All instrument types</option>{opts.type.map((o) => <option key={o} value={o}>{prettyType(o)}</option>)}</select>
          <select id="rules-status" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status"><option value="all">Any status</option>{opts.status.map((o) => <option key={o} value={o}>{prettyStatus(o)}</option>)}</select>
          <select id="rules-binding" value={binding} onChange={(e) => setBinding(e.target.value)} aria-label="Binding level"><option value="all">Any binding level</option>{opts.binding.map((o) => <option key={o} value={o}>{BINDING[o] ?? o.replace(/_/g, " ")}</option>)}</select>
        </div>
        <div className="tbl-wrap glass">
          <table className="tbl rules-tbl">
            <thead><tr><th>Instrument</th><th>Type</th><th>Issuer</th><th>Where</th><th>Binding</th><th>Status</th><th>Effective</th></tr></thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id}>
                  <td><button className="linklike-plain" onClick={() => select(r.id)}><b>{r.canonicalName}</b></button>{r.version && <small className="faint"> {r.version}</small>}</td>
                  <td>{prettyType(r.instrumentType ?? "rule")}</td>
                  <td>{r.issuer ?? <span className="faint">Not stated</span>}</td>
                  <td>{(r.jurisdictions ?? []).join(", ")}</td>
                  <td>{BINDING[r.bindingLevel ?? ""] ?? (r.bindingLevel ?? "").replace(/_/g, " ")}</td>
                  <td><StatusPill status={r.effectiveStatus} /></td>
                  <td className="num">{r.dates?.effective ? fmtDate(r.dates.effective) : <span className="faint">Not stated</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </main>
  );
}
