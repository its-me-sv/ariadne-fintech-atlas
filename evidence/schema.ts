/**
 * Fintech Infrastructure Atlas: evidence dataset schema.
 *
 * Zod schemas are the single source of truth; TypeScript types are inferred
 * from them. Every collection in data/ is validated against these schemas by
 * scripts/validate.ts, and JSON Schema files are emitted to schema/ by
 * scripts/emit-json-schema.ts.
 *
 * Field naming follows the product spec section "SOURCE-OF-TRUTH DATA MODEL".
 * Fields the evidence files do not populate are kept (empty array or null)
 * so the atlas app can rely on a stable shape; they are never filled with
 * facts that are not in the evidence.
 */
import { z } from "zod";

export const AS_OF = "2026-10-15";

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/** Lower-case kebab-case id: letters, digits, single hyphens. */
export const KEBAB_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const Id = z.string().regex(KEBAB_RE, "id must be kebab-case");

/** ISO calendar date YYYY-MM-DD (validated as a real date). */
export const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const IsoDate = z
  .string()
  .regex(ISO_DATE_RE, "date must be YYYY-MM-DD")
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, "not a real calendar date");
export const NullableIsoDate = IsoDate.nullable();

/** Jurisdiction code: GLOBAL, EU, EA, UK or another ISO 3166 alpha-2 code. */
export const Jurisdiction = z.string().regex(/^(GLOBAL|[A-Z]{2})$/, "jurisdiction code");

export const Confidence = z.enum(["high", "medium", "low"]);

export const Module = z.enum(["core", "cbdc", "insurance", "capital_markets", "crypto"]);

export const BusinessDomain = z.enum([
  "payments",
  "operators_and_schemes",
  "authorities",
  "regulation",
  "standards",
  "market_infrastructure",
  "money_and_cbdc",
  "data_and_identity",
  "insurance",
  "capital_markets",
  "crypto",
  "other",
]);

/** The literal used where the evidence leaves a settlement field empty. */
export const NOT_PUBLICLY_SPECIFIED = "not publicly specified";

// ---------------------------------------------------------------------------
// Source
// ---------------------------------------------------------------------------

export const SourceClass = z.enum([
  "legislation",
  "regulation",
  "regulator_guidance",
  "standard",
  "scheme_rulebook",
  "technical_specification",
  "operator_documentation",
  "official_statistics",
  "official_news",
  "speech",
  "industry_practice",
  "secondary_analysis",
]);

export const SourceStatus = z.enum([
  "in_force",
  "adopted_not_effective",
  "proposed",
  "consultation",
  "pilot",
  "experimental",
  "production",
  "retired",
  "superseded",
  "concluded",
  "unknown",
  "n/a",
]);

export const Source = z
  .object({
    id: Id,
    title: z.string().min(1),
    url: z.string().url(),
    /** Normalised URL used for de-duplication (no fragment, no trailing slash). */
    canonicalUrl: z.string().url(),
    issuer: z.string().min(1),
    sourceClass: SourceClass,
    jurisdiction: Jurisdiction,
    publicationDate: NullableIsoDate,
    effectiveDate: NullableIsoDate,
    lastUpdatedDate: NullableIsoDate,
    accessedDate: NullableIsoDate,
    version: z.string().nullable(),
    status: SourceStatus,
    /** true only if a researcher actually opened the page. */
    opened: z.boolean(),
    language: z.string().min(2),
    translationNote: z.string().nullable(),
    notes: z.string().nullable(),
    /** Evidence files (topics) that cited this source. */
    topics: z.array(z.string()).min(1),
    /** Other source ids merged into this one by canonical URL. */
    mergedIds: z.array(Id),
  })
  .strict();
export type Source = z.infer<typeof Source>;

// ---------------------------------------------------------------------------
// Node
// ---------------------------------------------------------------------------

