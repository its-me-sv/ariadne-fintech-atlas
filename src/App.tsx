import { lazy, Suspense, useEffect } from "react";
import { useAtlas } from "./data/store";
import { jurFromToken, useRoute, go } from "./router";
import { TopBar } from "./ui/TopBar";
import { Dock } from "./ui/Dock";
import { DetailPanel } from "./ui/DetailPanel";
import { PhoneNotice, useSmallScreen } from "./ui/PhoneNotice";

const Home = lazy(() => import("./views/Home"));
const Overview = lazy(() => import("./views/Overview"));
const Traces = lazy(() => import("./views/Traces"));
const Graph = lazy(() => import("./views/Graph"));
const Compare = lazy(() => import("./views/Compare"));
const Rules = lazy(() => import("./views/Rules"));
const Money = lazy(() => import("./views/Money"));
const Blueprint = lazy(() => import("./views/Blueprint"));
const Module = lazy(() => import("./views/Module"));

export default function App() {
  const { load, core, error, setScope, select } = useAtlas();
  const route = useRoute();
  const small = useSmallScreen();
  const home = route.view === "home";
  useEffect(() => {
    if (small) return;
    if (!home) { load(); return; }
    // on the home page, fetch the atlas data once the browser is idle, so entering the atlas is instant
    const run = () => load();
    if ("requestIdleCallback" in window) { const id = requestIdleCallback(run, { timeout: 4000 }); return () => cancelIdleCallback(id); }
    const id = setTimeout(run, 2000);
    return () => clearTimeout(id);
  }, [load, small, home]);

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

  // the home page works everywhere and has no atlas chrome
  if (home) return <Suspense fallback={<div className="home-loading" />}><Home /></Suspense>;
  // phones: show the notice before any atlas view, so no 3D or graph code is requested
  if (small) return <PhoneNotice />;

  let view = null;
  if (error) view = <div className="error glass"><h2>Data unavailable</h2><p className="muted" style={{ marginTop: 8 }}>{error}</p></div>;
  else if (!core) view = <div className="loading">Loading the atlas</div>;
  else if (route.view === "overview" || route.view === "node") view = <Overview />;
  else if (route.view === "traces") view = <Traces />;
  else if (route.view === "graph") view = <Graph />;
  else if (route.view === "compare") view = <Compare />;
  else if (route.view === "rules") view = <Rules />;
  else if (route.view === "money") view = <Money />;
  else if (route.view === "blueprint") view = <Blueprint />;
  else view = <Module />;

  return (
    <div className="app">
      <Suspense fallback={<div className="loading">Loading view</div>}>{view}</Suspense>
      <TopBar />
      <Dock />
      <DetailPanel />
    </div>
  );
}
