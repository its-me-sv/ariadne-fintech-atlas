import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { KIND_COLOR, type Kind } from "../ui/kinds";
import { PATHS, SLOT_POS, type Building, type Flow, type PathKey, type Slot, type StepMap } from "./worlds";

import { FLOW_COLOR, type CamCmd } from "./flow";
export { FLOW_COLOR, type CamCmd };
const GROUND = "#edf0fa";


// ---------- materials ----------
export const tint = (hex: string, toWhite: number) => "#" + new THREE.Color(hex).lerp(new THREE.Color("#ffffff"), toWhite).getHexString();
export function Clay({ color, rough = 0.86, opacity }: { color: string; rough?: number; opacity?: number }) {
  return <meshStandardMaterial color={color} roughness={rough} metalness={0} transparent={opacity !== undefined} opacity={opacity ?? 1} />;
}
export function Box({ a, p, color, r = 0.22, shadow = true }: { a: [number, number, number]; p: [number, number, number]; color: string; r?: number; shadow?: boolean }) {
  const rad = Math.min(r, a[0] / 2 - 0.01, a[1] / 2 - 0.01, a[2] / 2 - 0.01);
  return (
    <RoundedBox args={a} radius={Math.max(rad, 0.01)} smoothness={3} position={[p[0], p[1] + a[1] / 2, p[2]]} castShadow={shadow} receiveShadow>
      <Clay color={color} />
    </RoundedBox>
  );
}
export function Cyl({ r, h, p, color, seg = 28, r2 }: { r: number; h: number; p: [number, number, number]; color: string; seg?: number; r2?: number }) {
  return (
    <mesh position={[p[0], p[1] + h / 2, p[2]]} castShadow receiveShadow>
      <cylinderGeometry args={[r, r2 ?? r, h, seg]} />
      <Clay color={color} />
    </mesh>
  );
}
const WHITE = "#f7f8fd", OFF = "#e6eaf8", GLASS = "#d6e0ff";

// ---------- building kinds ----------
function Windows({ w, d, h, y0 = 0.9, cols = 3, color = GLASS }: { w: number; d: number; h: number; y0?: number; cols?: number; color?: string }) {
  const rows = Math.max(1, Math.floor((h - y0) / 1.6));
  const out: ReactNode[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const y = y0 + r * 1.6;
    out.push(<Box key={`f${r}-${c}`} a={[w * 0.2, 0.75, 0.12]} p={[-w * 0.3 + c * w * 0.3, y, d / 2 + 0.02]} color={color} r={0.06} shadow={false} />);
    out.push(<Box key={`s${r}-${c}`} a={[0.12, 0.75, d * 0.2]} p={[w / 2 + 0.02, y, -d * 0.3 + c * d * 0.3]} color={color} r={0.06} shadow={false} />);
  }
  return <>{out}</>;
}

export function CentralBank({ color }: { color: string }) {
  const body = WHITE, roof = color, roof2 = tint(color, 0.3);
  return (
    <group>
      <Box a={[17, 1.1, 9]} p={[0, 0, 0]} color={OFF} r={0.3} />
      <Box a={[15, 1, 7.6]} p={[0, 1.1, 0]} color={body} r={0.25} />
      <Box a={[13, 5.6, 5.2]} p={[0, 2.1, -0.8]} color={body} r={0.25} />
      {Array.from({ length: 9 }, (_, i) => <Cyl key={i} r={0.32} r2={0.36} h={5.6} p={[-6 + i * 1.5, 2.1, 2.6]} color={WHITE} />)}
      <Box a={[15.2, 1.1, 7.8]} p={[0, 7.7, 0]} color={roof} r={0.3} />
      <Box a={[12, 0.9, 5.2]} p={[0, 8.8, 0]} color={roof2} r={0.3} />
      <Cyl r={1.4} r2={1.6} h={0.5} p={[0, 9.7, 0]} color={WHITE} />
      <mesh position={[0, 10.4, 0]} scale={[1, 0.55, 1]} castShadow><sphereGeometry args={[1.25, 32, 20]} /><Clay color={roof} /></mesh>
      {[0, 1, 2].map((s) => <Box key={s} a={[17 - s * 0.8, 0.35, 1.2]} p={[0, 0, 4.8 + s * 0.6]} color={OFF} r={0.12} />)}
    </group>
  );
}

