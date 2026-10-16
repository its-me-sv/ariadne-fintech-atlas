// Visual kind for a node type: drives building colour in 3D, node colour in the graph and badge colour in lists.
export type Kind =
  | "central" | "bank" | "switch" | "regulator" | "merchant" | "person" | "cbdc" | "card" | "wallet"
  | "market" | "data" | "law" | "standard" | "concept";

export const KIND_COLOR: Record<Kind, string> = {
  central: "#8b5cf6", bank: "#3d63ea", switch: "#14b8a6", regulator: "#f5a524", merchant: "#fb6f84",
  person: "#f472b6", cbdc: "#d946ef", card: "#f97316", wallet: "#eab308", market: "#06b6d4",
  data: "#65a30d", law: "#b45309", standard: "#64748b", concept: "#94a3b8",
};

export const KIND_LABEL: Record<Kind, string> = {
  central: "Central bank", bank: "Bank or PSP", switch: "Rail or switch", regulator: "Regulator or ministry",
  merchant: "Merchant", person: "Person", cbdc: "CBDC or token project", card: "Card scheme", wallet: "Wallet or app",
  market: "Market infrastructure", data: "Identity or data", law: "Law or rule", standard: "Standard", concept: "Concept or role",
};

export function kindOf(type: string): Kind {
  switch (type) {
    case "central_bank": return "central";
    case "rail": case "rtgs": case "ach": case "instant_payment_system": case "operator": case "scheme_body": return "switch";
    case "regulator": case "ministry": case "fiu": return "regulator";
    case "cbdc": case "cbdc_project": case "money_type": return "cbdc";
    case "card_scheme": return "card";
    case "wallet_or_platform": return "wallet";
    case "market_infrastructure": return "market";
    case "credit_bureau": case "identity_system": case "data_sharing_framework": return "data";
    case "law": case "regulation": case "rulebook": case "licence_type": return "law";
    case "standard": return "standard";
    default: return "concept";
  }
}
