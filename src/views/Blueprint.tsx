import { useMemo, useState } from "react";
import { useAtlas, inJur } from "../data/store";
import type { AtlasNode, AtlasRule, Jur } from "../data/types";
import { go, useRoute } from "../router";
import { MARKETS, NodeChip, StatusPill } from "../ui/bits";
import { Flag } from "../ui/Flag";

// Editorial guide: which building blocks each product needs. The items listed under each block come
// from the dataset by keyword and type match, so they are pointers to check, not legal advice.
interface Block { need: string; why: string; keywords: string[]; types?: string[]; rulesToo?: boolean; models?: boolean }
interface Product { id: string; name: string; line: string; blocks: Block[] }

const RAILS = ["instant_payment_system", "ach", "rtgs", "rail"];
const PRODUCTS: Product[] = [
  { id: "neobank", name: "Neobank", line: "Accounts, cards and transfers in an app, with or without its own banking licence.", blocks: [
    { need: "A way to hold customer money", why: "Either a banking licence, an e-money or payment licence, or a sponsor bank. This decides who owes the customer and what protects them.", keywords: ["bank", "deposit-taker", "credit institution", "e-money", "electronic money", "payment institution", "PPI", "stored-value"], types: ["licence_type"], models: true },
    { need: "Customer identity checks", why: "Know-your-customer and due diligence before the account opens, then periodic review.", keywords: ["KYC", "know your customer", "due diligence", "CKYC", "Aadhaar", "identity", "beneficial owner", "CIP"], rulesToo: true },
    { need: "Anti-money laundering and sanctions", why: "Screening, monitoring and reporting suspicious activity to the financial intelligence unit.", keywords: ["money laundering", "AML", "sanctions", "OFAC", "OFSI", "FIU", "PMLA", "suspicious"], rulesToo: true },
    { need: "Access to payment rails", why: "Direct or sponsored access to instant, batch and high-value systems.", keywords: [], types: RAILS },
    { need: "Cards", why: "A card scheme, an issuer processor and card security standards.", keywords: ["card", "interchange", "PCI", "tokenis", "RuPay", "Visa", "Mastercard", "UnionPay"], types: ["card_scheme"], rulesToo: true },
    { need: "Protection of customer funds", why: "Deposit insurance for banks; safeguarding or reserve rules for non-banks.", keywords: ["deposit insurance", "deposit guarantee", "FSCS", "FDIC", "DICGC", "SDIC", "safeguard", "reserve fund", "custodial"], rulesToo: true },
    { need: "Fraud, disputes and complaints", why: "Strong authentication, scam reimbursement, chargebacks and the ombudsman route.", keywords: ["fraud", "APP", "reimburse", "dispute", "ombudsman", "authentication", "chargeback", "complaint"], rulesToo: true },
    { need: "Data protection and open banking", why: "Consent, data rights and regulated data sharing.", keywords: ["data protection", "personal data", "GDPR", "DPDP", "PDPA", "PIPL", "open banking", "account aggregator", "1033", "consent"], rulesToo: true },
  ] },
  { id: "wallet", name: "Consumer wallet", line: "A stored-value or pass-through wallet for paying people and shops.", blocks: [
    { need: "A licence to hold stored value", why: "E-money, prepaid instrument or stored-value licences, or a pass-through model with no stored balance.", keywords: ["e-money", "electronic money", "PPI", "prepaid", "stored-value", "payment institution", "money transmitter"], types: ["licence_type"], models: true },
    { need: "Tiered identity checks", why: "Lighter checks for small balances, full KYC above set limits where the rules allow it.", keywords: ["KYC", "small PPI", "due diligence", "identity", "Aadhaar"], rulesToo: true },
    { need: "Protection of customer balances", why: "Safeguarding, escrow or reserve-fund rules.", keywords: ["safeguard", "escrow", "reserve fund", "custodial", "CASS"], rulesToo: true },
    { need: "Acceptance at merchants", why: "QR codes, card schemes or instant payment rails behind the wallet.", keywords: ["QR", "UPI", "PayNow", "NETS", "SGQR", "card"], types: [...RAILS, "card_scheme", "wallet_or_platform"] },
    { need: "Disputes and fraud", why: "Turnaround times, reimbursement and complaint routes.", keywords: ["dispute", "turnaround", "TAT", "fraud", "ombudsman", "reimburse", "authentication"], rulesToo: true },
  ] },
  { id: "psp", name: "Merchant payments provider", line: "Lets businesses accept cards, QR and bank payments, then pays them out.", blocks: [
    { need: "Authorisation to handle merchant funds", why: "Payment institution, payment aggregator or money transmission routes.", keywords: ["payment aggregator", "payment institution", "money transmitter", "acquir", "payment transaction processing"], types: ["licence_type"] },
    { need: "Card acceptance", why: "Scheme membership through an acquirer, PCI DSS and tokenisation.", keywords: ["card", "PCI", "tokenis", "interchange", "acquir", "3-D Secure", "EMV"], types: ["card_scheme"], rulesToo: true },
    { need: "Account-to-account and QR acceptance", why: "Instant rails and QR standards for direct bank payments.", keywords: ["QR", "instant", "UPI", "FPS", "SEPA", "FedNow", "RTP", "FAST"], types: RAILS },
    { need: "Merchant funds protection", why: "Escrow, safeguarding or nodal account rules for money held before payout.", keywords: ["escrow", "safeguard", "reserve fund", "nodal"], rulesToo: true },
    { need: "Chargebacks and refunds", why: "Scheme dispute rules and customer protection law.", keywords: ["chargeback", "dispute", "refund", "Regulation E", "Regulation Z"], rulesToo: true },
  ] },
  { id: "remittance", name: "Remittance company", line: "Sends money across borders, usually with currency conversion.", blocks: [
    { need: "A licence to transmit money", why: "Money transmission or payment institution licences, plus any cross-border permissions.", keywords: ["money transmitter", "payment institution", "money-changing", "cross-border", "MTSS", "remittance"], types: ["licence_type"], rulesToo: true },
    { need: "Foreign exchange rules", why: "Capital controls, remittance schemes and FX reporting.", keywords: ["FEMA", "LRS", "SAFE", "foreign exchange", "FX", "capital"], rulesToo: true },
    { need: "Travel rule and sanctions", why: "Payer and payee information must travel with the payment, and both sides are screened.", keywords: ["travel rule", "Recommendation 16", "transfer of funds", "sanctions", "OFAC", "wire"], rulesToo: true },
    { need: "Cross-border routes", why: "Correspondent banks over SWIFT, cross-border systems, or linked instant payment systems.", keywords: ["SWIFT", "CIPS", "cross-border", "link", "Nexus", "CLS", "correspondent"], types: [...RAILS, "operator", "market_infrastructure"] },
    { need: "Customer disclosures", why: "Fees, exchange rates and delivery times shown before the customer pays.", keywords: ["remittance", "disclosure", "Regulation E", "transparency"], rulesToo: true },
  ] },
  { id: "lender", name: "Digital lender", line: "Consumer or small-business loans, often with a bank or NBFC partner.", blocks: [
    { need: "Permission to lend", why: "A bank or non-bank lending licence, or a partner that holds one.", keywords: ["lend", "credit", "NBFC", "co-lending", "bank"], types: ["licence_type"], rulesToo: true, models: true },
    { need: "Credit data", why: "Credit bureaus and consented data sharing for underwriting.", keywords: ["credit bureau", "credit information", "account aggregator", "1033", "consent", "Metro 2"], types: ["credit_bureau", "data_sharing_framework"], rulesToo: true },
    { need: "Disclosure and affordability", why: "Annual percentage rate, key fact statements, cooling-off and affordability checks.", keywords: ["Truth in Lending", "Regulation Z", "key fact", "consumer credit", "affordability", "Consumer Duty", "cooling", "digital lending"], rulesToo: true },
    { need: "Collections and hardship", why: "Fair collection practices, forbearance and charge-off rules.", keywords: ["collection", "FDCPA", "Regulation F", "charge-off", "forbearance", "hardship"], rulesToo: true },
    { need: "Repayments", why: "Direct debits and mandates on batch rails.", keywords: ["direct debit", "mandate", "NACH", "ACH", "Bacs", "SDD"], types: RAILS, rulesToo: true },
  ] },
  { id: "insurance", name: "Insurance distributor", line: "Sells or embeds insurance and collects premiums, separate from the payments core.", blocks: [
    { need: "Distribution permission", why: "Broker, agent or intermediary rules from the insurance regulator.", keywords: ["insurance", "distribution", "intermediar", "broker", "IRDAI", "EIOPA", "NAIC", "Bima"], rulesToo: true },
    { need: "Premium collection", why: "Collecting premiums over cards, mandates or instant rails.", keywords: ["mandate", "premium", "UPI", "direct debit"], types: RAILS },
    { need: "Policyholder protection and data", why: "Conduct, claims handling and data protection rules.", keywords: ["policyholder", "claims", "Solvency", "IFRS 17", "data protection"], rulesToo: true },
  ] },
];

