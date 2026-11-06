import { useEffect, useState } from "react";
import type { Jur } from "./data/types";

// Routes are plain hash tokens (letters, digits, - . _), because the artifact host only passes
// those through shared links. Examples: #overview-in, #graph-uk, #trace-scn-uk-fps-sip, #node-in-upi.
export type View = "home" | "overview" | "graph" | "traces" | "compare" | "rules" | "money" | "blueprint" | "module" | "node";
export interface Route { view: View; param: string | null }

const VIEWS: View[] = ["home", "overview", "graph", "traces", "compare", "rules", "money", "blueprint", "module", "node"];
const JUR_TOKENS: Record<string, Jur> = { global: "GLOBAL", in: "IN", uk: "UK", us: "US", eu: "EU", sg: "SG", cn: "CN" };

export function parseHash(h: string): Route {
  const t = h.replace(/^#/, "").trim();
  if (!t) return { view: "home", param: null };
  if (t.startsWith("trace-")) return { view: "traces", param: t.slice(6) };
  const i = t.indexOf("-");
  const head = (i < 0 ? t : t.slice(0, i)) as View;
  const rest = i < 0 ? null : t.slice(i + 1);
  if (!VIEWS.includes(head)) return { view: "home", param: null };
  return { view: head, param: rest };
}

export const jurFromToken = (p: string | null): Jur | null => (p ? JUR_TOKENS[p.toLowerCase()] ?? null : null);
export const jurToken = (j: Jur) => Object.entries(JUR_TOKENS).find(([, v]) => v === j)?.[0] ?? "global";

export function href(view: View, param?: string | null) {
  if (view === "traces" && param) return `#trace-${param}`;
  return param ? `#${view}-${param}` : `#${view}`;
}
export function go(view: View, param?: string | null) {
  const h = href(view, param);
  if (location.hash !== h) location.hash = h;
}

export function useRoute(): Route {
  const [r, setR] = useState(() => parseHash(location.hash));
  useEffect(() => {
    const on = () => setR(parseHash(location.hash));
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return r;
}