export const NodeType = z.enum([
  "central_bank",
  "regulator",
  "ministry",
  "fiu",
  "rail",
  "rtgs",
  "ach",
  "instant_payment_system",
  "card_scheme",
  "operator",
  "scheme_body",
  "wallet_or_platform",
  "cbdc",
  "cbdc_project",
  "money_type",
  "standard",
  "law",
  "regulation",
  "rulebook",
  "licence_type",
  "market_infrastructure",
  "credit_bureau",
  "data_sharing_framework",
  "identity_system",
  "other",
]);
export type NodeType = z.infer<typeof NodeType>;

/** Types that must carry settlementAsset and settlementModel. */
export const SETTLEMENT_TYPES: readonly NodeType[] = ["rail", "rtgs", "ach", "instant_payment_system"];

export const Status = z.enum([
  "production",
  "pilot",
  "proposed",
  "design_phase",
  "research",
  "concluded",
  "retired",
  "prohibited",
  "in_force",
  "adopted_not_effective",
  "consultation",
  "unknown",
]);
export type Status = z.infer<typeof Status>;

/** Statuses that must never be rendered as production. */
export const PRE_PRODUCTION: readonly Status[] = ["pilot", "proposed", "design_phase", "research", "consultation"];

export const Ownership = z.enum(["central_bank", "public_sector", "private", "joint", "industry_governed", "unknown"]);

export const SettlementModel = z.union([
  z.enum(["RTGS", "DNS", "prefunded", "hybrid", "bilateral", "on-us"]),
  z.literal(NOT_PUBLICLY_SPECIFIED),
]);

export const Observation = z
  .object({ value: z.string().nullable(), topic: z.string() })
  .strict();

export const Node = z
  .object({
    id: Id,
    canonicalName: z.string().min(1),
    aliases: z.array(z.string()),
    type: NodeType,
    purpose: z.string().nullable(),
    doesNot: z.string().nullable(),
    jurisdictions: z.array(Jurisdiction).min(1),
    businessDomain: BusinessDomain,
    /** Not populated by the evidence in this pass; reserved. */
    lifecycleStages: z.array(z.string()),
    operator: z.string().nullable(),
    ownership: Ownership,
    /** Status as recorded in the evidence (after merge rules). */
    status: Status,
    /** Normalised filter field (pilot vs production etc.). Equal to status in this pass. */
    maturity: Status,
    /** Every status value observed across the evidence files, in merge order. */
    statusHistory: z.array(Observation),
    /** Not populated by the evidence in this pass; reserved. */
    moneyTypes: z.array(z.string()),
    currencies: z.array(z.string()),
    participants: z.string().nullable(),
    paymentTypes: z.array(z.string()),
    hours: z.string().nullable(),
    clearingModel: z.string().nullable(),
    settlementAsset: z.string().nullable(),
    settlementModel: SettlementModel.nullable(),
    finalityNotes: z.string().nullable(),
    messageStandards: z.array(z.string()),
    limits: z.string().nullable(),
    regulatedBy: z.array(Id),
    relatedRules: z.array(Id),
    keyFacts: z.array(z.string()),
    failureModes: z.array(z.string()),
    sourceIds: z.array(Id),
    confidence: Confidence,
    /** Latest accessedDate among this node's opened sources. */
    lastVerifiedAt: NullableIsoDate,
    unknowns: z.array(z.string()),
    notes: z.string().nullable(),
    module: Module,
    /** Evidence files that described this node. */
    topics: z.array(z.string()),
    /** Ids merged into this node (exact duplicates are not listed). */
    mergedIds: z.array(Id),
    /** true when the node was created only because something referenced it. */
    stub: z.boolean(),
  })
  .strict();
export type Node = z.infer<typeof Node>;

// ---------------------------------------------------------------------------
// Edge
// ---------------------------------------------------------------------------

export const FlowClass = z.enum(["value", "message", "data", "control", "legal", "dependency", "ownership"]);
export const SyncOrAsync = z.enum(["sync", "async", "batch", "unknown"]);

