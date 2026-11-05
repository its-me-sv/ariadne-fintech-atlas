// Pure filter for the traces list, shared with the tests.
import { WORLDS } from "../world/worlds";

/** Scenario ids animated as a hero trace in one of the 3D market cities. */
export const HERO_SCENARIO_IDS: ReadonlySet<string> = new Set(WORLDS.map((w) => w.scenarioId));

export const has3dView = (id: string) => HERO_SCENARIO_IDS.has(id);

export function filterTraces<T extends { id: string; market?: string }>(scenarios: T[], market: string, only3d: boolean): T[] {
  return scenarios.filter((s) => (market === "all" || (s.market ?? "GLOBAL") === market) && (!only3d || has3dView(s.id)));
}