function useMatches(block: Block, scope: Jur) {
  const core = useAtlas((s) => s.core);
  return useMemo(() => {
    if (!core) return { nodes: [] as AtlasNode[], rules: [] as AtlasRule[] };
    const re = block.keywords.length ? new RegExp(block.keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "i") : null;
    const nodes = core.nodes.filter((n) => !n.stub && inJur(n.jurisdictions, scope) &&
      ((block.types && block.types.includes(n.type) && (!re || re.test(`${n.canonicalName} ${(n.aliases ?? []).join(" ")}`) || !block.keywords.length || RAILS.includes(n.type))) ||
       (!block.types && re && ["licence_type", "regulator", "fiu", "credit_bureau", "identity_system", "data_sharing_framework"].includes(n.type) && re.test(n.canonicalName))))
      .slice(0, 10);
    const rules = block.rulesToo && re ? core.rules.filter((r) => inJur(r.jurisdictions, scope) && re.test(`${r.canonicalName} ${(r.applicability ?? "").slice(0, 160)}`))
      .sort((a, b) => (a.effectiveStatus === "in_force" ? 0 : 1) - (b.effectiveStatus === "in_force" ? 0 : 1)).slice(0, 8) : [];
    return { nodes, rules };
  }, [core, block, scope]);
}

