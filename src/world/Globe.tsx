// Global scope: a round clay globe. Land is drawn once onto a canvas with d3-geo from the
// world-atlas 110m countries; the six markets are filled in their colours and carry a pin at the
// financial capital. Clicking a pin, its label or a highlighted country eases the camera there,
// then opens that market's city.
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { geoContains, geoDistance, geoEquirectangular, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { useAtlas, inJur } from "../data/store";
import type { Jur } from "../data/types";
import { CameraRig } from "./Scene";
import type { CamCmd } from "./flow";
import { Flag } from "../ui/Flag";

type Market = Exclude<Jur, "GLOBAL">;

const R = 20;
const FOV = 28;
const BG = "#edf0fa";
const OCEAN = "#b4d4f3";
const LAND = "#e9dfc7";
const LAND_EDGE = "#d2c4a3";

// ISO 3166-1 numeric ids, as used by world-atlas
const EU27 = ["040", "056", "100", "191", "196", "203", "208", "233", "246", "250", "276", "300", "348", "372", "380", "428", "440", "442", "470", "528", "616", "620", "642", "703", "705", "724", "752"];
const COUNTRY_MARKET: Record<string, Market> = { "356": "IN", "826": "UK", "840": "US", "702": "SG", "156": "CN" };
for (const id of EU27) COUNTRY_MARKET[id] = "EU";
// Too small for the 110m outlines: drawn as dots, and clickable within a small radius
const SMALL: { market: Market; lon: number; lat: number }[] = [
  { market: "SG", lon: 103.82, lat: 1.35 },
  { market: "EU", lon: 14.45, lat: 35.9 }, // Malta
];

// dx, dy: preferred label offset from the pin head in screen pixels (UK up and left, EU down and right)
export const GLOBE_MARKETS: { jur: Market; name: string; city: string; color: string; edge: string; lat: number; lon: number; dx: number; dy: number }[] = [
  { jur: "IN", name: "India", city: "New Delhi", color: "#f97316", edge: "#c95a0f", lat: 28.61, lon: 77.21, dx: -54, dy: -50 },
  { jur: "UK", name: "United Kingdom", city: "London", color: "#3d63ea", edge: "#2a48b8", lat: 51.51, lon: -0.13, dx: -96, dy: -50 },
  { jur: "US", name: "United States", city: "Washington", color: "#8b5cf6", edge: "#6a3fd0", lat: 38.91, lon: -77.04, dx: -70, dy: -48 },
  { jur: "EU", name: "EU and euro area", city: "Frankfurt", color: "#12a067", edge: "#0c7a4e", lat: 50.11, lon: 8.68, dx: 96, dy: 44 },
  { jur: "SG", name: "Singapore", city: "Singapore", color: "#fb6f84", edge: "#d84a62", lat: 1.35, lon: 103.82, dx: 64, dy: 40 },
  { jur: "CN", name: "Mainland China", city: "Beijing", color: "#d946ef", edge: "#ad2bc2", lat: 39.9, lon: 116.4, dx: 70, dy: -46 },
];
const BY_JUR = Object.fromEntries(GLOBE_MARKETS.map((m) => [m.jur, m])) as Record<Market, (typeof GLOBE_MARKETS)[number]>;

/** Matches three.js SphereGeometry UVs, so lat/lon line up with the equirectangular texture. */
export function latLonToVec3(lat: number, lon: number, r = R) {
  const phi = ((lon + 180) / 360) * Math.PI * 2;
  const theta = ((90 - lat) / 180) * Math.PI;
  return new THREE.Vector3(-r * Math.cos(phi) * Math.sin(theta), r * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta));
}
function vec3ToLonLat(v: THREE.Vector3): [number, number] {
  const n = v.clone().normalize();
  const lat = 90 - (Math.acos(THREE.MathUtils.clamp(n.y, -1, 1)) * 180) / Math.PI;
  let lon = (Math.atan2(n.z, -n.x) * 180) / Math.PI - 180;
  if (lon < -180) lon += 360;
  return [lon, lat];
}

const HOME_DIR = latLonToVec3(24, 45, 1).normalize();
const TARGET = new THREE.Vector3(0, 0, 0);

// ---------- map data and drawing (done once per page load, never redrawn) ----------
type CountryFeature = Feature<Geometry, { name: string }>;
interface GlobeMap { features: CountryFeature[]; canvas: HTMLCanvasElement }
let mapCache: GlobeMap | null = null;
let mapLoading: Promise<GlobeMap> | null = null;

