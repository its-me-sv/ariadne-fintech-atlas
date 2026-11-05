// Plane and ship transitions between market cities on the 3D overview. Lives in the Overview chunk.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { JURS } from "../data/store";
import type { Jur } from "../data/types";
import { travelMode, type TravelMode } from "../world/travel";
import { Flag } from "../ui/Flag";
import { Icon } from "../ui/icons";

type Phase = "in" | "travel" | "out";
export interface Trip { id: number; from: Jur; to: Jur; mode: TravelMode; phase: Phase; started: number; ready: boolean }

const FADE_IN = 150, FADE_OUT = 320, MIN_TRIP = 1600, MAX_WAIT = 6000;
const R_FADE = 100; // reduced motion: 100ms in plus 100ms out, a quick crossfade

export const marketLabel = (j: Jur) => JURS.find((x) => x.id === j)?.label ?? j;

/**
 * Starts a trip when the scope moves from one market city to another. Phases:
 * in (overlay fades in over the old city), travel (new city mounts underneath),
 * out (overlay fades away once the minimum time has passed and the new city has drawn).
 */
export function useTravel(scope: Jur, reduced: boolean) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [announce, setAnnounce] = useState("");
  const prev = useRef(scope);
  const ids = useRef(0);

  // layout effect: the overlay is in place before the browser paints the switch
  useLayoutEffect(() => {
    const from = prev.current;
    prev.current = scope;
    if (from === scope) return;
    const mode = travelMode(from, scope);
    if (!mode) { setTrip(null); setAnnounce(""); return; }
    setTrip((t) => ({
      id: ++ids.current, from, to: scope, mode,
      // mid-trip the overlay is already up: go straight to mounting the new target
      phase: t ? "travel" : "in",
      started: performance.now(), ready: false,
    }));
    setAnnounce(`Moving to ${marketLabel(scope)}`);
  }, [scope]);

  // one timer per phase; each cleanup clears it, and a newer trip id makes stale callbacks no-ops
  useEffect(() => {
    if (!trip) return;
    const next = (fn: (t: Trip) => Trip | null, ms: number) => {
      const h = setTimeout(() => setTrip((p) => (p && p.id === trip.id ? fn(p) : p)), ms);
      return () => clearTimeout(h);
    };
    if (trip.phase === "in") return next((p) => ({ ...p, phase: "travel" }), reduced ? R_FADE : FADE_IN);
    if (trip.phase === "out") return next(() => null, reduced ? R_FADE : FADE_OUT);
    const elapsed = performance.now() - trip.started;
    if (!trip.ready) return next((p) => ({ ...p, phase: "out" }), Math.max(0, MAX_WAIT - elapsed)); // never hang on a failed canvas
    return next((p) => ({ ...p, phase: "out" }), Math.max(0, (reduced ? 0 : MIN_TRIP) - elapsed));
  }, [trip, reduced]);

  useEffect(() => { if (!trip) setAnnounce(""); }, [trip]);

  const ready = useCallback((key: Jur) => {
    setTrip((p) => (p && p.phase === "travel" && p.to === key && !p.ready ? { ...p, ready: true } : p));
  }, []);
  const skip = useCallback(() => setTrip((p) => (p && p.phase !== "out" ? { ...p, phase: "out" } : p)), []);

  // click handled on the overlay; any key (Escape included) skips too
  const active = !!trip && trip.phase !== "out";
  useEffect(() => {
    if (!active) return;
    const on = () => skip();
    addEventListener("keydown", on);
    return () => removeEventListener("keydown", on);
  }, [active, skip]);

  /** The city the canvas should show: the old one until the overlay covers it. */
  const sceneScope: Jur = trip && trip.phase === "in" ? trip.from : scope;
  return { trip, announce, ready, skip, sceneScope };
}

// ---------- art (inline SVG, transform and opacity animation only) ----------
function Cloud({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg className={`tv-cloud ${className ?? ""}`} style={style} viewBox="0 0 120 64" aria-hidden="true">
      <path d="M22 56a17 17 0 0 1 3-33 23 23 0 0 1 42-8 19 19 0 0 1 33 12 15 15 0 0 1 2 29z" fill="#ffffff" />
      <path d="M22 56h80a15 15 0 0 0 9-6c-30 5-62 5-97-1a17 17 0 0 0 8 7z" fill="#e9edfb" />
    </svg>
  );
}

function CloudLayer({ n, y, size, speed, opacity }: { n: number; y: number[]; size: number; speed: number; opacity: number }) {
  // each half of the track holds the same clouds, so the loop is seamless at -50%
  const half = Array.from({ length: n }, (_, i) => ({ left: (i / n) * 50 + (i % 2 ? 4 : 0), top: y[i % y.length] }));
  return (
    <div className="tv-track" style={{ animationDuration: `${speed}s`, opacity }}>
      {[0, 50].map((off) => half.map((c, i) => (
        <Cloud key={`${off}-${i}`} style={{ left: `${c.left + off}%`, top: `${c.top}%`, width: size }} />
      )))}
    </div>
  );
}