export function BankTower({ color, h, w = 5, d = 5 }: { color: string; h: number; w?: number; d?: number }) {
  return (
    <group>
      <Box a={[w + 1.2, 0.5, d + 1.2]} p={[0, 0, 0]} color={OFF} r={0.25} />
      <Box a={[w, h, d]} p={[0, 0.5, 0]} color={color} r={0.35} />
      <group position={[0, 0.5, 0]}><Windows w={w} d={d} h={h} /></group>
      <Box a={[w + 0.3, 0.55, d + 0.3]} p={[0, h + 0.5, 0]} color={tint(color, 0.28)} r={0.25} />
      <Cyl r={1.05} h={0.18} p={[0, h + 1.05, 0]} color={WHITE} />
      <Box a={[1.3, 1.6, 0.2]} p={[0, 0.5, d / 2 + 0.05]} color={WHITE} r={0.08} />
    </group>
  );
}

export function DataCentre({ color, w = 7.4, d = 5.8, h = 4.4 }: { color: string; w?: number; d?: number; h?: number }) {
  const deep = "#" + new THREE.Color(color).multiplyScalar(0.78).getHexString();
  return (
    <group>
      <Box a={[w + 0.8, 0.45, d + 0.8]} p={[0, 0, 0]} color={OFF} r={0.25} />
      <Box a={[w, h, d]} p={[0, 0.45, 0]} color={color} r={0.32} />
      {Array.from({ length: Math.round(w / 0.9) - 1 }, (_, i) => <Box key={`v${i}`} a={[0.24, h * 0.72, 0.14]} p={[-w / 2 + 0.9 + i * 0.9, 0.95, d / 2 + 0.02]} color={deep} r={0.06} shadow={false} />)}
      {Array.from({ length: Math.round(d / 0.9) - 1 }, (_, i) => <Box key={`s${i}`} a={[0.14, h * 0.72, 0.24]} p={[w / 2 + 0.02, 0.95, -d / 2 + 0.9 + i * 0.9]} color={deep} r={0.06} shadow={false} />)}
      <Box a={[w + 0.2, 0.4, d + 0.2]} p={[0, h + 0.45, 0]} color={tint(color, 0.3)} r={0.2} />
      {[-1, 0, 1].map((i) => <group key={i}><Box a={[1.3, 0.85, 1.3]} p={[i * w * 0.3, h + 0.85, -d * 0.15]} color={WHITE} r={0.2} /><Cyl r={0.42} h={0.12} p={[i * w * 0.3, h + 1.7, -d * 0.15]} color={OFF} /></group>)}
      <Box a={[1.6, 0.9, 1.4]} p={[w * 0.25, h + 0.85, d * 0.25]} color={WHITE} r={0.2} />
    </group>
  );
}

function Civic({ color }: { color: string }) {
  return (
    <group>
      <Box a={[6.6, 0.5, 5.2]} p={[0, 0, 0]} color={OFF} r={0.25} />
      <Box a={[5.8, 3.6, 4.4]} p={[0, 0.5, 0]} color={WHITE} r={0.28} />
      {[-2, -1, 0, 1, 2].map((i) => <Cyl key={i} r={0.22} h={3} p={[i * 1.15, 0.5, 2.3]} color={WHITE} seg={16} />)}
      <Box a={[6.2, 0.6, 4.8]} p={[0, 4.1, 0]} color={color} r={0.22} />
      <Box a={[4.4, 0.7, 3.2]} p={[0, 4.7, 0]} color={tint(color, 0.25)} r={0.25} />
      <Cyl r={0.06} h={2.2} p={[1.6, 5.4, -0.8]} color={OFF} seg={8} />
      <Box a={[1, 0.6, 0.06]} p={[2.1, 6.9, -0.8]} color={color} r={0.03} shadow={false} />
    </group>
  );
}