function loadMap(): Promise<GlobeMap> {
  if (mapCache) return Promise.resolve(mapCache);
  mapLoading ??= Promise.all([import("world-atlas/countries-110m.json"), import("topojson-client")]).then(([topo, tj]) => {
    const t = (topo.default ?? topo) as unknown as Parameters<typeof tj.feature>[0];
    const fc = tj.feature(t, (t as unknown as { objects: { countries: never } }).objects.countries) as unknown as FeatureCollection<Geometry, { name: string }>;
    // cache only the finished drawing: the canvas is complete before anyone can see it
    mapCache = { features: fc.features, canvas: drawMap(fc.features) };
    return mapCache;
  });
  return mapLoading;
}

function useGlobeMap() {
  const [map, setMap] = useState<GlobeMap | null>(mapCache);
  useEffect(() => {
    if (map) return;
    let live = true;
    loadMap().then((m) => { if (live) setMap(m); });
    return () => { live = false; };
  }, [map]);
  return map;
}

function drawMap(features: CountryFeature[]) {
  const W = 2048, H = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const proj = geoEquirectangular().scale(W / (2 * Math.PI)).translate([W / 2, H / 2]).precision(0.1);
  const path = geoPath(proj, ctx);
  ctx.fillStyle = OCEAN;
  ctx.fillRect(0, 0, W, H);
  ctx.lineJoin = "round";
  for (const f of features) {
    const m = COUNTRY_MARKET[String(f.id)];
    ctx.beginPath(); path(f);
    ctx.fillStyle = m ? BY_JUR[m].color : LAND;
    ctx.fill();
    // soft, thin borders, a little darker than the fill
    ctx.strokeStyle = m ? BY_JUR[m].edge : LAND_EDGE;
    ctx.globalAlpha = m ? 0.55 : 0.8;
    ctx.lineWidth = 0.9;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  for (const s of SMALL) {
    const [x, y] = proj([s.lon, s.lat])!;
    ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = BY_JUR[s.market].color; ctx.fill();
  }
  return canvas;
}

function marketAt(lonLat: [number, number], features: CountryFeature[] | null): Market | null {
  for (const s of SMALL) if (geoDistance(lonLat, [s.lon, s.lat]) < 0.03) return s.market;
  if (!features) return null;
  for (const f of features) {
    const m = COUNTRY_MARKET[String(f.id)];
    if (m && geoContains(f, lonLat)) return m;
  }
  return null;
}

// ---------- framing: centre the globe in the area the panels leave free ----------
export interface Frame { cx: number; cy: number; r: number }
export function frameGlobe(W: number, H: number, o: { panels: boolean; table: boolean; rightInset: number }): Frame {
  const TOP = 64;
  const L = 100; // dock
  const T = o.panels ? TOP + 16 + 80 + 14 : TOP + 14; // below the KPI cards when they show
  const Rt = W - 72 - o.rightInset; // map controls (and the detail panel when open)
  const B = H - 16;
  let cx = (L + Rt) / 2;
  const cy = (T + B) / 2;
  let r = Math.max(110, Math.min((B - T) / 2, (Rt - L) / 2) * 0.92);
  if (o.table) {
    // .ov-table sits bottom right: 470 wide, up to 36% of the stage tall
    const tx = W - 16 - 470 - 14, ty = H - 16 - 0.36 * H - 14;
    const clear = () => Math.hypot(Math.max(tx - cx, 0), Math.max(ty - cy, 0));
    while (clear() < r && cx - r > L) cx -= 4;
    if (clear() < r) r = Math.max(110, clear());
  }
  return { cx, cy, r };
}
/** Camera distance at which the globe's on-screen radius is r pixels. */
const distanceFor = (r: number, H: number) => R / Math.sin(Math.atan((r / (H / 2)) * Math.tan(THREE.MathUtils.degToRad(FOV / 2))));

function Framing({ frame, cmd }: { frame: (W: number, H: number) => Frame; cmd: CamCmd }) {
  const { size, camera } = useThree();
  const f = frame(size.width, size.height);
  const homeDist = distanceFor(f.r, size.height);
  const home = useMemo(() => HOME_DIR.clone().multiplyScalar(homeDist), [homeDist]);
  const placed = useRef(false);
  useEffect(() => {
    if (placed.current || size.width === 0) return;
    placed.current = true;
    camera.position.copy(home);
    camera.lookAt(TARGET);
  }, [camera, home, size.width]);
  return <CameraRig cmd={cmd} shiftX={size.width / 2 - f.cx} shiftY={size.height / 2 - f.cy} target={TARGET} home={home} />;
}

// ---------- texture, created per visit from the cached drawing ----------
function useMapTexture(canvas: HTMLCanvasElement | null) {
  const gl = useThree((s) => s.gl);
  const [tex, setTex] = useState<THREE.CanvasTexture | null>(null);
  useEffect(() => {
    if (!canvas) return;
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.anisotropy = gl.capabilities.getMaxAnisotropy();
    t.needsUpdate = true;
    setTex(t);
    return () => { t.dispose(); setTex(null); };
  }, [canvas, gl]);
  return tex;
}

const RIM_VERT = `varying vec3 vN; varying vec3 vV;
void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`;
const RIM_FRAG = `uniform vec3 uColor; uniform float uPower; uniform float uStrength; varying vec3 vN; varying vec3 vV;
void main() { float f = pow(1.0 - abs(dot(vN, vV)), uPower) * uStrength; gl_FragColor = vec4(uColor, f); }`;
// outside the globe the glow is strongest at the edge and fades outwards
const GLOW_FRAG = `uniform vec3 uColor; uniform float uPower; uniform float uStrength; varying vec3 vN; varying vec3 vV;
void main() { float f = pow(abs(dot(vN, vV)), uPower) * uStrength; gl_FragColor = vec4(uColor, f); }`;

function Atmosphere() {
  const rim = useMemo(() => ({ uColor: { value: new THREE.Color("#ffffff") }, uPower: { value: 2.6 }, uStrength: { value: 0.55 } }), []);
  const glow = useMemo(() => ({ uColor: { value: new THREE.Color("#ffffff") }, uPower: { value: 3.0 }, uStrength: { value: 0.85 } }), []);
  return (
    <>
      {/* light rim on the globe's edge */}
      <mesh scale={1.002} renderOrder={1}>
        <sphereGeometry args={[R, 96, 64]} />
        <shaderMaterial vertexShader={RIM_VERT} fragmentShader={RIM_FRAG} uniforms={rim} transparent depthWrite={false} />
      </mesh>
      {/* faint glow just outside it, against the lavender page */}
      <mesh scale={1.07}>
        <sphereGeometry args={[R, 64, 48]} />
        <shaderMaterial vertexShader={RIM_VERT} fragmentShader={GLOW_FRAG} uniforms={glow} transparent depthWrite={false} side={THREE.BackSide} />
      </mesh>
    </>
  );
}

function Earth({ map, onHover, onPick }: { map: GlobeMap | null; onHover: (m: Market | null) => void; onPick: (m: Market) => void }) {
  const tex = useMapTexture(map?.canvas ?? null);
  const hit = (e: ThreeEvent<PointerEvent | MouseEvent>) => marketAt(vec3ToLonLat(e.point), map?.features ?? null);
  return (
    <mesh
      onPointerMove={(e) => { e.stopPropagation(); onHover(hit(e)); }}
      onPointerOut={() => onHover(null)}
      onClick={(e) => { e.stopPropagation(); if (e.delta > 4) return; const m = hit(e); if (m) onPick(m); }}>
      <sphereGeometry args={[R, 128, 96]} />
      {/* until the map arrives, the fallback is the same ocean colour, so every visit looks the same */}
      {tex ? <meshStandardMaterial key="map" map={tex} roughness={0.95} metalness={0} /> : <meshStandardMaterial key="plain" color={OCEAN} roughness={0.95} metalness={0} />}
    </mesh>
  );
}

function Pin({ m, hot, onPick, onHover }: { m: (typeof GLOBE_MARKETS)[number]; hot: boolean; onPick: (j: Market) => void; onHover: (j: Market | null) => void }) {
  const pos = useMemo(() => latLonToVec3(m.lat, m.lon, R), [m]);
  const quat = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), pos.clone().normalize()), [pos]);
  const g = useRef<THREE.Group>(null);
  const { camera } = useThree();
  // same rule as the labels: a pin on the far side never peeks over the horizon on its own
  useFrame(() => { if (g.current) g.current.visible = pos.clone().normalize().dot(camera.position.clone().normalize()) > 0.04; });
  return (
    <group ref={g} position={pos} quaternion={quat}>
      <group scale={hot ? 1.18 : 1}
        onPointerOver={(e) => { e.stopPropagation(); onHover(m.jur); }}
        onPointerOut={() => onHover(null)}
        onClick={(e) => { e.stopPropagation(); if (e.delta <= 4) onPick(m.jur); }}>
        <mesh position={[0, 1.5, 0]}><sphereGeometry args={[1.6, 12, 10]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
        <mesh position={[0, 0.55, 0]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.32, 1.1, 20]} /><meshStandardMaterial color={m.color} roughness={0.6} /></mesh>
        <mesh position={[0, 1.3, 0]}><sphereGeometry args={[0.55, 24, 16]} /><meshStandardMaterial color={m.color} roughness={0.6} /></mesh>
        <mesh position={[0, 1.3, 0]} scale={0.45}><sphereGeometry args={[0.55, 16, 12]} /><meshStandardMaterial color="#ffffff" roughness={0.7} /></mesh>
      </group>
    </group>
  );
}