function Plane() {
  return (
    <svg className="tv-plane-svg" viewBox="0 0 220 110" aria-hidden="true">
      <path d="M110 38 92 13c-2-4 2-6 5-3l38 28z" fill="#7d97f2" />
      <path d="M40 40 28 12c-1-4 3-6 6-4l28 30z" fill="#f97316" />
      <path d="M30 53c0-11 18-17 40-17h90c28 0 50 9 50 19s-22 17-50 17H70c-22 0-40-7-40-19z" fill="#ffffff" />
      <path d="M33 60c8 8 22 12 37 12h90c22 0 40-5 47-12-12 4-28 6-47 6H70c-15 0-28-2-37-6z" fill="#e3e8f7" />
      <path d="M34 55h170c-1 3-4 5-8 6H40c-3-1-5-3-6-6z" fill="#3157e6" />
      {[78, 94, 110, 126, 142].map((x) => <circle key={x} cx={x} cy={47} r={4} fill="#b9cdfb" />)}
      <path d="M178 42c9 1 18 5 22 10h-24c-3 0-4-2-4-5s3-5 6-5z" fill="#7d97f2" />
      <path d="M104 60 80 97c-2 4 2 6 6 3l50-38z" fill="#3157e6" />
      <path d="M44 56 30 66c-2 2 0 4 2 3l22-11z" fill="#f97316" />
    </svg>
  );
}

function Boat() {
  return (
    <svg className="tv-boat-svg" viewBox="0 0 200 120" aria-hidden="true">
      <rect x="117" y="18" width="17" height="30" rx="5" fill="#f97316" />
      <rect x="117" y="22" width="17" height="5" fill="#ffffff" />
      <rect x="74" y="30" width="42" height="18" rx="6" fill="#f7f8fd" />
      <rect x="58" y="44" width="80" height="28" rx="8" fill="#ffffff" />
      {[72, 88, 104, 120].map((x) => <circle key={x} cx={x} cy={57} r={4.5} fill="#b9cdfb" />)}
      <path d="M18 70h164l-20 30c-2 4-6 6-10 6H48c-4 0-8-2-10-6z" fill="#3d63ea" />
      <path d="M22 76h156l-3 5H25z" fill="#ffffff" />
      <path d="M38 100c2 4 6 6 10 6h104c4 0 8-2 10-6z" fill="#2a48b8" />
    </svg>
  );
}

const WAVE_H = 260;
function wavePath(amp: number, base: number) {
  // two identical periods across 2880 units, so translating by -50% loops seamlessly
  let d = `M0 ${base}`;
  for (let x = 0; x < 2880; x += 240) d += ` q60 ${-amp} 120 0 t120 0`;
  return `${d} V${WAVE_H} H0Z`;
}
// back to front; the boat rides between the middle and the front wave
const WAVES = [
  { amp: 16, base: 40, color: "#cfe3f8", speed: 7, bottom: 40, front: false },
  { amp: 20, base: 50, color: "#a9cdf0", speed: 4.6, bottom: 20, front: false },
  { amp: 24, base: 60, color: "#8ebbe9", speed: 3.2, bottom: 0, front: true },
];

export function TravelOverlay({ trip, reduced, onSkip }: { trip: Trip; reduced: boolean; onSkip: () => void }) {
  const verb = trip.mode === "ship" ? "Sailing" : "Flying";
  return (
    <div className={`travel tv-${trip.mode}${reduced ? " reduced" : ""}${trip.phase === "out" ? " out" : ""}`} aria-hidden="true" onClick={onSkip}>
      {!reduced && trip.mode === "plane" && (
        <div className="tv-scene">
          <CloudLayer n={3} y={[14, 30, 22]} size={90} speed={14} opacity={0.6} />
          <div className="tv-mover tv-jet"><div className="tv-bob"><div className="tv-trail" /><div className="tv-trail t2" /><Plane /></div></div>
          <CloudLayer n={3} y={[58, 72, 64]} size={150} speed={8} opacity={0.85} />
          <CloudLayer n={2} y={[80, 4]} size={240} speed={4.5} opacity={0.95} />
        </div>
      )}
      {!reduced && trip.mode === "ship" && (
        <div className="tv-scene">
          <CloudLayer n={3} y={[10, 22, 14]} size={110} speed={16} opacity={0.9} />
          <div className="tv-sea">
            <div className="tv-mover tv-boat"><div className="tv-bob tv-rock"><div className="tv-wake"><i /><i /><i /></div><Boat /></div></div>
            {WAVES.map((w, i) => (
              <div key={i} className={`tv-track tv-wave${w.front ? " front" : ""}`} style={{ animationDuration: `${w.speed}s`, bottom: w.bottom, height: WAVE_H }}>
                <svg viewBox={`0 0 2880 ${WAVE_H}`} preserveAspectRatio="none"><path d={wavePath(w.amp, w.base)} fill={w.color} /></svg>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="tv-card glass">
        <div className="tv-route"><Flag code={trip.from} w={30} /><Icon name="next" size={18} /><Flag code={trip.to} w={30} /></div>
        <b>{verb} to {marketLabel(trip.to)}</b>
        <small>Click or press any key to skip</small>
      </div>
    </div>
  );
}
