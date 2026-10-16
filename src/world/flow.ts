import type { Flow } from "./worlds";
export const FLOW_COLOR: Record<Flow, string> = { message: "#3157e6", value: "#12a067", data: "#8b5cf6", control: "#e07a12", legal: "#b7791f" };
export type CamCmd = { type: "in" | "out" | "left" | "right" | "reset"; n: number } | null;