// ---------- labels: screen-space layout with collision avoidance and leader lines ----------
interface LabelRefs { boxes: MutableRefObject<(HTMLDivElement | null)[]>; lines: MutableRefObject<(SVGLineElement | null)[]> }

// floating panels the labels must stay clear of (they sit above the canvas)
const PANELS = ".ov-kpis:not(.is-hidden) .kpi, .ov-table:not(.is-hidden), .ov-mapctl, .ov-trace, .dock, .detail, .topbar";
type Box = { x0: number; y0: number; x1: number; y1: number };
function panelBoxes(canvas: HTMLCanvasElement): Box[] {
  const c = canvas.getBoundingClientRect();
  const out: Box[] = [];
  document.querySelectorAll<HTMLElement>(PANELS).forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width && r.height && getComputedStyle(el).display !== "none") out.push({ x0: r.left - c.left, y0: r.top - c.top, x1: r.right - c.left, y1: r.bottom - c.top });
  });
  return out;
}

function LabelLayout({ boxes, lines }: LabelRefs) {
  const { camera, size, gl } = useThree();
  const obstacles = useRef<Box[]>([]);
  const heads = useMemo(() => GLOBE_MARKETS.map((m) => latLonToVec3(m.lat, m.lon, R + 1.35)), []);
  const st = useRef(GLOBE_MARKETS.map(() => ({ x: 0, y: 0, w: 0, h: 0, shown: false })));
  const frameN = useRef(0);
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const W = size.width, H = size.height;
    const camDir = camera.position.clone().normalize();
    const remeasure = frameN.current++ % 30 === 0;
    const items = GLOBE_MARKETS.map((m, i) => {
      const s = st.current[i];
      const el = boxes.current[i];
      if (el && (remeasure || !s.w)) { s.w = el.offsetWidth; s.h = el.offsetHeight; }
      if (remeasure && i === 0) obstacles.current = panelBoxes(gl.domElement);
      v.copy(heads[i]).project(camera);
      const px = ((v.x + 1) / 2) * W, py = ((1 - v.y) / 2) * H;
      // shown whenever the pin is on the visible side (with a small margin at the horizon)
      const vis = heads[i].clone().normalize().dot(camDir) > 0.04;
      return { i, px, py, vis, x: px + m.dx, y: py + m.dy, w: s.w, h: s.h };
    });
    const live = items.filter((a) => a.vis);
    // push overlapping labels apart, and keep each label off every other visible pin head
    for (let it = 0; it < 10; it++) {
      let moved = false;
      for (let a = 0; a < live.length; a++) {
        const A = live[a];
        for (let b = a + 1; b < live.length; b++) {
          const Bb = live[b];
          const dx = Bb.x - A.x, dy = Bb.y - A.y;
          const ox = (A.w + Bb.w) / 2 + 8 - Math.abs(dx), oy = (A.h + Bb.h) / 2 + 8 - Math.abs(dy);
          if (ox > 0 && oy > 0) {
            moved = true;
            if (oy <= ox) { const s = (dy >= 0 ? 1 : -1) * (oy / 2 + 0.5); A.y -= s; Bb.y += s; }
            else { const s = (dx >= 0 ? 1 : -1) * (ox / 2 + 0.5); A.x -= s; Bb.x += s; }
          }
        }
        for (const P of live) {
          const dx = A.x - P.px, dy = A.y - P.py;
          const ox = A.w / 2 + 12 - Math.abs(dx), oy = A.h / 2 + 12 - Math.abs(dy);
          if (ox > 0 && oy > 0) { moved = true; if (oy <= ox) A.y += (dy >= 0 ? 1 : -1) * oy; else A.x += (dx >= 0 ? 1 : -1) * ox; }
        }
      }
      // then push each label out of any panel, along the shorter way out
      for (const A of live) {
        for (const o of obstacles.current) {
          const l = A.x - A.w / 2 - 8, r = A.x + A.w / 2 + 8, t = A.y - A.h / 2 - 8, b = A.y + A.h / 2 + 8;
          if (r <= o.x0 || l >= o.x1 || b <= o.y0 || t >= o.y1) continue;
          moved = true;
          const opts = [o.x0 - r, o.x1 - l, o.y0 - b, o.y1 - t]; // left, right, up, down
          const k = opts.reduce((best, v, j) => (Math.abs(v) < Math.abs(opts[best]) ? j : best), 0);
          if (k < 2) A.x += opts[k]; else A.y += opts[k];
        }
      }
      if (!moved) break;
    }
    for (const a of items) {
      const s = st.current[a.i];
      const el = boxes.current[a.i], ln = lines.current[a.i];
      a.x = THREE.MathUtils.clamp(a.x, a.w / 2 + 8, W - a.w / 2 - 8);
      a.y = THREE.MathUtils.clamp(a.y, a.h / 2 + 8, H - a.h / 2 - 8);
      if (!s.shown && a.vis) { s.x = a.x; s.y = a.y; } // snap when it comes into view
      else { s.x += (a.x - s.x) * 0.35; s.y += (a.y - s.y) * 0.35; }
      if (a.vis !== s.shown) {
        s.shown = a.vis;
        if (el) { el.style.opacity = a.vis ? "1" : "0"; el.style.pointerEvents = a.vis ? "auto" : "none"; }
        if (ln) ln.style.opacity = a.vis ? "1" : "0";
      }
      if (el) el.style.transform = `translate3d(${(s.x - s.w / 2).toFixed(1)}px, ${(s.y - s.h / 2).toFixed(1)}px, 0)`;
      if (ln) { ln.setAttribute("x1", a.px.toFixed(1)); ln.setAttribute("y1", a.py.toFixed(1)); ln.setAttribute("x2", s.x.toFixed(1)); ln.setAttribute("y2", s.y.toFixed(1)); }
    }
  });
  return null;
}

