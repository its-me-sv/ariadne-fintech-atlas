import { memo, useEffect, useMemo, useState } from "react";
import { ReactFlow, Background, Controls, MiniMap, Handle, Position, MarkerType, type Edge, type Node, type NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import ELK from "elkjs/lib/elk.bundled.js";
import { useAtlas, inJur, prettyType, prettyStatus, statusTone } from "../data/store";
import type { AtlasEdge, AtlasNode } from "../data/types";
import { KIND_COLOR, KIND_LABEL, kindOf, type Kind } from "../ui/kinds";
import { FLOW_COLOR } from "../world/flow";

type FlowClass = AtlasEdge["flowClass"];
const ALL_FLOWS: FlowClass[] = ["value", "message", "data", "control", "legal", "dependency", "ownership"];
const FLOW_STYLE: Record<FlowClass, { color: string; dash?: string; width: number; label: string }> = {
  value: { color: FLOW_COLOR.value, width: 2.6, label: "Value (money moves)" },
  message: { color: FLOW_COLOR.message, dash: "7 5", width: 2.2, label: "Message or instruction" },
  data: { color: FLOW_COLOR.data, dash: "2 4", width: 2.2, label: "Data sharing" },
  control: { color: FLOW_COLOR.control, dash: "6 4", width: 1.6, label: "Control or check" },
  legal: { color: FLOW_COLOR.legal, dash: "10 4 2 4", width: 1.6, label: "Legal or supervisory" },
  dependency: { color: "#94a3b8", dash: "3 3", width: 1.3, label: "Operational dependency" },
  ownership: { color: "#64748b", width: 1.3, label: "Ownership or operation" },
};
const MODES: { id: string; label: string; flows: FlowClass[] }[] = [
  { id: "all", label: "Everything", flows: ALL_FLOWS },
  { id: "money", label: "Follow the money", flows: ["value"] },
  { id: "message", label: "Follow the message", flows: ["message", "value"] },
  { id: "data", label: "Follow the data", flows: ["data"] },
  { id: "legal", label: "Follow the rules", flows: ["legal", "control"] },
  { id: "ops", label: "Who runs what", flows: ["ownership", "dependency"] },
];

interface NData extends Record<string, unknown> { n: AtlasNode; kind: Kind; dim: boolean; failures: boolean }

const AtlasNodeView = memo(function AtlasNodeView({ data, selected }: NodeProps<Node<NData>>) {
  const { n, kind, dim, failures } = data;
  return (
    <div className={`gn${selected ? " sel" : ""}${dim ? " dim" : ""}`} style={{ ["--k" as string]: KIND_COLOR[kind] }}>
      <Handle type="target" position={Position.Left} />
      <span className="gn-dot" aria-hidden="true" />
      <div className="gn-t">
        <b>{n.aliases?.[0] && n.aliases[0].length <= 14 ? n.aliases[0] : n.canonicalName}</b>
        <small>{prettyType(n.type)}</small>
      </div>
      {n.status && n.status !== "production" && n.status !== "in_force" && <span className={`pill t-${statusTone(n.status)}`}>{prettyStatus(n.status)}</span>}
      {failures && n.failureModes?.length ? <span className="pill t-bad" title="Has documented failure paths">{n.failureModes.length} failure</span> : null}
      <Handle type="source" position={Position.Right} />
    </div>
  );
});
const nodeTypes = { atlas: AtlasNodeView };
const elk = new ELK();

export default function Graph() {
  const { core, scope, select, selected } = useAtlas();
  const [mode, setMode] = useState("all");
  const [kinds, setKinds] = useState<Set<Kind>>(new Set());
  const [showIsolated, setShowIsolated] = useState(false);
  const [failures, setFailures] = useState(false);
  const [layout, setLayout] = useState<Record<string, { x: number; y: number }> | null>(null);

  const flows = MODES.find((m) => m.id === mode)!.flows;
  const { nodes, edges, allKinds, totals } = useMemo(() => {
    if (!core) return { nodes: [] as AtlasNode[], edges: [] as AtlasEdge[], allKinds: [] as Kind[], totals: { n: 0, e: 0 } };
    const inScope = core.nodes.filter((n) => inJur(n.jurisdictions, scope) && n.type !== "standard");
    const ids = new Set(inScope.map((n) => n.id));
    let es = core.edges.filter((e) => ids.has(e.from) && ids.has(e.to) && flows.includes(e.flowClass));
    const ak = [...new Set(inScope.map((n) => kindOf(n.type)))];
    let ns = inScope.filter((n) => kinds.size === 0 || kinds.has(kindOf(n.type)));
    const keep = new Set(ns.map((n) => n.id));
    es = es.filter((e) => keep.has(e.from) && keep.has(e.to));
    if (!showIsolated) {
      const linked = new Set(es.flatMap((e) => [e.from, e.to]));
      ns = ns.filter((n) => linked.has(n.id));
    }
    return { nodes: ns, edges: es, allKinds: ak, totals: { n: inScope.length, e: core.edges.filter((e) => ids.has(e.from) && ids.has(e.to)).length } };
  }, [core, scope, flows, kinds, showIsolated]);

  useEffect(() => {
    let live = true;
    setLayout(null);
    const dense = nodes.length > 45;
    elk.layout({
      id: "root",
      layoutOptions: dense ? {
        "elk.algorithm": "stress", "elk.stress.desiredEdgeLength": "250", "elk.spacing.nodeNode": "40",
      } : {
        "elk.algorithm": "layered", "elk.direction": "RIGHT", "elk.spacing.nodeNode": "26", "elk.layered.spacing.nodeNodeBetweenLayers": "90",
        "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX", "elk.separateConnectedComponents": "true", "elk.spacing.componentComponent": "60",
        "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP", "elk.aspectRatio": "1.6",
      },
      children: nodes.map((n) => ({ id: n.id, width: 230, height: 56 })),
      edges: edges.map((e) => ({ id: e.id, sources: [e.from], targets: [e.to] })),
    }).then((g) => {
      if (!live) return;
      const pos: Record<string, { x: number; y: number }> = {};
      for (const c of g.children ?? []) pos[c.id] = { x: c.x ?? 0, y: c.y ?? 0 };
      setLayout(pos);
    }).catch(() => live && setLayout({}));
    return () => { live = false; };
  }, [nodes, edges]);

  const neighbours = useMemo(() => {
    if (!selected) return null;
    const s = new Set([selected]);
    for (const e of edges) { if (e.from === selected) s.add(e.to); if (e.to === selected) s.add(e.from); }
    return s;
  }, [selected, edges]);

  const rfNodes: Node<NData>[] = useMemo(() => (layout ? nodes.map((n) => ({
    id: n.id, type: "atlas", position: layout[n.id] ?? { x: 0, y: 0 }, selected: n.id === selected,
    data: { n, kind: kindOf(n.type), dim: !!neighbours && !neighbours.has(n.id), failures },
  })) : []), [layout, nodes, selected, neighbours, failures]);

  const rfEdges: Edge[] = useMemo(() => edges.map((e) => {
    const st = FLOW_STYLE[e.flowClass];
    const hot = !!selected && (e.from === selected || e.to === selected);
    const dim = !!selected && !hot;
    return {
      id: e.id, source: e.from, target: e.to, type: "smoothstep",
      label: hot ? e.verb : undefined, labelStyle: { fontSize: 11, fontWeight: 600, fill: "#17213a" }, labelBgStyle: { fill: "#fff" }, labelBgPadding: [4, 2] as [number, number],
      style: { stroke: st.color, strokeWidth: hot ? st.width + 1 : st.width, strokeDasharray: st.dash, opacity: dim ? 0.15 : 0.9 },
      markerEnd: { type: MarkerType.ArrowClosed, color: st.color, width: 16, height: 16 },
      ariaLabel: `${e.from} ${e.verb ?? e.flowClass} ${e.to}`,
    };
  }), [edges, selected]);

  return (
    <main className="page graph">
      <div className="page-head">
        <div>
          <h1>Architecture graph</h1>
          <p>Every system, institution and rule in scope, joined by typed links. Line style shows the kind of link, so it reads without colour. Select a node to light up its neighbours and open its evidence.</p>
        </div>
      </div>
      <div className="g-tools">
        <div className="seg" role="group" aria-label="Flow mode">
          {MODES.map((m) => <button key={m.id} aria-pressed={mode === m.id} onClick={() => setMode(m.id)}>{m.label}</button>)}
        </div>
        <div className="seg" role="group" aria-label="Node kinds">
          {allKinds.map((k) => (
            <button key={k} aria-pressed={kinds.has(k)} onClick={() => setKinds((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; })}>
              <i className="kdot" style={{ background: KIND_COLOR[k] }} />{KIND_LABEL[k]}
            </button>
          ))}
        </div>
        <label className="chk"><input type="checkbox" id="g-iso" checked={showIsolated} onChange={(e) => setShowIsolated(e.target.checked)} />Show unlinked items</label>
        <label className="chk"><input type="checkbox" id="g-fail" checked={failures} onChange={(e) => setFailures(e.target.checked)} />Show failure paths</label>
        <span className="faint num" style={{ fontSize: 12.5 }}>{nodes.length} of {totals.n} items, {edges.length} of {totals.e} links</span>
      </div>
      <div className="g-canvas glass">
        {!layout ? <div className="loading">Laying out the graph</div> : nodes.length === 0 ? (
          <div className="loading">No linked items for this filter. Try another mode or turn on unlinked items.</div>
        ) : (
          <ReactFlow
            nodes={rfNodes} edges={rfEdges} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.06, minZoom: 0.42 }} minZoom={0.1} maxZoom={1.6}
            onNodeClick={(_, n) => select(n.id)} onPaneClick={() => select(null)} nodesConnectable={false} proOptions={{ hideAttribution: true }}
          >
            <Background gap={22} color="#dfe4f3" />
            <MiniMap pannable zoomable nodeColor={(n) => KIND_COLOR[(n.data as NData).kind]} maskColor="rgba(237,240,250,0.7)" />
            <Controls showInteractive={false} />
          </ReactFlow>
        )}
      </div>
      <div className="g-legend" aria-label="Link legend">
        {flows.map((f) => (
          <span key={f}><svg width="34" height="10" aria-hidden="true"><line x1="1" y1="5" x2="33" y2="5" stroke={FLOW_STYLE[f].color} strokeWidth={FLOW_STYLE[f].width + 0.4} strokeDasharray={FLOW_STYLE[f].dash} /></svg>{FLOW_STYLE[f].label}</span>
        ))}
      </div>
      <details className="g-table">
        <summary>Show these links as a table ({edges.length})</summary>
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr><th>From</th><th>Link</th><th>To</th><th>Type</th></tr></thead>
          <tbody>{edges.map((e) => <tr key={e.id}><td>{core?.nodes.find((n) => n.id === e.from)?.canonicalName}</td><td>{e.verb}</td><td>{core?.nodes.find((n) => n.id === e.to)?.canonicalName}</td><td>{e.flowClass}</td></tr>)}</tbody>
        </table></div>
      </details>
    </main>
  );
}