function DataHouse({ color }: { color: string }) {
  return (
    <group>
      <Box a={[6, 0.45, 4.8]} p={[0, 0, 0]} color={OFF} r={0.25} />
      <Box a={[5.2, 3.2, 4]} p={[0, 0.45, 0]} color={color} r={0.4} />
      <Windows w={5.2} d={4} h={3.4} y0={1.2} />
      <Box a={[5.4, 0.35, 4.2]} p={[0, 3.65, 0]} color={tint(color, 0.3)} r={0.15} />
      <group position={[1.3, 4.2, -0.6]} rotation={[-0.6, 0.6, 0]}>
        <mesh castShadow><sphereGeometry args={[0.9, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2.4]} /><meshStandardMaterial color={WHITE} roughness={0.8} side={THREE.DoubleSide} /></mesh>
      </group>
    </group>
  );
}

function CardHouse({ color }: { color: string }) {
  return (
    <group>
      <Box a={[6, 0.45, 4.8]} p={[0, 0, 0]} color={OFF} r={0.25} />
      <Box a={[5.2, 3.4, 4]} p={[0, 0.45, 0]} color={WHITE} r={0.35} />
      <Box a={[5.4, 0.4, 4.2]} p={[0, 3.85, 0]} color={color} r={0.2} />
      <group position={[0, 5.9, 0.2]} rotation={[0, 0.25, 0]}>
        <Box a={[3.6, 2.3, 0.22]} p={[0, -1.15, 0]} color={color} r={0.28} />
        <Box a={[0.8, 0.6, 0.06]} p={[-0.9, -0.55, 0.14]} color={"#ffd38a"} r={0.08} shadow={false} />
        <Box a={[2.8, 0.25, 0.06]} p={[0, -1.6, 0.14]} color={tint(color, 0.5)} r={0.05} shadow={false} />
      </group>
      <Cyl r={0.1} h={1.6} p={[-1, 3.9, 0.2]} color={OFF} seg={8} />
      <Cyl r={0.1} h={1.6} p={[1, 3.9, 0.2]} color={OFF} seg={8} />
    </group>
  );
}

function WalletSculpture({ color }: { color: string }) {
  return (
    <group>
      <Box a={[5, 0.45, 4]} p={[0, 0, 0]} color={OFF} r={0.25} />
      <group rotation={[0, -0.3, 0]}>
        <Box a={[2.6, 5, 0.6]} p={[0, 0.45, 0]} color={color} r={0.45} />
        <Box a={[2.1, 3.9, 0.08]} p={[0, 0.95, 0.31]} color={"#fffbea"} r={0.12} shadow={false} />
        <Box a={[1, 1, 0.06]} p={[0, 2.6, 0.36]} color={tint(color, 0.1)} r={0.12} shadow={false} />
      </group>
    </group>
  );
}

