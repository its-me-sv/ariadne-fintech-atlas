import { useAtlas } from "../data/store";
import { href, jurToken, useRoute, type View } from "../router";
import { Icon } from "./icons";

const MAIN: { view: View; label: string; icon: string; scoped?: boolean }[] = [
  { view: "overview", label: "Overview", icon: "overview", scoped: true },
  { view: "graph", label: "Graph", icon: "graph", scoped: true },
  { view: "traces", label: "Traces", icon: "traces" },
  { view: "compare", label: "Compare", icon: "compare" },
  { view: "rules", label: "Rules", icon: "rules" },
  { view: "money", label: "Money", icon: "money" },
  { view: "blueprint", label: "Blueprint", icon: "blueprint" },
];
const MODULES = [
  { param: "cbdc", label: "CBDC", icon: "cbdc" },
  { param: "insurance", label: "Insurance", icon: "insurance" },
  { param: "markets", label: "Markets", icon: "markets" },
  { param: "crypto", label: "Crypto", icon: "crypto" },
];

export function Dock() {
  const route = useRoute();
  const scope = useAtlas((s) => s.scope);
  return (
    <nav className="dock" aria-label="Views">
      {MAIN.map((m) => (
        <a key={m.view} href={href(m.view, m.view === "overview" ? "global" : m.scoped ? jurToken(scope) : null)} aria-current={route.view === m.view ? "page" : undefined}>
          <Icon name={m.icon} size={20} />{m.label}
        </a>
      ))}
      <hr />
      {MODULES.map((m) => (
        <a key={m.param} href={href("module", m.param)} aria-current={route.view === "module" && route.param === m.param ? "page" : undefined}>
          <Icon name={m.icon} size={20} />{m.label}
        </a>
      ))}
    </nav>
  );
}