/** Eases the camera to face a market, then hands over to the caller. */
function FlyTo({ to, reduced, onArrive }: { to: { jur: Market; dir: THREE.Vector3 } | null; reduced: boolean; onArrive: (j: Market) => void }) {
  const { camera } = useThree();
  const controls = useThree((s) => s.controls) as unknown as OrbitControlsImpl | null;
  const anim = useRef<{ from: THREE.Vector3; to: THREE.Vector3; t: number; jur: Market } | null>(null);
  const arrive = useRef(onArrive);
  arrive.current = onArrive;
  useEffect(() => {
    if (!to) return;
    if (reduced) { arrive.current(to.jur); return; }
    const dist = Math.max(62, camera.position.length() * 0.62);
    anim.current = { from: camera.position.clone(), to: to.dir.clone().normalize().multiplyScalar(dist), t: 0, jur: to.jur };
  }, [to, reduced, camera]);
  useFrame((_, dt) => {
    const a = anim.current;
    if (!a) return;
    a.t = Math.min(1, a.t + dt / 0.9);
    const e = a.t < 0.5 ? 2 * a.t * a.t : 1 - Math.pow(-2 * a.t + 2, 2) / 2;
    const len = THREE.MathUtils.lerp(a.from.length(), a.to.length(), e);
    const dir = a.from.clone().normalize().lerp(a.to.clone().normalize(), e).normalize();
    camera.position.copy(dir.multiplyScalar(len));
    camera.lookAt(TARGET);
    controls?.update();
    if (a.t >= 1) { anim.current = null; arrive.current(a.jur); }
  });
  return null;
}