export function Vault({ color }: { color: string }) {
  return (
    <group>
      <Cyl r={3.3} h={0.45} p={[0, 0, 0]} color={OFF} seg={40} />
      <Cyl r={2.7} h={4} p={[0, 0.45, 0]} color={color} seg={40} />
      <Cyl r={2.85} h={0.4} p={[0, 4.45, 0]} color={tint(color, 0.3)} seg={40} />
      <mesh position={[0, 6.4, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[1.25, 1.25, 0.35, 40]} /><meshStandardMaterial color="#f2c14e" roughness={0.45} metalness={0.15} />
      </mesh>
      <Cyl r={0.12} h={1.2} p={[0, 4.85, 0]} color={OFF} seg={8} />
      <Box a={[1.6, 2.2, 0.3]} p={[0, 0.45, 2.6]} color={WHITE} r={0.2} />
    </group>
  );
}

function MarketTower({ color }: { color: string }) {
  return (
    <group>
      <Box a={[5.6, 0.45, 5]} p={[0, 0, 0]} color={OFF} r={0.25} />
      <Box a={[4.4, 7.5, 4]} p={[0, 0.45, 0]} color={color} r={0.35} />
      <group position={[0, 0.45, 0]}><Windows w={4.4} d={4} h={7.6} cols={2} /></group>
      <Box a={[4.7, 0.7, 4.3]} p={[0, 4.6, 0]} color={"#17213a"} r={0.15} shadow={false} />
      <Box a={[4.6, 0.4, 4.2]} p={[0, 7.95, 0]} color={tint(color, 0.3)} r={0.2} />
    </group>
  );
}

function Shop({ color }: { color: string }) {
  return (
    <group>
      <Box a={[6.4, 0.4, 4.6]} p={[0, 0, 0]} color={OFF} r={0.2} />
      <Box a={[5.6, 3, 3.8]} p={[0, 0.4, 0]} color={WHITE} r={0.3} />
      {Array.from({ length: 6 }, (_, i) => <Box key={i} a={[0.9, 0.28, 1.5]} p={[-2.3 + i * 0.92, 3.05, 2.4]} color={i % 2 ? WHITE : color} r={0.1} />)}
      <Box a={[1.2, 2, 0.15]} p={[-1.2, 0.4, 1.92]} color={GLASS} r={0.06} shadow={false} />
      <Box a={[2, 1.3, 0.15]} p={[1.1, 1.1, 1.92]} color={GLASS} r={0.06} shadow={false} />
      <Box a={[5.8, 0.45, 4]} p={[0, 3.4, 0]} color={color} r={0.2} />
      {([[3.6, -1.2], [3.6, -0.1], [4.7, -0.7]] as const).map(([x, z], i) => (
        <group key={i}><Box a={[0.95, 0.8, 0.95]} p={[x, 0, z]} color="#d7b184" r={0.08} />{i < 2 && <Box a={[0.85, 0.7, 0.85]} p={[x, 0.8, z]} color="#c49a6c" r={0.08} />}</group>
      ))}
    </group>
  );
}

function Home({ color }: { color: string }) {
  return (
    <group>
      <Box a={[5.4, 0.4, 4.4]} p={[0, 0, 0]} color={OFF} r={0.2} />
      <Box a={[4.2, 2.8, 3.4]} p={[0, 0.4, 0]} color={WHITE} r={0.3} />
      <mesh position={[0, 4.15, 0]} rotation={[0, Math.PI / 4, 0]} castShadow receiveShadow>
        <coneGeometry args={[3.3, 1.9, 4]} /><Clay color={color} />
      </mesh>
      <Box a={[1, 1.7, 0.15]} p={[0, 0.4, 1.72]} color={tint(color, 0.2)} r={0.06} shadow={false} />
      <Box a={[0.9, 0.8, 0.1]} p={[-1.3, 1.6, 1.72]} color={GLASS} r={0.05} shadow={false} />
      <Box a={[0.9, 0.8, 0.1]} p={[1.3, 1.6, 1.72]} color={GLASS} r={0.05} shadow={false} />
    </group>
  );
}

function Person({ color }: { color: string }) {
  return (
    <group>
      <Cyl r={0.55} r2={0.65} h={1.6} p={[0, 0, 0]} color={color} />
      <mesh position={[0, 2.2, 0]} castShadow><sphereGeometry args={[0.55, 24, 16]} /><Clay color="#f2c9a5" /></mesh>
      <Box a={[0.38, 0.62, 0.1]} p={[0.55, 1.15, 0.45]} color="#2a3150" r={0.05} />
    </group>
  );
}

const KIND_BODY: Record<Building["kind"], (c: string, slot: Slot) => ReactNode> = {
  central: (c) => <CentralBank color={c} />,
  bank: (c, slot) => <BankTower color={c} h={slot === "payeeBank" ? 12.6 : 9.6} w={slot === "payeeBank" ? 5.2 : 5} d={slot === "payeeBank" ? 5.2 : 5} />,
  switch: (c, slot) => (slot === "switch" ? <DataCentre color={c} /> : slot === "switch2" ? <DataCentre color={c} w={6} d={4.6} h={3.6} /> : <DataCentre color={c} w={5.4} d={4.4} h={3.2} />),
  regulator: (c) => <Civic color={c} />,
  data: (c) => <DataHouse color={c} />,
  card: (c) => <CardHouse color={c} />,
  wallet: (c) => <WalletSculpture color={c} />,
  cbdc: (c, slot) => (slot === "switch" ? <DataCentre color={c} /> : <Vault color={c} />),
  market: (c) => <MarketTower color={c} />,
  merchant: (c) => <Shop color={c} />,
  home: (c) => <Home color={c} />,
  person: (c) => <Person color={c} />,
  law: (c) => <Civic color={c} />,
  standard: (c) => <DataHouse color={c} />,
  concept: (c) => <DataHouse color={c} />,
};
const LABEL_Y: Partial<Record<Slot, number>> = { cb: 15.6, payerBank: 14.8, payeeBank: 17.9, switch: 10.2, switch2: 8.4, payer: 6.4, payee: 7.6, cbdc: 10.6 };

export function BuildingView({ b, focused, dim, onPick }: { b: Building; focused: boolean; dim: boolean; onPick: (b: Building) => void }) {
  const [hover, setHover] = useState(false);
  const color = b.kind === "home" ? KIND_COLOR.person : KIND_COLOR[b.kind as Kind];
  const [x, z] = SLOT_POS[b.slot];
  const minor = !LABEL_Y[b.slot];
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!g.current) return;
    const target = hover ? 0.35 : 0;
    g.current.position.y += (target - g.current.position.y) * Math.min(1, dt * 10);
  });
  useEffect(() => { document.body.style.cursor = hover ? "pointer" : ""; return () => { document.body.style.cursor = ""; }; }, [hover]);
  return (
    <group position={[x, 0, z]}>
      <group
        ref={g}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); }}
        onPointerOut={() => setHover(false)}
        onClick={(e) => { e.stopPropagation(); onPick(b); }}
      >
        {KIND_BODY[b.kind](color, b.slot)}
      </group>
      <Html position={[0, LABEL_Y[b.slot] ?? 6.4, 0]} center zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
        <div className={`tag3d${focused ? " sel" : ""}${minor ? " minor" : ""}${dim ? " dim" : ""}`}>
          <b>{b.label}</b>{!minor && <span>{b.sub}</span>}
        </div>
      </Html>
    </group>
  );
}

