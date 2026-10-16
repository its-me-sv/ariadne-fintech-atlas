// Global scope: six clay islands, one per market. Each carries a small central bank,
// its main rail and two banks; the label shows live counts and the CBDC status from the dataset.
import { useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useAtlas, inJur, prettyStatus } from "../data/store";
import type { Jur } from "../data/types";
import { KIND_COLOR } from "../ui/kinds";
import { BankTower, Box, CameraRig, CentralBank, DataCentre, Vault, tint } from "./Scene";
import type { CamCmd } from "./flow";
import { WORLDS } from "./worlds";

const PLACES: { jur: Exclude<Jur, "GLOBAL">; name: string; color: string; x: number; z: number }[] = [
  { jur: "UK", name: "United Kingdom", color: "#3d63ea", x: -32, z: -16 },
  { jur: "EU", name: "EU and euro area", color: "#14b8a6", x: 0, z: -16 },
  { jur: "US", name: "United States", color: "#8b5cf6", x: 32, z: -16 },
  { jur: "IN", name: "India", color: "#f97316", x: -32, z: 16 },
  { jur: "SG", name: "Singapore", color: "#fb6f84", x: 0, z: 16 },
  { jur: "CN", name: "Mainland China", color: "#d946ef", x: 32, z: 16 },
];
const TARGET = new THREE.Vector3(0, 0, 0);
const HOME = new THREE.Vector3(-74, 104, 118);

function Island({ p, onPick, info }: { p: (typeof PLACES)[number]; onPick: (j: Jur) => void; info: { rails: number; rules: number; cbdc: string; cbdcName: string } }) {
  const [hover, setHover] = useState(false);
  return (
    <group position={[p.x, hover ? 0.6 : 0, p.z]}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = ""; }}
      onClick={(e) => { e.stopPropagation(); onPick(p.jur); }}>
      <Box a={[24, 2.2, 20]} p={[0, -2.2, 0]} color={tint(p.color, 0.78)} r={1.2} />
      <Box a={[23, 0.4, 19]} p={[0, 0, 0]} color={tint(p.color, 0.88)} r={0.8} />
      <group position={[0, 0.4, -4.5]} scale={0.48}><CentralBank color={KIND_COLOR.central} /></group>
      <group position={[0, 0.4, 3.5]} scale={0.6}><DataCentre color={KIND_COLOR.switch} /></group>
      <group position={[-7.5, 0.4, 1]} scale={0.55}><BankTower color={KIND_COLOR.bank} h={9.6} /></group>
      <group position={[7.5, 0.4, -1]} scale={0.55}><BankTower color={KIND_COLOR.bank} h={12} /></group>
      <group position={[7.8, 0.4, 6.4]} scale={0.5}><Vault color={KIND_COLOR.cbdc} /></group>
      <Html position={[0, 9.5, 0]} center zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
        <div className={`tag3d island${hover ? " sel" : ""}`}>
          <b style={{ fontSize: 14 }}>{p.name}</b>
          <span className="num">{info.rails} rails, {info.rules} rules</span>
          <span>{info.cbdcName}: {info.cbdc}</span>
        </div>
      </Html>
    </group>
  );
}

export default function Islands({ onPick, cmd }: { onPick: (j: Jur) => void; cmd: CamCmd }) {
  const { core, idx } = useAtlas();
  const info = useMemo(() => {
    const out: Record<string, { rails: number; rules: number; cbdc: string; cbdcName: string }> = {};
    for (const p of PLACES) {
      const rails = core?.nodes.filter((n) => !n.stub && ["rail", "rtgs", "ach", "instant_payment_system"].includes(n.type) && inJur(n.jurisdictions, p.jur)).length ?? 0;
      const rules = core?.rules.filter((r) => inJur(r.jurisdictions, p.jur)).length ?? 0;
      const w = WORLDS.find((x) => x.jur === p.jur);
      const cb = w?.buildings.find((b) => b.slot === "cbdc" && b.kind === "cbdc") ?? w?.buildings.find((b) => b.kind === "cbdc");
      const n = cb?.nodeId ? idx?.node.get(cb.nodeId) : undefined;
      out[p.jur] = { rails, rules, cbdc: prettyStatus(n?.status), cbdcName: cb?.label ?? "CBDC" };
    }
    return out;
  }, [core, idx]);
  return (
    <Canvas shadows={{ type: THREE.PCFSoftShadowMap }} dpr={[1, 1.75]} camera={{ fov: 28, near: 0.5, far: 600, position: HOME.toArray() }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.08 }}>
      <color attach="background" args={["#edf0fa"]} />
      <fog attach="fog" args={["#edf0fa", 130, 230]} />
      <hemisphereLight args={["#ffffff", "#c9d0ee", 1.55]} />
      <directionalLight castShadow position={[-22, 40, 26]} intensity={2.1} shadow-mapSize={[2048, 2048]} shadow-radius={6} shadow-bias={-0.0004}
        shadow-camera-left={-70} shadow-camera-right={70} shadow-camera-top={70} shadow-camera-bottom={-70} shadow-camera-far={180} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.2, 0]} receiveShadow><planeGeometry args={[500, 500]} /><meshStandardMaterial color="#e6eaf8" roughness={1} /></mesh>
      {PLACES.map((p) => <Island key={p.jur} p={p} onPick={onPick} info={info[p.jur]} />)}
      <OrbitControls makeDefault target={TARGET.toArray()} enableDamping dampingFactor={0.08} minDistance={60} maxDistance={240} minPolarAngle={0.45} maxPolarAngle={1.15} />
      <CameraRig cmd={cmd} shiftX={-30} target={TARGET} home={HOME} />
    </Canvas>
  );
}
