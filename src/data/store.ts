import { create } from "zustand";
import MiniSearch from "minisearch";
import type { AtlasEdge, AtlasNode, AtlasRule, Claim, Core, Jur, Scenario, Source } from "./types";

export const JURS: { id: Jur; label: string; codes: string[] }[] = [
  { id: "GLOBAL", label: "Global", codes: ["GLOBAL"] },
  { id: "IN", label: "India", codes: ["IN"] },
  { id: "UK", label: "United Kingdom", codes: ["UK", "GB"] },
  { id: "US", label: "United States", codes: ["US"] },
  { id: "EU", label: "EU and euro area", codes: ["EU", "EA"] },
  { id: "SG", label: "Singapore", codes: ["SG"] },
  { id: "CN", label: "Mainland China", codes: ["CN"] },
];

export const jurCodes = (j: Jur) => JURS.find((x) => x.id === j)?.codes ?? [j];
export const inJur = (codes: string[] | undefined, j: Jur) => {
  if (j === "GLOBAL") return true;
  const want = jurCodes(j);
  return (codes ?? []).some((c) => want.includes(c));
};

export interface ActorInfo { title: string; sub: string; text: string; kindColor: string; links?: { label: string; id: string }[] }

export interface SearchHit { id: string; kind: "node" | "rule" | "scenario"; title: string; sub: string }

interface Indexes {
  node: Map<string, AtlasNode>;
  rule: Map<string, AtlasRule>;
  scenario: Map<string, Scenario>;
  edgesByNode: Map<string, AtlasEdge[]>;
  rulesByNode: Map<string, AtlasRule[]>;
  search: MiniSearch<SearchHit & { text: string }>;
}

interface State {
  core: Core | null;
  idx: Indexes | null;
  claims: Claim[] | null;
  sources: Map<string, Source> | null;
  claimsBySubject: Map<string, Claim[]> | null;
  error: string | null;
  selected: string | null; // node, rule or actor key shown in the detail panel
  select: (id: string | null) => void;
  scope: Jur;
  setScope: (j: Jur) => void;
  actor: ActorInfo | null; // scenario actors that are not dataset nodes (a payer, "Bank A")
  showActor: (a: ActorInfo | null) => void;
  load: () => Promise<void>;
}

function buildIndexes(core: Core): Indexes {
  const node = new Map(core.nodes.map((n) => [n.id, n]));
  const rule = new Map(core.rules.map((r) => [r.id, r]));
  const scenario = new Map(core.scenarios.map((s) => [s.id, s]));
  const edgesByNode = new Map<string, AtlasEdge[]>();
  for (const e of core.edges) {
    for (const k of [e.from, e.to]) {
      const a = edgesByNode.get(k) ?? [];
      a.push(e);
      edgesByNode.set(k, a);
    }
  }
  const rulesByNode = new Map<string, AtlasRule[]>();
  for (const r of core.rules) for (const a of r.affects ?? []) {
    const list = rulesByNode.get(a) ?? [];
    list.push(r);
    rulesByNode.set(a, list);
  }
  for (const n of core.nodes) for (const rid of n.relatedRules ?? []) {
    const r = rule.get(rid);
    if (!r) continue;
    const list = rulesByNode.get(n.id) ?? [];
    if (!list.includes(r)) list.push(r);
    rulesByNode.set(n.id, list);
  }
  const search = new MiniSearch<SearchHit & { text: string }>({
    fields: ["title", "text"],
    storeFields: ["id", "kind", "title", "sub"],
    searchOptions: { boost: { title: 3 }, prefix: true, fuzzy: 0.15 },
  });
  search.addAll([
    ...core.nodes.filter((n) => !n.stub).map((n) => ({
      id: n.id, kind: "node" as const, title: n.canonicalName,
      sub: `${prettyType(n.type)}${n.jurisdictions?.length ? `, ${n.jurisdictions.join(", ")}` : ""}`,
      text: [n.id, ...(n.aliases ?? []), n.purpose ?? "", n.operator ?? ""].join(" "),
    })),
    ...core.rules.map((r) => ({
      id: r.id, kind: "rule" as const, title: r.canonicalName,
      sub: `${prettyType(r.instrumentType ?? "rule")}${r.jurisdictions?.length ? `, ${r.jurisdictions.join(", ")}` : ""}`,
      text: [r.id, r.issuer ?? "", r.applicability ?? ""].join(" "),
    })),
    ...core.scenarios.map((s) => ({
      id: s.id, kind: "scenario" as const, title: s.name, sub: `Transaction trace, ${s.market ?? "global"}`,
      text: [s.id, s.endState ?? ""].join(" "),
    })),
  ]);
  return { node, rule, scenario, edgesByNode, rulesByNode, search };
}

