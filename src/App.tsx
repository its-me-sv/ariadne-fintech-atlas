import { lazy, Suspense, useEffect } from "react";
import { useAtlas } from "./data/store";
import { jurFromToken, useRoute, go } from "./router";
import { TopBar } from "./ui/TopBar";
import { Dock } from "./ui/Dock";
import { DetailPanel } from "./ui/DetailPanel";

const Overview = lazy(() => import("./views/Overview"));
const Placeholder = lazy(() => import("./views/Placeholder"));

export default function App() {
  const { load, core, error, setScope, select } = useAtlas();
  const route = useRoute();
  useEffect(() => { load(); }, [load]);

  // keep the scope in sync with jurisdiction-scoped routes, and open deep-linked nodes
  useEffect(() => {
    const j = jurFromToken(route.param);
    if ((route.view === "overview" || route.view === "graph") && j) setScope(j);
    if (route.view === "node" && route.param && core) {
      select(route.param);
      const n = core.nodes.find((x) => x.id === route.param);
      const jur = n?.jurisdictions?.[0]?.toLowerCase();
      go("overview", jur && ["in", "uk", "us", "eu", "ea", "sg", "cn"].includes(jur) ? (jur === "ea" ? "eu" : jur) : "global");
    }
  }, [route, core, setScope, select]);

  let view = null;
  if (error) view = <div className="error glass"><h2>Data unavailable</h2><p className="muted" style={{ marginTop: 8 }}>{error}</p></div>;
  else if (!core) view = <div className="loading">Loading the atlas</div>;
  else if (route.view === "overview" || route.view === "node") view = <Overview />;
  else view = <Placeholder view={route.view} />;

  return (
    <div className="app">
      <Suspense fallback={<div className="loading">Loading view</div>}>{view}</Suspense>
      <TopBar />
      <Dock />
      <DetailPanel />
    </div>
  );
}
