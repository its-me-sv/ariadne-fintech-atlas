// Loads the real generated atlas data (public/data, built by `npm run data`) through the store's
// real load() path, by stubbing fetch. Component tests then run against the same data users see.
import { readFileSync } from "node:fs";
import { vi } from "vitest";
import { useAtlas } from "../../src/data/store";
import type { Core } from "../../src/data/types";

const file = (name: string) => readFileSync(new URL(`../../public/data/${name}`, import.meta.url), "utf8");

let cache: { core: string; evidence: string } | null = null;
function data() {
  cache ??= { core: file("core.json"), evidence: file("evidence.json") };
  return cache;
}

export const coreData = (): Core => JSON.parse(data().core);

const initial = useAtlas.getState();
/** Put the store back to how the app starts: nothing loaded, nothing selected, global scope. */
export function resetAtlas() {
  useAtlas.setState(initial, true);
}

const json = (body: string) => new Response(body, { status: 200, headers: { "content-type": "application/json" } });

/** Stub fetch with the real data files. Returns the mock so tests can inspect calls. */
export function stubAtlasFetch() {
  const mock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("data/core.json")) return json(data().core);
    if (url.endsWith("data/evidence.json")) return json(data().evidence);
    if (url.endsWith("data/stats.json")) return json(JSON.stringify({ asOf: "2026-10-15", systems: 1, rules: 1, sources: 1, traces: 1 }));
    return new Response("not found", { status: 404 });
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

/** Load core and evidence into the store, exactly as the app does on startup. */
export async function loadAtlas() {
  stubAtlasFetch();
  await useAtlas.getState().load();
  const s = useAtlas.getState();
  if (!s.core || !s.sources) throw new Error(`atlas did not load: ${s.error}`);
  return s;
}
