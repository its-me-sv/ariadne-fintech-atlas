// How the overview travels between two market cities: by sea across the Channel, by air otherwise.
import type { Jur } from "../data/types";

export type TravelMode = "plane" | "ship";

export function travelMode(from: Jur, to: Jur): TravelMode | null {
  if (from === "GLOBAL" || to === "GLOBAL" || from === to) return null;
  const pair = new Set([from, to]);
  return pair.has("UK") && pair.has("EU") ? "ship" : "plane";
}
