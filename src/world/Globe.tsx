// Global scope: a round clay globe. Land is drawn onto a canvas texture with d3-geo from the
// world-atlas 110m countries; the six markets are filled in their colours and carry a pin at the
// financial capital. Clicking a pin or a highlighted country eases the camera there, then opens
// that market's city.
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { geoContains, geoDistance, geoEquirectangular, geoGraticule10, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { useAtlas, inJur } from "../data/store";
import type { Jur } from "../data/types";
import { CameraRig, tint } from "./Scene";
import type { CamCmd } from "./flow";
import { Flag } from "../ui/Flag";

type Market = Exclude<Jur, "GLOBAL">;

const R = 20;
const OCEAN = "#e4e8f8";
const LAND = "#f6f3ee";
const LAND_EDGE = "#e2dcd2";

// ISO 3166-1 numeric ids, as used by world-atlas
const EU27 = ["040", "056", "100", "191", "196", "203", "208", "233", "246", "250", "276", "300", "348", "372", "380", "428", "440", "442", "470", "528", "616", "620", "642", "703", "705", "724", "752"];
const COUNTRY_MARKET: Record<string, Market> = { "356": "IN", "826": "UK", "840": "US", "702": "SG", "156": "CN" };
for (const id of EU27) COUNTRY_MARKET[id] = "EU";
// Too small for the 110m outlines: drawn as dots, and clickable within a small radius
const SMALL: { market: Market; lon: number; lat: number }[] = [
  { market: "SG", lon: 103.82, lat: 1.35 },
  { market: "EU", lon: 14.45, lat: 35.9 }, // Malta
];

export const GLOBE_MARKETS: { jur: Market; name: string; city: string; color: string; lat: number; lon: number }[] = [
  { jur: "IN", name: "India", city: "New Delhi", color: "#f97316", lat: 28.61, lon: 77.21 },
  { jur: "UK", name: "United Kingdom", city: "London", color: "#3d63ea", lat: 51.51, lon: -0.13 },
  { jur: "US", name: "United States", city: "Washington", color: "#8b5cf6", lat: 38.91, lon: -77.04 },
  { jur: "EU", name: "EU and euro area", city: "Frankfurt", color: "#14b8a6", lat: 50.11, lon: 8.68 },
  { jur: "SG", name: "Singapore", city: "Singapore", color: "#fb6f84", lat: 1.35, lon: 103.82 },
  { jur: "CN", name: "Mainland China", city: "Beijing", color: "#d946ef", lat: 39.9, lon: 116.4 },
];
const COLOR: Record<Market, string> = Object.fromEntries(GLOBE_MARKETS.map((m) => [m.jur, m.color])) as Record<Market, string>;

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

const HOME = latLonToVec3(24, 45, 118);
const TARGET = new THREE.Vector3(0, 0, 0);

type CountryFeature = Feature<Geometry, { name: string }>;

function useCountries() {
  const [features, setFeatures] = useState<CountryFeature[] | null>(null);
  useEffect(() => {
    let live = true;
    Promise.all([import("world-atlas/countries-110m.json"), import("topojson-client")]).then(([topo, tj]) => {
      const t = (topo.default ?? topo) as unknown as Parameters<typeof tj.feature>[0];
      const fc = tj.feature(t, (t as unknown as { objects: { countries: never } }).objects.countries) as unknown as FeatureCollection<Geometry, { name: string }>;
      if (live) setFeatures(fc.features);
    });
    return () => { live = false; };
  }, []);
  return features;
}

function drawTexture(features: CountryFeature[]) {
  const W = 2048, H = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const proj = geoEquirectangular().scale(W / (2 * Math.PI)).translate([W / 2, H / 2]).precision(0.1);
  const path = geoPath(proj, ctx);
  ctx.fillStyle = OCEAN;
  ctx.fillRect(0, 0, W, H);
  ctx.beginPath(); path(geoGraticule10());
  ctx.strokeStyle = "rgba(110, 122, 190, 0.10)"; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.lineJoin = "round";
  // a soft offset shadow under all land gives the flat map a little clay relief
  ctx.save(); ctx.translate(1.5, 2.5);
  for (const f of features) { ctx.beginPath(); path(f); ctx.fillStyle = "rgba(120, 128, 175, 0.16)"; ctx.fill(); }
  ctx.restore();
  for (const f of features) {
    const m = COUNTRY_MARKET[String(f.id)];
    ctx.beginPath(); path(f);
    ctx.fillStyle = m ? tint(COLOR[m], 0.08) : LAND;
    ctx.fill();
    ctx.strokeStyle = m ? tint(COLOR[m], 0.45) : LAND_EDGE;
    ctx.lineWidth = m ? 1.4 : 1.1;
    ctx.stroke();
  }
  for (const s of SMALL) {
    const [x, y] = proj([s.lon, s.lat])!;
    ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = COLOR[s.market]; ctx.fill();
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.5; ctx.stroke();
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

function Pin({ m, count, hot, onPick, onHover }: {
  m: (typeof GLOBE_MARKETS)[number]; count: number; hot: boolean; onPick: (j: Market) => void; onHover: (j: Market | null) => void;
}) {
  const pos = useMemo(() => latLonToVec3(m.lat, m.lon, R), [m]);
  const quat = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), pos.clone().normalize()), [pos]);
  const label = useRef<HTMLDivElement>(null);
  const { camera } = useThree();
  const facing = useRef(true);
  // hide the label once its pin turns to the far side of the globe
  useFrame(() => {
    const vis = pos.clone().normalize().dot(camera.position.clone().normalize()) > 0.18;
    if (vis !== facing.current && label.current) {
      facing.current = vis;
      label.current.style.opacity = vis ? "1" : "0";
      label.current.style.pointerEvents = vis ? "auto" : "none";
    }
  });
  const s = hot ? 1.18 : 1;
  return (
    <group position={pos} quaternion={quat}>
      <group scale={s}
        onPointerOver={(e) => { e.stopPropagation(); onHover(m.jur); }}
        onPointerOut={() => onHover(null)}
        onClick={(e) => { e.stopPropagation(); if (e.delta <= 4) onPick(m.jur); }}>
        <mesh position={[0, 1.5, 0]}><sphereGeometry args={[1.6, 12, 10]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
        <mesh position={[0, 0.55, 0]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.32, 1.1, 20]} /><meshStandardMaterial color={m.color} roughness={0.6} /></mesh>
        <mesh position={[0, 1.3, 0]}><sphereGeometry args={[0.55, 24, 16]} /><meshStandardMaterial color={m.color} roughness={0.6} /></mesh>
        <mesh position={[0, 1.3, 0]} scale={0.45}><sphereGeometry args={[0.55, 16, 12]} /><meshStandardMaterial color="#ffffff" roughness={0.7} /></mesh>
      </group>
      <Html position={[0, 3.2, 0]} center zIndexRange={[5, 0]}>
        <div ref={label} className={`tag3d globe-tag${hot ? " sel" : ""}`} style={{ transition: "opacity 0.25s" }}
          onPointerEnter={() => onHover(m.jur)} onPointerLeave={() => onHover(null)} onClick={() => onPick(m.jur)}>
          <b><Flag code={m.jur} />{m.name}</b>
          <span className="num">{count} systems</span>
        </div>
      </Html>
    </group>
  );
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

/** Keeps the key light over the viewer's shoulder, so the side facing the camera is always lit. */
function CameraLight() {
  const light = useRef<THREE.DirectionalLight>(null);
  const { camera } = useThree();
  useFrame(() => {
    light.current?.position.set(-0.55, 0.7, 1).applyQuaternion(camera.quaternion).multiplyScalar(100);
  });
  return <directionalLight ref={light} intensity={1.6} />;
}

export default function Globe({ onPick, cmd, reducedMotion }: { onPick: (j: Jur) => void; cmd: CamCmd; reducedMotion: boolean }) {
  const core = useAtlas((s) => s.core);
  const features = useCountries();
  const [hover, setHover] = useState<Market | null>(null);
  const [spin, setSpin] = useState(!reducedMotion);
  const [fly, setFly] = useState<{ jur: Market; dir: THREE.Vector3 } | null>(null);
  const firstCmd = useRef(cmd);

  useEffect(() => { if (reducedMotion) setSpin(false); }, [reducedMotion]);
  useEffect(() => { if (cmd !== firstCmd.current) setSpin(false); }, [cmd]);
  useEffect(() => { document.body.style.cursor = hover ? "pointer" : ""; }, [hover]);
  useEffect(() => () => { document.body.style.cursor = ""; }, []);

  const texture = useMemo(() => {
    if (!features) return null;
    const t = new THREE.CanvasTexture(drawTexture(features));
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [features]);
  useEffect(() => () => texture?.dispose(), [texture]);

  const counts = useMemo(() => {
    const out = {} as Record<Market, number>;
    for (const m of GLOBE_MARKETS) out[m.jur] = core?.nodes.filter((n) => !n.stub && inJur(n.jurisdictions, m.jur)).length ?? 0;
    return out;
  }, [core]);

  const pick = (j: Market) => {
    if (fly) return;
    const m = GLOBE_MARKETS.find((x) => x.jur === j)!;
    setSpin(false);
    setFly({ jur: j, dir: latLonToVec3(m.lat, m.lon, 1) });
  };
  const onArrive = (j: Market) => { setFly(null); onPick(j); };

  const hit = (e: ThreeEvent<PointerEvent | MouseEvent>) => marketAt(vec3ToLonLat(e.point), features);

  return (
    <Canvas dpr={[1, 1.75]} camera={{ fov: 28, near: 1, far: 800, position: HOME.toArray() }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}>
      <color attach="background" args={["#edf0fa"]} />
      <hemisphereLight args={["#ffffff", "#c9d0ee", 1.7]} />
      <CameraLight />
      <mesh
        onPointerMove={(e) => { e.stopPropagation(); setHover(hit(e)); }}
        onPointerOut={() => setHover(null)}
        onClick={(e) => { e.stopPropagation(); if (e.delta > 4) return; const m = hit(e); if (m) pick(m); }}>
        <sphereGeometry args={[R, 96, 64]} />
        {texture ? <meshStandardMaterial map={texture} roughness={0.92} metalness={0} /> : <meshStandardMaterial color={OCEAN} roughness={0.92} />}
      </mesh>
      {/* soft halo */}
      <mesh scale={1.035}><sphereGeometry args={[R, 64, 48]} /><meshBasicMaterial color="#c9d2f5" transparent opacity={0.22} side={THREE.BackSide} depthWrite={false} /></mesh>
      {GLOBE_MARKETS.map((m) => <Pin key={m.jur} m={m} count={counts[m.jur]} hot={hover === m.jur} onPick={pick} onHover={setHover} />)}
      <OrbitControls makeDefault target={TARGET.toArray()} enablePan={false} enableDamping dampingFactor={0.08} rotateSpeed={0.55}
        minDistance={52} maxDistance={190} minPolarAngle={0.25} maxPolarAngle={Math.PI - 0.25}
        autoRotate={spin && !fly} autoRotateSpeed={0.45} onStart={() => setSpin(false)} />
      <CameraRig cmd={cmd} shiftX={0} target={TARGET} home={HOME} />
      <FlyTo to={fly} reduced={reducedMotion} onArrive={onArrive} />
    </Canvas>
  );
}