// ---------- city fabric ----------
function Plane({ w, d, x, z, y = 0.01, color }: { w: number; d: number; x: number; z: number; y?: number; color: string }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, y, z]} receiveShadow>
      <planeGeometry args={[w, d]} /><meshStandardMaterial color={color} roughness={1} />
    </mesh>
  );
}
export function CityFabric() {
  const road = "#d9def0", lane = "#ffffff";
  const lanes = useMemo(() => {
    const out: ReactNode[] = [];
    for (let x = -60; x < 70; x += 5) out.push(<Plane key={`a${x}`} w={2.4} d={0.22} x={x} z={15} y={0.03} color={lane} />);
    for (let z = -60; z < 70; z += 5) out.push(<Plane key={`b${z}`} w={0.22} d={2.4} x={-18} z={z} y={0.03} color={lane} />);
    for (let z = -60; z < 70; z += 5) out.push(<Plane key={`c${z}`} w={0.22} d={2.4} x={24.5} z={z} y={0.03} color={lane} />);
    return out;
  }, []);
  const trees: [number, number][] = [[-20.5, 6], [-20.5, -6], [-20.5, -16], [-14.5, 21], [-4, 21], [7, 21], [19, 21], [25, 12], [-20, -31], [16, -30], [47, 8], [-34, -4], [-34, 15], [36, 12], [6, -31], [25, -28]];
  const fillers: [number, number, number, number, number][] = [[-38, -30, 7, 6, 9], [-40, -12, 6, 6, 5], [52, -30, 8, 7, 12], [53, -12, 6, 6, 6], [52, 6, 6, 8, 4], [-40, 4, 6, 7, 4], [14, -42, 10, 6, 7], [-8, -44, 8, 6, 10], [34, 24, 7, 5, 5], [-30, 26, 8, 6, 6], [26, -38, 7, 6, 8]];
  return (
    <group>
      <Plane w={500} d={500} x={0} z={0} y={0} color="#ecf0fa" />
      <Plane w={160} d={7} x={0} z={15} y={0.02} color={road} />
      <Plane w={7} d={160} x={-18} z={0} y={0.02} color={road} />
      <Plane w={7} d={160} x={24.5} z={0} y={0.02} color={road} />
      <Plane w={5} d={30} x={13.6} z={-1} y={0.025} color={road} />
      <Plane w={30} d={4.6} x={0} z={-14.4} y={0.025} color={road} />
      {lanes}
      {Array.from({ length: 5 }, (_, i) => <Plane key={i} w={0.16} d={3} x={16 + i * 1.6} z={10.6} y={0.03} color="#cbd3f2" />)}
      {trees.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <Cyl r={0.14} r2={0.18} h={1.6} p={[0, 0, 0]} color="#c9bcaf" seg={10} />
          <mesh position={[0, 2.3, 0]} scale={[1, 1.12, 1]} castShadow><sphereGeometry args={[1.05 + (i % 3) * 0.12, 24, 16]} /><Clay color={i % 4 === 0 ? "#86d7a4" : "#6bcb91"} /></mesh>
        </group>
      ))}
      {fillers.map(([x, z, w, d, h], i) => <Box key={i} a={[w, h, d]} p={[x, 0, z]} color={WHITE} r={0.4} />)}
    </group>
  );
}

