// Runtime shapes of public/data/*.json (trimmed from the evidence package schema in evidence/schema.ts).

export type Jur = "GLOBAL" | "IN" | "UK" | "US" | "EU" | "SG" | "CN";

export interface AtlasNode {
  id: string;
  canonicalName: string;
  aliases?: string[];
  type: string;
  purpose?: string;
  doesNot?: string;
  jurisdictions?: string[];
  businessDomain?: string;
  operator?: string;
  ownership?: string;
  status?: string;
  maturity?: string;
  currencies?: string[];
  participants?: string;
  paymentTypes?: string[];
  hours?: string;
  clearingModel?: string;
  settlementAsset?: string;
  settlementModel?: string;
  finalityNotes?: string;
  messageStandards?: string[];
  limits?: string;
  regulatedBy?: string[];
  relatedRules?: string[];
  keyFacts?: string[];
  failureModes?: string[];
  sourceIds?: string[];
  confidence?: string;
  unknowns?: string[];
  notes?: string;
  module?: string;
  stub?: boolean;
}

export interface AtlasEdge {
  id: string;
  from: string;
  to: string;
  flowClass: "value" | "message" | "data" | "control" | "legal" | "dependency" | "ownership";
  verb?: string;
  syncOrAsync?: string;
  notes?: string;
  integrationPoint?: boolean;
  sourceIds?: string[];
  confidence?: string;
  module?: string;
  jurisdictions?: string[];
}

export interface AtlasRule {
  id: string;
  canonicalName: string;
  instrumentType?: string;
  issuer?: string;
  jurisdictions?: string[];
  version?: string;
  bindingLevel?: string;
  effectiveStatus?: string;
  dates?: { published?: string | null; effective?: string | null; transition?: { date?: string | null; what?: string }[] };
  applicability?: string;
  affects?: string[];
  sourceIds?: string[];
  module?: string;
}

export interface ScenarioStep {
  n: number;
  actor?: string | null;
  system?: string | null;
  action?: string | null;
  messageOrPayload?: string | null;
  ledgerEffect?: string | null;
  controls?: string | null;
  timing?: string | null;
  failures?: string | null;
  rules?: string[];
  sourceIds?: string[];
  branch?: string | null;
  note?: string | null;
  gap?: string | null;
}

export interface Scenario {
  id: string;
  name: string;
  market?: string;
  markets?: string[];
  module?: string;
  steps: ScenarioStep[];
  endState?: string;
  limitations?: string;
  sourceIds?: string[];
}

export interface Claim {
  id: string;
  subjectId: string;
  subjectKind?: string;
  claim: string;
  sourceIds: string[];
  status: "verified" | "supported" | "needs_verification" | "conflicting";
  confidence?: string;
  asOf?: string;
  jurisdictions?: string[];
}

export interface Source {
  id: string;
  title: string;
  url: string;
  issuer?: string;
  sourceClass?: string;
  jurisdiction?: string;
  publicationDate?: string;
  effectiveDate?: string;
  lastUpdatedDate?: string;
  accessedDate?: string;
  version?: string;
  status?: string;
  opened?: boolean;
  language?: string;
  translationNote?: string;
  notes?: string;
}

export interface CoverageJur {
  jurisdiction: string;
  codes: string[];
  depth?: string;
  manifestRows?: { area: string; depth: string; mainGaps: string }[];
  counts: {
    nodes: number; edges: number; rules: number; claims: number; scenarios: number; sources: number;
    nodesByStatus?: Record<string, number>; rulesByEffectiveStatus?: Record<string, number>; claimsByStatus?: Record<string, number>;
  };
  gaps?: unknown[];
}

export interface Core {
  asOf: string;
  counts: Record<string, number>;
  claimsByStatus: Record<string, number>;
  nodes: AtlasNode[];
  edges: AtlasEdge[];
  rules: AtlasRule[];
  scenarios: Scenario[];
  coverage: { asOf: string; depthLegend: string; jurisdictions: CoverageJur[]; modules: unknown[]; manifestTable: { area: string; depth: string; mainGaps: string }[] };
  conflicts: { topic?: string; sourceA?: string; sourceB?: string; description?: string; id?: string }[];
  gaps: { id?: string; text?: string; gap?: string; jurisdictions?: string[]; topic?: string; module?: string }[];
  journal: unknown[];
  timelines: unknown[];
  operatingModels: Record<string, unknown>[];
  cbdcDims: { id: string; name: string; options?: string[]; notes?: string; sourceIds?: string[] }[];
  claimStats: Record<string, Record<string, number>>;
}

export interface EvidenceFile {
  claims: Claim[];
  sources: Source[];
}