export const Edge = z
  .object({
    id: Id,
    from: Id,
    to: Id,
    flowClass: FlowClass,
    /** Human-readable verb label shown on the edge. */
    verb: z.string().min(1),
    syncOrAsync: SyncOrAsync,
    notes: z.string().nullable(),
    /** Marks a hand-off between modules or layers (from the evidence). */
    integrationPoint: z.boolean(),
    sourceIds: z.array(Id),
    confidence: Confidence,
    module: Module,
    jurisdictions: z.array(Jurisdiction),
    topics: z.array(z.string()),
    mergedIds: z.array(Id),
  })
  .strict();
export type Edge = z.infer<typeof Edge>;

// ---------------------------------------------------------------------------
// Rule (Regulation / Standard)
// ---------------------------------------------------------------------------

export const InstrumentType = z.enum([
  "legislation",
  "regulation",
  "regulator_direction",
  "regulator_guidance",
  "standard",
  "implementation_guide",
  "scheme_rulebook",
  "industry_guidance",
  "executive_order",
  "consultation",
  "proposal",
]);

export const BindingLevel = z.enum([
  "binding_law",
  "binding_scheme_rule",
  "mandatory_standard_by_reference",
  "advisory",
  "voluntary",
  "proposed",
]);

export const EffectiveStatus = z.enum([
  "in_force",
  "adopted_not_effective",
  "proposed",
  "consultation",
  "superseded",
  "stayed",
  "unknown",
]);

export const Transition = z.object({ date: NullableIsoDate, what: z.string() }).strict();

export const Rule = z
  .object({
    id: Id,
    canonicalName: z.string().min(1),
    instrumentType: InstrumentType,
    issuer: z.string().nullable(),
    jurisdictions: z.array(Jurisdiction).min(1),
    version: z.string().nullable(),
    bindingLevel: BindingLevel,
    effectiveStatus: EffectiveStatus,
    statusHistory: z.array(Observation),
    dates: z
      .object({
        published: NullableIsoDate,
        effective: NullableIsoDate,
        transition: z.array(Transition),
      })
      .strict(),
    applicability: z.string().nullable(),
    /** Node ids (or rule ids) this rule governs. */
    affects: z.array(Id),
    sourceIds: z.array(Id),
    lastVerifiedAt: NullableIsoDate,
    module: Module,
    topics: z.array(z.string()),
    mergedIds: z.array(Id),
  })
  .strict();
export type Rule = z.infer<typeof Rule>;

// ---------------------------------------------------------------------------
// Claim
// ---------------------------------------------------------------------------

export const ClaimStatus = z.enum(["verified", "supported", "needs_verification", "conflicting"]);
export type ClaimStatus = z.infer<typeof ClaimStatus>;

export const Claim = z
  .object({
    id: Id,
    subjectId: Id,
    subjectKind: z.enum(["node", "rule"]),
    claim: z.string().min(1),
    sourceIds: z.array(Id),
    status: ClaimStatus,
    /** Status as written by the researcher, before merge downgrades. */
    originalStatus: ClaimStatus,
    confidence: Confidence,
    asOf: IsoDate,
    module: Module,
    jurisdictions: z.array(Jurisdiction),
    topic: z.string(),
  })
  .strict();
export type Claim = z.infer<typeof Claim>;

// ---------------------------------------------------------------------------
// Scenario
// ---------------------------------------------------------------------------

export const ScenarioStep = z
  .object({
    n: z.number().int().positive(),
    actor: z.string(),
    system: z.string(),
    action: z.string(),
    messageOrPayload: z.string().nullable(),
    ledgerEffect: z.string().nullable(),
    controls: z.string().nullable(),
    timing: z.string().nullable(),
    failures: z.string().nullable(),
    rules: z.array(Id),
    sourceIds: z.array(Id),
    /** Branch label for alternate paths (for example 8R refund, 8C chargeback). */
    branch: z.string().nullable(),
    /** Researcher note on this step. */
    note: z.string().nullable(),
    /** Known evidence gap on this step. */
    gap: z.string().nullable(),
  })
  .strict();

export const Scenario = z
  .object({
    id: Id,
    name: z.string().min(1),
    market: z.string().min(1),
    markets: z.array(Jurisdiction).min(1),
    module: Module,
    steps: z.array(ScenarioStep).min(1),
    endState: z.string().min(1),
    limitations: z.string().nullable(),
    sourceIds: z.array(Id),
    topic: z.string(),
  })
  .strict();