function BlockCard({ b, scope }: { b: Block; scope: Jur }) {
  const { nodes, rules } = useMatches(b, scope);
  const select = useAtlas((s) => s.select);
  const models = useAtlas((s) => s.core?.operatingModels) as { id: string; model: string; whoOwesCustomer?: string; protectionOnFailure?: string }[] | undefined;
  return (
    <article className="bp-block glass">
      <h3>{b.need}</h3>
      <p className="bp-why">{b.why}</p>
      {b.models && models && (
        <div className="bp-models">
          {models.map((m) => (
            <div key={m.id} className="card bp-model"><b>{m.model}</b><span><em>Who owes the customer:</em> {m.whoOwesCustomer}</span><span><em>If it fails:</em> {m.protectionOnFailure}</span></div>
          ))}
        </div>
      )}
      {nodes.length > 0 && <div className="chips">{nodes.map((n) => <NodeChip key={n.id} n={n} />)}</div>}
      {rules.length > 0 && (
        <ul className="bp-rules">
          {rules.map((r) => <li key={r.id}><button className="linklike-plain" onClick={() => select(r.id)}>{r.canonicalName}</button> <StatusPill status={r.effectiveStatus} /></li>)}
        </ul>
      )}
      {nodes.length === 0 && rules.length === 0 && !b.models && <p className="faint" style={{ fontSize: 12.5 }}>Nothing in the dataset matches for this market yet. This is a coverage gap, not a sign that no rule applies.</p>}
    </article>
  );
}

export default function Blueprint() {
  const route = useRoute();
  const scope = useAtlas((s) => s.scope);
  const [market, setMarket] = useState<Jur>(scope === "GLOBAL" ? "IN" : scope);
  const product = PRODUCTS.find((p) => p.id === route.param) ?? PRODUCTS[0];
  return (
    <main className="page blueprint">
      <div className="page-head">
        <div>
          <h1>Product blueprint</h1>
          <p>Pick a product and a market to see the building blocks it needs and the matching systems, licences and rules in the dataset. The building blocks are an editorial guide; the items under them are dataset records matched by keyword, so check each one before relying on it. This is not legal advice.</p>
        </div>
      </div>
      <div className="bp-pick">
        <div className="seg" role="group" aria-label="Product">
          {PRODUCTS.map((p) => <button key={p.id} aria-pressed={p.id === product.id} onClick={() => go("blueprint", p.id)}>{p.name}</button>)}
        </div>
        <div className="seg" role="group" aria-label="Market">
          {MARKETS.map((m) => <button key={m.id} className="flag-btn" aria-pressed={m.id === market} onClick={() => setMarket(m.id)}><Flag code={m.id} />{m.short}</button>)}
        </div>
      </div>
      <p className="bp-line"><b>{product.name}:</b> {product.line}</p>
      <div className="bp-grid">
        {product.blocks.map((b) => <BlockCard key={b.need} b={b} scope={market} />)}
      </div>
    </main>
  );
}