// ---------- flows ----------
function Ribbon({ path, flow, strong, y }: { path: readonly (readonly [number, number])[]; flow: Flow; strong: boolean; y: number }) {
  const meshes = useMemo(() => {
    const out: { p: [number, number, number]; rot: number; len: number }[] = [];
    const dash = flow === "value" ? 0 : flow === "data" ? 0.5 : 1.3;
    for (let i = 0; i < path.length - 1; i++) {
      const a = new THREE.Vector2(path[i][0], path[i][1]), b = new THREE.Vector2(path[i + 1][0], path[i + 1][1]);
      const len = a.distanceTo(b), ang = Math.atan2(b.x - a.x, b.y - a.y);
      const seg = dash ? Math.max(1, Math.floor(len / dash)) : 1;
      for (let k = 0; k < seg; k++) {
        const t0 = dash ? k / seg : 0, t1 = dash ? (k + (flow === "data" ? 0.45 : 0.55)) / seg : 1;
        const m = a.clone().lerp(b, (t0 + t1) / 2);
        out.push({ p: [m.x, y, m.y], rot: ang, len: len * (t1 - t0) });
      }
    }
    return out;
  }, [path, flow, y]);
  const width = strong ? 0.6 : 0.4;
  return (
    <group>
      {meshes.map((m, i) => (
        <mesh key={i} position={m.p} rotation={[-Math.PI / 2, 0, m.rot]}>
          <planeGeometry args={[width, m.len]} />
          <meshBasicMaterial color={FLOW_COLOR[flow]} transparent opacity={strong ? 0.95 : 0.35} />
        </mesh>
      ))}
    </group>
  );
}