export type Scenario = z.infer<typeof Scenario>;

// ---------------------------------------------------------------------------
// Journal entry (illustrative double-entry examples)
// ---------------------------------------------------------------------------

export const JournalLine = z
  .object({
    account: z.string(),
    debit: z.union([z.number(), z.string()]).nullable(),
    credit: z.union([z.number(), z.string()]).nullable(),
  })
  .strict();

export const JournalEntry = z
  .object({
    id: Id,
    /** Resolved scenario id, or null when the evidence names an example that is not a scenario. */
    scenarioId: Id.nullable(),
    scenarioLabel: z.string(),
    step: z.string(),
    /** Ledger owner as written in the evidence (often a role label, not a node). */
    entity: z.string(),
    entityId: Id.nullable(),
    lines: z.array(JournalLine),
    assumptions: z.string().nullable(),
    illustrative: z.boolean(),
    notes: z.string().nullable(),
    topic: z.string(),
  })
  .strict();
export type JournalEntry = z.infer<typeof JournalEntry>;

// ---------------------------------------------------------------------------
// Timelines, operating models, CBDC design dimensions, cross references
// ---------------------------------------------------------------------------

export const Timeline = z
  .object({
    id: Id,
    name: z.string(),
    phases: z.array(
      z
        .object({
          name: z.string(),
          what: z.string(),
          sync: z.string().nullable(),
          sourceIds: z.array(Id),
        })
        .strict(),
    ),
    topic: z.string(),
  })
  .strict();

export const OperatingModel = z
  .object({
    id: Id,
    model: z.string(),
    entityId: Id,
    whoOwesCustomer: z.string(),
    protectionOnFailure: z.string(),
    keyLedgerOwner: z.string(),
    sourceIds: z.array(Id),
    notes: z.string().nullable(),
    topic: z.string(),
  })
  .strict();

export const CbdcDesignDimension = z
  .object({
    id: Id,
    name: z.string(),
    options: z.array(z.string()),
    notes: z.string().nullable(),
    sourceIds: z.array(Id),
    topic: z.string(),
  })
  .strict();

export const CrossReference = z
  .object({ id: Id, topic: z.string(), subject: z.string(), pointer: z.string(), summary: z.string() })
  .strict();

// ---------------------------------------------------------------------------
// Conflicts, gaps, coverage
// ---------------------------------------------------------------------------

export const Conflict = z
  .object({
    id: Id,
    subject: z.string(),
    sourceA: Id,
    sourceB: Id,
    description: z.string(),
    topic: z.string(),
    jurisdictions: z.array(Jurisdiction),
  })
  .strict();
export type Conflict = z.infer<typeof Conflict>;

export const TARGET_JURISDICTIONS = ["UK", "US", "EU/EA", "SG", "IN", "CN", "GLOBAL"] as const;
export const TargetJurisdiction = z.enum(TARGET_JURISDICTIONS);

export const Gap = z
  .object({
    id: Id,
    text: z.string().min(1),
    topic: z.string(),
    module: Module,
    /** Target jurisdictions this gap concerns (file-derived, or keyword-derived for thematic files). */
    jurisdictions: z.array(TargetJurisdiction).min(1),
    jurisdictionMethod: z.enum(["topic_file", "keyword", "default_global"]),
  })
  .strict();
export type Gap = z.infer<typeof Gap>;

const CountMap = z.record(z.string(), z.number().int().nonnegative());

export const CoverageCounts = z
  .object({
    nodes: z.number().int().nonnegative(),
    stubNodes: z.number().int().nonnegative(),
    nodesByStatus: CountMap,
    edges: z.number().int().nonnegative(),
    rules: z.number().int().nonnegative(),
    rulesByEffectiveStatus: CountMap,
    claims: z.number().int().nonnegative(),
    claimsByStatus: CountMap,
    scenarios: z.number().int().nonnegative(),
    sources: z.number().int().nonnegative(),
  })
  .strict();