/** A soft key light over the viewer's shoulder, so the side facing the camera is always lit. */
function CameraLight() {
  const light = useRef<THREE.DirectionalLight>(null);
  const { camera } = useThree();
  useFrame(() => {
    light.current?.position.set(-0.5, 0.65, 1).applyQuaternion(camera.quaternion).multiplyScalar(100);
  });
  return <directionalLight ref={light} intensity={0.75} color="#fffaf0" />;
}

export default function Globe({ onPick, cmd, reducedMotion, panelsHidden = false, rightInset = 0 }: {
  onPick: (j: Jur) => void; cmd: CamCmd; reducedMotion: boolean; panelsHidden?: boolean; rightInset?: number;
}) {
  const core = useAtlas((s) => s.core);
  const map = useGlobeMap();
  const [hover, setHover] = useState<Market | null>(null);
  const [spin, setSpin] = useState(!reducedMotion);
  const [fly, setFly] = useState<{ jur: Market; dir: THREE.Vector3 } | null>(null);
  const firstCmd = useRef(cmd);
  const boxes = useRef<(HTMLDivElement | null)[]>([]);
  const lines = useRef<(SVGLineElement | null)[]>([]);

  useEffect(() => { if (reducedMotion) setSpin(false); }, [reducedMotion]);
  useEffect(() => { if (cmd !== firstCmd.current) setSpin(false); }, [cmd]);
  useEffect(() => { document.body.style.cursor = hover ? "pointer" : ""; }, [hover]);
  useEffect(() => () => { document.body.style.cursor = ""; }, []);

  const counts = useMemo(() => {
    const out = {} as Record<Market, number>;
    for (const m of GLOBE_MARKETS) out[m.jur] = core?.nodes.filter((n) => !n.stub && inJur(n.jurisdictions, m.jur)).length ?? 0;
    return out;
  }, [core]);

  const pick = (j: Market) => {
    if (fly) return;
    const m = BY_JUR[j];
    setSpin(false);
    setFly({ jur: j, dir: latLonToVec3(m.lat, m.lon, 1) });
  };
  const onArrive = (j: Market) => { setFly(null); onPick(j); };
  const frame = (W: number, H: number) => frameGlobe(W, H, { panels: !panelsHidden, table: !panelsHidden && W > 1180 && rightInset === 0, rightInset });

  return (
    <div className="globe-wrap">
      <Canvas dpr={[1, 1.75]} camera={{ fov: FOV, near: 1, far: 800, position: HOME_DIR.clone().multiplyScalar(118).toArray() }}
        gl={{ antialias: true, toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 1.05 }}>
        <color attach="background" args={[BG]} />
        <hemisphereLight args={["#ffffff", "#f6f2ea", 2.7]} />
        <CameraLight />
        <Earth map={map} onHover={setHover} onPick={pick} />
        <Atmosphere />
        {GLOBE_MARKETS.map((m) => <Pin key={m.jur} m={m} hot={hover === m.jur} onPick={pick} onHover={setHover} />)}
        <OrbitControls makeDefault target={TARGET.toArray()} enablePan={false} enableDamping dampingFactor={0.08} rotateSpeed={0.55}
          minDistance={52} maxDistance={190} minPolarAngle={0.25} maxPolarAngle={Math.PI - 0.25}
          autoRotate={spin && !fly} autoRotateSpeed={0.45} onStart={() => setSpin(false)} />
        <Framing frame={frame} cmd={cmd} />
        <LabelLayout boxes={boxes} lines={lines} />
        <FlyTo to={fly} reduced={reducedMotion} onArrive={onArrive} />
      </Canvas>
      <div className="globe-labels">
        <svg className="globe-leaders" aria-hidden="true">
          {GLOBE_MARKETS.map((m, i) => <line key={m.jur} ref={(el) => { lines.current[i] = el; }} stroke={m.color} />)}
        </svg>
        {GLOBE_MARKETS.map((m, i) => (
          <div key={m.jur} ref={(el) => { boxes.current[i] = el; }} className={`tag3d globe-tag${hover === m.jur ? " sel" : ""}`}
            onPointerEnter={() => setHover(m.jur)} onPointerLeave={() => setHover(null)} onClick={() => pick(m.jur)}>
            <b><Flag code={m.jur} />{m.name}</b>
            <span className="num">{counts[m.jur]} systems</span>
          </div>
        ))}
      </div>
    </div>
  );
}