function Vehicle({ path, flow, reduced }: { path: readonly (readonly [number, number])[]; flow: Flow; reduced: boolean }) {
  const g = useRef<THREE.Group>(null);
  const segs = useMemo(() => {
    const s: { a: THREE.Vector2; b: THREE.Vector2; len: number }[] = [];
    for (let i = 0; i < path.length - 1; i++) {
      const a = new THREE.Vector2(...path[i]), b = new THREE.Vector2(...path[i + 1]);
      s.push({ a, b, len: a.distanceTo(b) });
    }
    return s;
  }, [path]);
  const total = segs.reduce((x, s) => x + s.len, 0);
  const t = useRef(reduced ? total * 0.55 : 0);
  useFrame((_, dt) => {
    if (!g.current) return;
    if (!reduced) t.current = (t.current + dt * 5.5) % (total + 3);
    let d = Math.min(t.current, total);
    for (const s of segs) {
      if (d <= s.len) {
        const p = s.a.clone().lerp(s.b, d / s.len);
        g.current.position.set(p.x, flow === "data" ? 1.6 : 0, p.y);
        g.current.rotation.y = Math.atan2(s.b.x - s.a.x, s.b.y - s.a.y);
        break;
      }
      d -= s.len;
    }
    if (flow === "data") g.current.position.y = 1.6 + Math.sin(performance.now() / 300) * 0.15;
  });
  const color = FLOW_COLOR[flow];
  return (
    <group ref={g}>
      {flow === "data" ? (
        <group>
          <mesh castShadow><sphereGeometry args={[0.55, 24, 16]} /><Clay color={color} /></mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.95, 0.1, 10, 32]} /><Clay color={tint(color, 0.35)} /></mesh>
        </group>
      ) : (
        <group scale={0.95}>
          <Box a={[1.7, 1.6, 3]} p={[0, 0.35, -0.5]} color={flow === "value" ? "#fff7e0" : "#ffffff"} r={0.22} />
          {flow === "value" && <Box a={[1.2, 0.6, 1.4]} p={[0, 1.95, -0.6]} color="#f2c14e" r={0.15} />}
          <Box a={[1.7, 1.25, 1.4]} p={[0, 0.35, 1.6]} color={color} r={0.25} />
          <Box a={[1.5, 0.5, 0.1]} p={[0, 1.05, 2.33]} color={GLASS} r={0.05} shadow={false} />
          {([[-0.86, -1.3], [0.86, -1.3], [-0.86, 1.5], [0.86, 1.5]] as const).map(([wx, wz], i) => (
            <mesh key={i} position={[wx, 0.36, wz]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.36, 0.36, 0.3, 18]} /><Clay color="#2a3150" /></mesh>
          ))}
        </group>
      )}
    </group>
  );
}

function Pin({ x, z, y }: { x: number; z: number; y: number }) {
  const g = useRef<THREE.Group>(null);
  useFrame(() => { if (g.current) g.current.position.y = y + Math.sin(performance.now() / 420) * 0.18; });
  return (
    <group ref={g} position={[x, y, z]}>
      <mesh position={[0, 1.3, 0]} castShadow><sphereGeometry args={[0.62, 24, 16]} /><Clay color="#3157e6" rough={0.6} /></mesh>
      <mesh position={[0, 0.6, 0]} rotation={[Math.PI, 0, 0]} castShadow><coneGeometry args={[0.5, 1.1, 24]} /><Clay color="#3157e6" rough={0.6} /></mesh>
      <mesh position={[0, 1.36, 0.5]}><sphereGeometry args={[0.26, 16, 12]} /><Clay color="#ffffff" /></mesh>
    </group>
  );
}
const PIN_Y: Partial<Record<Slot, number>> = { cb: 11.3, payerBank: 11, payeeBank: 14, switch: 6.4, switch2: 4.8, payer: 2.9, payee: 3.9, cbdc: 7.6 };