export const ManifestRow = z.object({ area: z.string(), depth: z.string(), mainGaps: z.string() }).strict();

export const JurisdictionCoverage = z
  .object({
    jurisdiction: TargetJurisdiction,
    codes: z.array(Jurisdiction).min(1),
    depth: z.string().nullable(),
    depthNote: z.string(),
    manifestRows: z.array(ManifestRow),
    counts: CoverageCounts,
    byModule: z.record(Module, CoverageCounts),
    byBusinessDomain: CountMap,
    gaps: z.array(z.object({ id: Id, text: z.string() }).strict()),
  })
  .strict();

export const ModuleCoverage = z
  .object({
    module: Module,
    depth: z.string().nullable(),
    depthNote: z.string(),
    manifestRows: z.array(ManifestRow),
    counts: CoverageCounts,
    gaps: z.array(z.object({ id: Id, text: z.string() }).strict()),
  })
  .strict();

export const Coverage = z
  .object({
    asOf: IsoDate,
    depthLegend: z.string(),
    jurisdictions: z.array(JurisdictionCoverage),
    modules: z.array(ModuleCoverage),
    manifestTable: z.array(ManifestRow),
  })
  .strict();
export type Coverage = z.infer<typeof Coverage>;

// ---------------------------------------------------------------------------
// Provenance: aliases, merge log, manifest
// ---------------------------------------------------------------------------

export const IdAlias = z
  .object({
    alias: Id,
    canonical: Id,
    collection: z.enum(["nodes", "rules", "sources", "edges"]),
    method: z.enum(["name_or_alias_match", "curated", "dangling_suffix_alias_match", "canonical_url", "rule_name_and_url"]),
    reason: z.string(),
  })
  .strict();
export type IdAlias = z.infer<typeof IdAlias>;

export const MergeLogEntry = z
  .object({
    kind: z.enum([
      "duplicate_merged",
      "id_alias",
      "scalar_disagreement",
      "conservative_status",
      "stub_created",
      "claim_downgraded",
      "settlement_filled",
      "status_change",
      "reference_rewritten",
      "unresolved_label",
      "edge_deduplicated",
      "id_collision_split",
      "dash_replaced",
      "date_normalized",
      "array_deduplicated",
    ]),
    collection: z.string(),
    id: z.string(),
    field: z.string().nullable(),
    detail: z.string(),
    kept: z.unknown().optional(),
    discarded: z.unknown().optional(),
  })
  .strict();
export type MergeLogEntry = z.infer<typeof MergeLogEntry>;

export const Manifest = z
  .object({
    name: z.string(),
    asOf: IsoDate,
    generatedBy: z.string(),
    inputs: z.array(z.object({ file: z.string(), sha256: z.string().regex(/^[a-f0-9]{64}$/), bytes: z.number().int() }).strict()),
    inputCounts: CountMap,
    counts: CountMap,
    claimsByStatus: CountMap,
    nodesByModule: CountMap,
    mergeSummary: CountMap,
  })
  .strict();
export type Manifest = z.infer<typeof Manifest>;

/** File name to schema map used by the validator and the JSON Schema emitter. */
export const COLLECTIONS = {
  "sources.json": z.array(Source),
  "nodes.json": z.array(Node),
  "edges.json": z.array(Edge),
  "rules.json": z.array(Rule),
  "claims.json": z.array(Claim),
  "scenarios.json": z.array(Scenario),
  "journal-entries.json": z.array(JournalEntry),
  "timelines.json": z.array(Timeline),
  "operating-models.json": z.array(OperatingModel),
  "cbdc-design-dimensions.json": z.array(CbdcDesignDimension),
  "cross-references.json": z.array(CrossReference),
  "conflicts.json": z.array(Conflict),
  "gaps.json": z.array(Gap),
  "coverage.json": Coverage,
  "id-aliases.json": z.array(IdAlias),
  "merge-log.json": z.array(MergeLogEntry),
  "manifest.json": Manifest,
} as const;

export type CollectionFile = keyof typeof COLLECTIONS;
