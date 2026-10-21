import type { ReactNode } from "react";
import { useAtlas, prettyStatus, statusTone, inJur } from "../data/store";
import type { AtlasNode, Jur } from "../data/types";
import { KIND_COLOR, kindOf } from "./kinds";

export function StatusPill({ status }: { status?: string }) {
  return <span className={`pill t-${statusTone(status)}`}>{prettyStatus(status)}</span>;
}

export function NodeChip({ n, showStatus = true, label }: { n: AtlasNode; showStatus?: boolean; label?: string }) {
  const select = useAtlas((s) => s.select);
  const name = label ?? (n.aliases?.[0] && n.aliases[0].length <= 16 ? n.aliases[0] : n.canonicalName);
  return (
    <button className="nchip" onClick={() => select(n.id)} title={n.canonicalName}>
      <i style={{ background: KIND_COLOR[kindOf(n.type)] }} aria-hidden="true" />
      <span>{name}</span>
      {showStatus && n.status && n.status !== "production" && n.status !== "in_force" && <StatusPill status={n.status} />}
    </button>
  );
}

export function Section({ title, lead, children, id }: { title: string; lead?: string; children: ReactNode; id?: string }) {
  return (
    <section className="sec" id={id}>
      <h2>{title}</h2>
      {lead && <p className="sec-lead">{lead}</p>}
      {children}
    </section>
  );
}

export const MARKETS: { id: Exclude<Jur, "GLOBAL">; label: string; short: string }[] = [
  { id: "IN", label: "India", short: "India" },
  { id: "UK", label: "United Kingdom", short: "UK" },
  { id: "US", label: "United States", short: "US" },
  { id: "EU", label: "EU and euro area", short: "EU" },
  { id: "SG", label: "Singapore", short: "Singapore" },
  { id: "CN", label: "Mainland China", short: "China" },
];

export const nodesIn = (nodes: AtlasNode[], j: Jur, types: string[]) =>
  nodes.filter((n) => !n.stub && types.includes(n.type) && inJur(n.jurisdictions, j));

/** Splits "Label: value. Label2: value2." text from money-type records into labelled parts. */
export function splitLabelled(text: string | undefined, labels: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  if (!text) return out;
  const re = new RegExp(`(${labels.map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")}):\\s*`, "g");
  const parts = text.split(re);
  if (parts[0].trim()) out["_lead"] = parts[0].trim().replace(/\.$/, "");
  for (let i = 1; i < parts.length; i += 2) out[parts[i]] = (parts[i + 1] ?? "").trim().replace(/\.$/, "");
  return out;
}