// ---------- camera ----------
const TARGET = new THREE.Vector3(5, 0, -5);
const HOME = new THREE.Vector3(TARGET.x - 66, 86, TARGET.z + 99);
export function CameraRig({ cmd, shiftX, target = TARGET, home = HOME }: { cmd: CamCmd; shiftX: number; target?: THREE.Vector3; home?: THREE.Vector3 }) {
  const { camera, size } = useThree();
  const controls = useThree((s) => s.controls) as unknown as OrbitControlsImpl | null;
  const shift = useRef(shiftX);
  useFrame((_, dt) => {
    shift.current += (shiftX - shift.current) * Math.min(1, dt * 6);
    (camera as THREE.PerspectiveCamera).setViewOffset(size.width, size.height, shift.current, size.width < 820 ? size.height * 0.08 : -size.height * 0.02, size.width, size.height);
  });
  useEffect(() => {
    if (!cmd || !controls) return;
    const off = camera.position.clone().sub(controls.target);
    if (cmd.type === "in") off.multiplyScalar(0.8);
    if (cmd.type === "out") off.multiplyScalar(1.25);
    if (cmd.type === "left" || cmd.type === "right") off.applyAxisAngle(new THREE.Vector3(0, 1, 0), (cmd.type === "left" ? 1 : -1) * Math.PI / 8);
    if (cmd.type === "reset") { controls.target.copy(target); camera.position.copy(home); controls.update(); return; }
    camera.position.copy(controls.target.clone().add(off));
    controls.update();
  }, [cmd, camera, controls, target, home]);
  return null;
}

// ---------- scene ----------
export interface SceneProps {
  buildings: Building[];
  step: StepMap | null;
  allSteps: StepMap[];
  onPick: (b: Building) => void;
  cmd: CamCmd;
  shiftX: number;
  reducedMotion: boolean;
}

export default function Scene({ buildings, step, allSteps, onPick, cmd, shiftX, reducedMotion }: SceneProps) {
  const focus = new Set(step?.focus ?? []);
  const seen = useMemo(() => {
    const m = new Map<string, { path: PathKey; flow: Flow }>();
    for (const s of allSteps) for (const r of s.routes) m.set(`${r.path}:${r.flow}`, r);
    return [...m.values()];
  }, [allSteps]);
  return (
    <Canvas
      shadows={{ type: THREE.PCFSoftShadowMap }}
      dpr={[1, 1.75]}
      camera={{ fov: 28, near: 0.5, far: 600, position: HOME.toArray() }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.08 }}
      onPointerMissed={() => undefined}
    >
      <color attach="background" args={[GROUND]} />
      <fog attach="fog" args={[GROUND, 125, 220]} />
      <hemisphereLight args={["#ffffff", "#c9d0ee", 1.55]} />
      <directionalLight
        castShadow position={[-22, 40, 26]} intensity={2.1}
        shadow-mapSize={[2048, 2048]} shadow-radius={6} shadow-bias={-0.0004}
        shadow-camera-left={-60} shadow-camera-right={60} shadow-camera-top={60} shadow-camera-bottom={-60} shadow-camera-far={160}
      />
      <directionalLight position={[30, 20, -10]} intensity={0.55} color="#dde4ff" />
      <CityFabric />
      {seen.map((r, i) => {
        const strong = !!step?.routes.some((s) => s.path === r.path && s.flow === r.flow);
        return strong ? null : <Ribbon key={`b${i}`} path={PATHS[r.path]} flow={r.flow} strong={false} y={0.05 + (i % 3) * 0.004} />;
      })}
      {step?.routes.map((r, i) => (
        <group key={`${r.path}-${r.flow}-${i}`}>
          <Ribbon path={PATHS[r.path]} flow={r.flow} strong y={0.07 + i * 0.004} />
          <Vehicle path={PATHS[r.path]} flow={r.flow} reduced={reducedMotion} />
        </group>
      ))}
      {buildings.map((b) => (
        <BuildingView key={b.slot} b={b} focused={focus.has(b.slot)} dim={!!step && !focus.has(b.slot) && !!LABEL_Y[b.slot]} onPick={onPick} />
      ))}
      {[...focus].map((s) => {
        const [x, z] = SLOT_POS[s];
        return <Pin key={s} x={x} z={z} y={PIN_Y[s] ?? 5} />;
      })}
      <OrbitControls makeDefault target={TARGET.toArray()} enableDamping dampingFactor={0.08} minDistance={40} maxDistance={190} minPolarAngle={0.45} maxPolarAngle={1.18} />
      <CameraRig cmd={cmd} shiftX={shiftX} />
    </Canvas>
  );
}
