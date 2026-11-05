import { useState } from "react";
import { Icon } from "./icons";
import { flagParts, flagSrc, flagSrcSet } from "./flags";

function FlagImg({ iso, code, name, w, h }: { iso: string; code: string; name: string; w: number; h: number }) {
  const [failed, setFailed] = useState(false);
  // some hosts block external images: fall back to a small chip with the code
  if (failed) {
    return <span className="flag-chip" role="img" aria-label={`${name} flag`} style={{ width: w, height: h, fontSize: Math.max(7, Math.round(h * 0.62)) }}>{code.slice(0, 2)}</span>;
  }
  return <img className="flag-img" src={flagSrc(iso)} srcSet={flagSrcSet(iso)} width={w} height={h} alt={`${name} flag`} loading="lazy" onError={() => setFailed(true)} />;
}

/** Flag(s) for a jurisdiction code. GLOBAL shows the globe icon; "UK-IN" shows both flags. */
export function Flag({ code, w = 18 }: { code: string | null | undefined; w?: number }) {
  const h = Math.round(w * 0.72);
  const parts = flagParts(code);
  if (!parts.length) return null;
  return (
    <span className="flags">
      {parts.map((p, i) => p.kind === "global"
        ? <span key={i} className="flag-globe" role="img" aria-label="Global" style={{ height: h }}><Icon name="globe" size={h + 3} /></span>
        : <FlagImg key={i} iso={p.iso} code={p.code} name={p.name} w={w} h={h} />)}
    </span>
  );
}

/** A "Where" cell: each jurisdiction as a small flag plus its code. */
export function Where({ codes }: { codes?: string[] }) {
  if (!codes?.length) return null;
  return (
    <span className="where">
      {codes.map((c) => <span key={c} className="where-i"><Flag code={c} />{c}</span>)}
    </span>
  );
}
