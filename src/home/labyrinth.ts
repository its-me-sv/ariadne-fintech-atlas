// Geometry for a classical seven-circuit (Cretan) labyrinth in concentric form.
// The single path enters at the bottom into circuit 3 and visits the circuits in the classical
// order 3, 2, 1, 4, 7, 6, 5 before reaching the centre. Every turn is a U-turn next to the
// entrance axis; turns that enclose other turns sit closer to the axis, so nothing crosses.
// Circuits are numbered from the outside (1) to the inside (7).

export interface Labyrinth {
  /** walkway centre line from outside the entrance to the centre (also the thread) */
  path: string;
  /** outer wall radius */
  R: number;
  /** track pitch (one walkway plus one wall) */
  w: number;
  /** radius of the open centre */
  centre: number;
}

const ORDER = [3, 2, 1, 4, 7, 6, 5];

export function makeLabyrinth(R = 100): Labyrinth {
  const centreTracks = 1.6;
  const w = R / (7 + centreTracks);
  const centre = centreTracks * w;
  const c = (k: number) => R - (k - 0.5) * w; // centre line radius of circuit k
  const pt = (r: number, t: number) => [r * Math.sin(t), r * Math.cos(t)] as const; // t = 0 points down to the entrance
  const f = (n: number) => +n.toFixed(2);

  // Each U-turn sits a fixed arc distance from the axis (one or two track pitches) at its own radii,
  // so walls stay close to even. Left turns have negative angles, right turns positive.
  const turnAngle = (from: number, to: number, pitches: number) => {
    const rOut = c(Math.min(from, to));
    const rIn = to === 8 ? centre : c(Math.max(from, to));
    return (pitches * w) / ((rOut + rIn) / 2);
  };
  // which side and how far out each transition turns (verified to nest without crossings)
  const TURNS: Record<string, { side: -1 | 1; pitches: number }> = {
    "3-2": { side: -1, pitches: 2 }, "2-1": { side: 1, pitches: 1 }, "1-4": { side: -1, pitches: 1 },
    "4-7": { side: 1, pitches: 0.5 }, "7-6": { side: -1, pitches: 1.5 }, "6-5": { side: 1, pitches: 1.5 }, "5-8": { side: -1, pitches: 0.5 },
  };

  let d = "";
  const move = (r: number, t: number) => { const [x, y] = pt(r, t); d += `M${f(x)} ${f(y)}`; };
  const line = (r: number, t: number) => { const [x, y] = pt(r, t); d += `L${f(x)} ${f(y)}`; };
  const arc = (r: number, t0: number, t1: number) => {
    const [x, y] = pt(r, t1);
    const span = Math.abs(t1 - t0);
    // increasing t runs counterclockwise on screen (SVG y points down), which is sweep 0
    d += `A${f(r)} ${f(r)} 0 ${span > Math.PI ? 1 : 0} ${t1 > t0 ? 0 : 1} ${f(x)} ${f(y)}`;
  };

  // entrance corridor, straight up the axis into circuit 3
  move(R + w * 0.9, 0);
  line(c(3), 0);
  let t = 0;
  let dir = 1; // circuit 3 sets off to the right (increasing t)
  for (let i = 0; i < ORDER.length; i++) {
    const k = ORDER[i];
    const next = ORDER[i + 1] ?? 8;
    const turn = TURNS[`${k}-${next}`];
    const a = turn.side * turnAngle(k, next, turn.pitches);
    // run the circuit the long way round to the turn, then step radially to the next circuit
    let end = a;
    if (dir > 0) { while (end <= t) end += 2 * Math.PI; } else { while (end >= t) end -= 2 * Math.PI; }
    arc(c(k), t, end);
    t = end;
    line(next === 8 ? 0 : c(next), t);
    dir = -dir;
  }
  return { path: d, R, w, centre };
}