export const useAtlas = create<State>((set, get) => ({
  core: null, idx: null, claims: null, sources: null, claimsBySubject: null, error: null, selected: null,
  select: (id) => set({ selected: id, actor: null }),
  scope: "IN",
  setScope: (j) => set({ scope: j }),
  actor: null,
  showActor: (a) => set({ actor: a, selected: null }),
  load: async () => {
    if (get().core) return;
    try {
      const res = await fetch("./data/core.json");
      if (!res.ok) throw new Error(`core.json returned ${res.status}`);
      // A dev server answers a missing file with index.html, which is not JSON
      if (!(res.headers.get("content-type") ?? "").includes("json")) throw new Error("MISSING_DATA");
      const core = (await res.json()) as Core;
      set({ core, idx: buildIndexes(core) });
      // evidence is larger and only needed in detail panels: load it after first paint
      const ev = await (await fetch("./data/evidence.json")).json();
      const bySubject = new Map<string, Claim[]>();
      for (const c of ev.claims as Claim[]) {
        const a = bySubject.get(c.subjectId) ?? [];
        a.push(c);
        bySubject.set(c.subjectId, a);
      }
      set({ claims: ev.claims, sources: new Map((ev.sources as Source[]).map((s) => [s.id, s])), claimsBySubject: bySubject });
    } catch (e) {
      const msg = (e as Error).message;
      set({ error: msg === "MISSING_DATA"
        ? "The data files have not been generated yet. Run npm run data (or npm run build) in the project folder, then reload."
        : `The atlas data could not be loaded (${msg}). Reload the page to try again.` });
    }
  },
}));

const TYPE_LABEL: Record<string, string> = {
  central_bank: "Central bank", regulator: "Regulator", ministry: "Ministry", fiu: "Financial intelligence unit",
  rail: "Payment rail", rtgs: "RTGS system", ach: "Automated clearing house", instant_payment_system: "Instant payment system",
  card_scheme: "Card scheme", operator: "Operator", scheme_body: "Scheme body", wallet_or_platform: "Wallet or platform",
  cbdc: "Central bank digital currency", cbdc_project: "CBDC or tokenisation project", money_type: "Money type",
  standard: "Standard", law: "Law", regulation: "Regulation", rulebook: "Rulebook", licence_type: "Licence type",
  market_infrastructure: "Market infrastructure", credit_bureau: "Credit bureau", data_sharing_framework: "Data sharing framework",
  identity_system: "Identity system", other: "Concept or role", legislation: "Legislation", regulator_direction: "Regulator direction",
  regulator_guidance: "Regulator guidance", scheme_rulebook: "Scheme rulebook", implementation_guide: "Implementation guide",
  industry_guidance: "Industry guidance", executive_order: "Executive order", consultation: "Consultation", proposal: "Proposal",
};
export const prettyType = (t: string) => TYPE_LABEL[t] ?? t.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

const STATUS_LABEL: Record<string, string> = {
  production: "Production", pilot: "Pilot", proposed: "Proposed", design_phase: "Design phase", research: "Research",
  concluded: "Concluded", retired: "Retired", prohibited: "Prohibited", in_force: "In force",
  adopted_not_effective: "Not yet effective", consultation: "Consultation", unknown: "Status unknown", superseded: "Superseded",
  stayed: "Stayed",
};
export const prettyStatus = (s?: string) => (s ? STATUS_LABEL[s] ?? s.replace(/_/g, " ") : "Status unknown");
export const statusTone = (s?: string): "good" | "warn" | "bad" | "info" | "muted" => {
  if (!s) return "muted";
  if (["production", "in_force"].includes(s)) return "good";
  if (["pilot", "proposed", "design_phase", "consultation", "adopted_not_effective", "research"].includes(s)) return "warn";
  if (["prohibited", "stayed"].includes(s)) return "bad";
  if (["retired", "concluded", "superseded"].includes(s)) return "muted";
  return "muted";
};
export const isGap = (v?: string | null) => !v || /not publicly specified|needs verification|not confirmed|not sourced/i.test(v);
