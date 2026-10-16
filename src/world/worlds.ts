// Hand-authored clay worlds: one city per market, built on a shared street template.
// Buildings point at dataset node ids where one exists; scenario actors without a node
// (a payer, "Bank A") carry their own explanation. Each step of the market's hero trace
// lists the buildings it involves and the flows it draws. Step numbers match the dataset.
import type { Jur } from "../data/types";
import type { Kind } from "../ui/kinds";

export type Slot =
  | "cb" | "switch" | "switch2" | "payerBank" | "payeeBank" | "payer" | "payee" | "cbdc"
  | "r1" | "r2" | "r3" | "d1" | "x1" | "x2" | "x3" | "x4" | "x5" | "x6";
export type Flow = "message" | "value" | "data" | "control" | "legal";

export interface Building {
  slot: Slot;
  kind: Kind | "home";
  nodeId?: string;
  label: string;
  sub: string;
  text?: string; // actor explanation when there is no node
  links?: string[];
}

export interface StepMap { focus: Slot[]; routes: { path: PathKey; flow: Flow }[] }

export interface World {
  jur: Exclude<Jur, "GLOBAL">;
  scenarioId: string;
  buildings: Building[];
  steps: Record<number, StepMap>;
}

// slot positions on the shared street template (x, z in world units; y is up)
export const SLOT_POS: Record<Slot, [number, number]> = {
  cb: [1, -21], switch: [0, 2], switch2: [3, -9], payerBank: [-10, -4], payeeBank: [13, -8],
  payer: [-10, 11], payee: [18.5, 6.2], cbdc: [-11, -28],
  r1: [-26, -20], r2: [-26, -10], r3: [-26, 0], d1: [-26, 10],
  x1: [31, -20], x2: [31, -9], x3: [41, -14.5], x4: [31, 2], x5: [41, -3.5], x6: [41, -25],
};

export const PATHS = {
  payer_payerBank: [[-10, 9.6], [-10, -1.3]],
  payer_switch: [[-8.6, 11], [-8.6, 15], [0, 15], [0, 5.4]],
  payer_payee: [[-8.8, 12.6], [15.8, 12.6], [15.8, 8.6]],
  switch_payerBank: [[-3.8, 1.5], [-8, 1.5], [-8, -1.3]],
  payerBank_switch: [[-8, -1.3], [-8, 1.5], [-3.8, 1.5]],
  switch_payeeBank: [[3.8, 1.2], [13, 1.2], [13, -5.2]],
  payeeBank_payee: [[13.6, -5.2], [13.6, 9.6], [15.6, 9.6]],
  payerBank_cb: [[-10.5, -6.6], [-10.5, -14.4], [-4.5, -14.4]],
  cb_payeeBank: [[6.5, -14.4], [13, -14.4], [13, -10.8]],
  payerBank_payeeBank: [[-7.4, -5.6], [10.3, -5.6]],
  payerBank_switch2: [[-7.4, -8.2], [-0.1, -8.2]],
  switch2_payeeBank: [[6.1, -8.2], [10.3, -8.2]],
  cb_switch2: [[3, -15.2], [3, -11.4]],
  switch2_cb: [[2.2, -11.4], [2.2, -15.2]],
  cb_switch: [[-1.6, -15.2], [-1.6, -1.4]],
  payerBank_r1: [[-12.7, -6.2], [-16.6, -6.2], [-16.6, -20], [-23, -20]],
  payerBank_r2: [[-12.7, -5], [-18.4, -5], [-18.4, -10], [-23, -10]],
  payerBank_r3: [[-12.7, -3], [-18.4, -3], [-18.4, 0], [-23, 0]],
  payerBank_d1: [[-12.7, -2], [-16.6, -2], [-16.6, 10], [-23, 10]],
  cb_cbdc: [[-7.6, -24], [-7.6, -28]],
} as const satisfies Record<string, readonly (readonly [number, number])[]>;
export type PathKey = keyof typeof PATHS;

const actor = (slot: Slot, kind: Building["kind"], label: string, sub: string, text: string, links?: string[]): Building =>
  ({ slot, kind, label, sub, text, links });
const node = (slot: Slot, kind: Building["kind"], nodeId: string, label: string, sub: string): Building =>
  ({ slot, kind, nodeId, label, sub });

export const WORLDS: World[] = [
  {
    jur: "IN",
    scenarioId: "scn-in-account-opening-upi-p2m",
    buildings: [
      node("cb", "central", "in-rbi", "Reserve Bank of India", "Central bank, settles banks"),
      node("switch", "switch", "in-upi", "UPI switch", "NPCI, routes and clears"),
      actor("payerBank", "bank", "Payer's bank", "Remitter bank, holds the deposit", "The customer's bank. It opens the account with e-KYC, debits the customer when the UPI PIN is entered, and later settles its net position with other banks at the RBI.", ["in-upi", "in-ckycr"]),
      actor("payeeBank", "bank", "Merchant's bank", "Beneficiary bank", "The merchant's bank (or a payment aggregator's escrow bank). It credits the merchant when NPCI forwards the credit request.", ["in-upi"]),
      actor("payer", "person", "Customer", "Pays from a UPI app", "Opens a savings account, links it to a third-party UPI app (TPAP) and pays a merchant by scanning a UPI QR code.", ["in-tpap", "in-upi"]),
      actor("payee", "merchant", "Merchant", "Receives the payment", "A shop accepting UPI through a merchant QR code that resolves to its VPA.", ["in-upi"]),
      node("cbdc", "cbdc", "in-erupee-retail", "e₹ retail", "CBDC pilot"),
      node("r1", "regulator", "in-prb", "Payments Regulatory Board", "Regulates payment systems"),
      node("r2", "regulator", "in-fiu-ind", "FIU-IND", "Receives suspicious reports"),
      node("r3", "data", "in-uidai", "UIDAI", "Aadhaar OTP e-KYC"),
      node("d1", "data", "in-ckycr", "Central KYC Registry", "Stores KYC records"),
      node("x1", "switch", "in-imps", "IMPS", "Instant, NPCI"),
      node("x2", "switch", "in-neft", "NEFT", "Half-hourly net batches"),
      node("x3", "switch", "in-rtgs", "RTGS", "Gross, run by RBI"),
      node("x4", "switch", "in-nach", "NACH", "Bulk debits and credits"),
      node("x5", "card", "in-rupay", "RuPay", "Card scheme, NPCI"),
      node("x6", "data", "in-account-aggregator-framework", "Account Aggregator", "Consented data sharing"),
    ],
    steps: {
      1: { focus: ["payer", "payerBank", "r3"], routes: [{ path: "payer_payerBank", flow: "data" }, { path: "payerBank_r3", flow: "data" }] },
      2: { focus: ["payerBank", "d1"], routes: [{ path: "payerBank_d1", flow: "data" }] },
      3: { focus: ["payer", "payerBank"], routes: [{ path: "payer_payerBank", flow: "data" }] },
      4: { focus: ["payer", "switch", "payee"], routes: [{ path: "payer_payee", flow: "data" }, { path: "payer_switch", flow: "message" }] },
      5: { focus: ["payerBank", "switch"], routes: [{ path: "switch_payerBank", flow: "message" }] },
      6: { focus: ["switch", "payeeBank", "payee"], routes: [{ path: "switch_payeeBank", flow: "message" }, { path: "payeeBank_payee", flow: "value" }] },
      7: { focus: ["cb", "payerBank", "payeeBank"], routes: [{ path: "payerBank_cb", flow: "value" }, { path: "cb_payeeBank", flow: "value" }] },
      8: { focus: ["payee", "payeeBank"], routes: [{ path: "payeeBank_payee", flow: "value" }] },
      9: { focus: ["payer", "payerBank", "cb"], routes: [{ path: "payer_payerBank", flow: "data" }, { path: "payerBank_cb", flow: "legal" }] },
    },
  },
  {
    jur: "UK",
    scenarioId: "scn-uk-fps-sip",
    buildings: [
      node("cb", "central", "uk-boe", "Bank of England", "Runs RT2, settles in reserves"),
      node("switch", "switch", "uk-fps", "Faster Payments", "Pay.UK scheme, Vocalink hub"),
      actor("payerBank", "bank", "Bank A", "Payer's bank", "The payer's bank. It authenticates the payer, runs Confirmation of Payee and fraud, AML and sanctions checks, debits the account and submits the payment to FPS.", ["uk-fps", "uk-ofsi"]),
      actor("payeeBank", "bank", "Bank B", "Payee's bank", "Accepts or rejects the payment in real time and credits the payee within seconds, before interbank settlement.", ["uk-fps"]),
      actor("payer", "person", "Payer", "Sends from a banking app", "A Bank A customer sending a single immediate payment to someone at Bank B.", ["uk-fps"]),
      actor("payee", "home", "Payee", "Bank B customer", "Receives the money in their Bank B account within seconds.", ["uk-fps"]),
      node("cbdc", "cbdc", "uk-digital-pound", "Digital pound", "Design phase, no decision"),
      node("r1", "regulator", "uk-fca", "FCA", "Conduct regulator"),
      node("r2", "regulator", "uk-psr", "Payment Systems Regulator", "APP reimbursement rules"),
      node("r3", "regulator", "uk-ofsi", "OFSI", "Financial sanctions"),
      node("d1", "regulator", "uk-pra", "PRA", "Prudential regulator"),
      node("x1", "switch", "uk-chaps", "CHAPS", "High value, gross"),
      node("x2", "switch", "uk-bacs", "Bacs", "Three-day batch"),
      node("x3", "switch", "uk-link", "LINK", "Cash machine network"),
      node("x4", "card", "uk-visa", "Visa", "Card scheme"),
      node("x5", "card", "uk-mastercard", "Mastercard", "Card scheme"),
      node("x6", "switch", "uk-ics", "Image Clearing System", "Cheques"),
    ],
    steps: {
      1: { focus: ["payer", "payerBank"], routes: [{ path: "payer_payerBank", flow: "data" }] },
      2: { focus: ["payerBank", "payeeBank"], routes: [{ path: "payerBank_payeeBank", flow: "data" }] },
      3: { focus: ["payerBank", "r3"], routes: [{ path: "payerBank_r3", flow: "control" }] },
      4: { focus: ["payerBank", "switch"], routes: [{ path: "payerBank_switch", flow: "control" }] },
      5: { focus: ["payerBank", "switch"], routes: [{ path: "payerBank_switch", flow: "message" }] },
      6: { focus: ["switch", "payeeBank", "payee"], routes: [{ path: "switch_payeeBank", flow: "message" }, { path: "payeeBank_payee", flow: "value" }] },
      7: { focus: ["cb", "payerBank", "payeeBank"], routes: [{ path: "payerBank_cb", flow: "value" }, { path: "cb_payeeBank", flow: "value" }] },
      8: { focus: ["payer", "payerBank", "r2"], routes: [{ path: "payer_payerBank", flow: "data" }, { path: "payerBank_r2", flow: "legal" }] },
    },
  },
  {
    jur: "US",
    scenarioId: "scn-us-fednow-vs-rtp",
    buildings: [
      node("cb", "central", "us-frb", "Federal Reserve", "Master accounts in reserves"),
      node("switch", "switch", "us-fednow", "FedNow", "Fed-run instant rail"),
      node("switch2", "switch", "us-rtp", "RTP network", "The Clearing House"),
      actor("payerBank", "bank", "Sender bank", "Originating bank", "Authenticates the customer, screens fraud and OFAC sanctions, checks limits and debits the account before sending over FedNow or RTP.", ["us-fednow", "us-rtp", "us-ofac"]),
      actor("payeeBank", "bank", "Receiving bank", "Beneficiary bank", "Credits the beneficiary immediately once the rail confirms settlement.", ["us-fednow", "us-rtp"]),
      actor("payer", "person", "Sender", "Pays from a bank app", "A bank customer sending an instant credit transfer.", ["us-fednow"]),
      actor("payee", "home", "Beneficiary", "Receives instantly", "Receives final funds in seconds on either rail.", ["us-fednow", "us-rtp"]),
      node("cbdc", "cbdc", "us-cbdc-status", "US CBDC", "Prohibited by policy and statute"),
      node("r1", "regulator", "us-occ", "OCC", "National bank supervisor"),
      node("r2", "regulator", "us-ofac", "OFAC", "Sanctions"),
      node("r3", "regulator", "us-cfpb", "CFPB", "Consumer protection"),
      node("d1", "regulator", "us-fdic", "FDIC", "Deposit insurance"),
      node("x1", "switch", "us-fedwire-funds", "Fedwire Funds", "High value, gross"),
      node("x2", "switch", "us-fedach", "FedACH", "Batch ACH"),
      node("x3", "switch", "us-chips", "CHIPS", "Large value, netted"),
      node("x4", "switch", "us-epn", "EPN", "Private ACH operator"),
      node("x5", "card", "us-visa", "Visa", "Card scheme"),
      node("x6", "switch", "us-nacha", "Nacha", "ACH rulebook"),
    ],
    steps: {
      1: { focus: ["payer", "payerBank", "r2"], routes: [{ path: "payer_payerBank", flow: "data" }, { path: "payerBank_r2", flow: "control" }] },
      2: { focus: ["switch", "payerBank", "payeeBank", "cb"], routes: [{ path: "payerBank_switch", flow: "message" }, { path: "switch_payeeBank", flow: "message" }, { path: "payerBank_cb", flow: "value" }, { path: "cb_payeeBank", flow: "value" }] },
      3: { focus: ["switch2", "payerBank", "payeeBank"], routes: [{ path: "payerBank_switch2", flow: "message" }, { path: "switch2_payeeBank", flow: "value" }] },
      4: { focus: ["payeeBank", "payee"], routes: [{ path: "payeeBank_payee", flow: "value" }] },
      5: { focus: ["cb", "switch2"], routes: [{ path: "cb_switch2", flow: "value" }] },
      6: { focus: ["payer", "payerBank"], routes: [{ path: "payer_payerBank", flow: "data" }] },
    },
  },
  {
    jur: "EU",
    scenarioId: "scn-eu-sct-inst-de-fr-tips",
    buildings: [
      node("cb", "central", "eu-ecb", "European Central Bank", "Eurosystem, runs T2 and TIPS"),
      node("switch", "switch", "ea-tips", "TIPS", "Instant settlement in central bank money"),
      node("switch2", "switch", "ea-rt1", "RT1", "EBA CLEARING, settles via TIPS"),
      actor("payerBank", "bank", "German bank", "Payer PSP", "The payer's PSP. It runs Verification of Payee, strong customer authentication and compliance checks, then sends the payment to TIPS.", ["ea-tips", "eu-sepa-sct-inst"]),
      actor("payeeBank", "bank", "French bank", "Payee PSP", "Confirms the payee account, and once TIPS settles, makes the funds available within 10 seconds.", ["ea-tips"]),
      actor("payer", "person", "Payer", "Sends an instant transfer", "Enters the payee IBAN and name, sees the verification result and authorises the payment.", ["eu-sepa-sct-inst"]),
      actor("payee", "home", "Payee", "Receives in seconds", "Holds an account at the French bank and is credited within 10 seconds.", ["eu-sepa-sct-inst"]),
      node("cbdc", "cbdc", "ea-digital-euro", "Digital euro", "Design phase, law in trilogue"),
      node("r1", "regulator", "eu-eba", "EBA", "Banking authority"),
      node("r2", "regulator", "eu-amla", "AMLA", "Anti-money laundering authority"),
      node("r3", "switch", "eu-epc", "European Payments Council", "Writes the SEPA rulebooks"),
      node("d1", "regulator", "eu-ssm", "Single Supervisory Mechanism", "Supervises big banks"),
      node("x1", "switch", "ea-t2", "T2", "RTGS, central bank money"),
      node("x2", "market", "ea-t2s", "T2S", "Securities settlement"),
      node("x3", "switch", "ea-euro1", "EURO1", "Large value, private"),
      node("x4", "switch", "ea-step2-t", "STEP2-T", "SEPA batch clearing"),
      node("x5", "switch", "eu-sepa-sct", "SEPA Credit Transfer", "Standard euro transfers"),
      node("x6", "switch", "eu-sepa-sdd-core", "SEPA Direct Debit", "Core scheme"),
    ],
    steps: {
      1: { focus: ["payer", "payerBank"], routes: [{ path: "payer_payerBank", flow: "data" }] },
      2: { focus: ["payerBank", "payeeBank"], routes: [{ path: "payerBank_payeeBank", flow: "data" }] },
      3: { focus: ["payer", "payerBank"], routes: [{ path: "payer_payerBank", flow: "control" }] },
      4: { focus: ["payerBank", "r2"], routes: [{ path: "payerBank_r2", flow: "control" }] },
      5: { focus: ["payerBank", "switch"], routes: [{ path: "payerBank_switch", flow: "message" }] },
      6: { focus: ["switch"], routes: [{ path: "payerBank_switch", flow: "value" }] },
      7: { focus: ["switch", "payeeBank"], routes: [{ path: "switch_payeeBank", flow: "message" }] },
      8: { focus: ["switch", "payerBank", "payeeBank"], routes: [{ path: "payerBank_switch", flow: "value" }, { path: "switch_payeeBank", flow: "value" }] },
      9: { focus: ["payeeBank", "payee"], routes: [{ path: "payeeBank_payee", flow: "value" }] },
      10: { focus: ["payerBank", "payer"], routes: [{ path: "switch_payerBank", flow: "message" }] },
      11: { focus: ["cb", "switch"], routes: [{ path: "cb_switch", flow: "value" }] },
      12: { focus: ["payerBank", "payeeBank"], routes: [{ path: "payerBank_payeeBank", flow: "message" }] },
      13: { focus: ["switch2", "payerBank", "payeeBank"], routes: [{ path: "payerBank_switch2", flow: "message" }, { path: "switch2_payeeBank", flow: "message" }] },
    },
  },
  {
    jur: "SG",
    scenarioId: "scn-sg-paynow-fast-bank-a-to-bank-b",
    buildings: [
      node("cb", "central", "sg-mas", "Monetary Authority of Singapore", "Runs MEPS+, settles banks"),
      node("switch", "switch", "sg-fast", "FAST", "Instant rail, run by BCS"),
      node("switch2", "switch", "sg-sach", "SACH", "Clears and files net positions"),
      actor("payerBank", "bank", "Bank A", "Payer's bank", "Resolves the PayNow proxy, shows the payee's masked name, debits the payer and submits a FAST credit transfer.", ["sg-fast", "sg-paynow"]),
      actor("payeeBank", "bank", "Bank B", "Payee's bank", "Credits the payee in seconds with commercial bank money; settles later in MEPS+.", ["sg-fast"]),
      actor("payer", "person", "Payer", "Pays a mobile number", "Sends money to a PayNow proxy (mobile, NRIC or FIN, UEN or VPA).", ["sg-paynow"]),
      actor("payee", "home", "Payee", "Receives in seconds", "Receives the transfer in their Bank B account.", ["sg-fast"]),
      node("cbdc", "cbdc", "sg-wholesale-cbdc", "Wholesale SGD CBDC", "Live trial, test network"),
      node("r1", "regulator", "sg-pdpc", "PDPC", "Data protection"),
      node("r2", "switch", "sg-abs", "Association of Banks", "Owns PayNow and FAST rules"),
      node("r3", "regulator", "sg-imda", "IMDA", "Infocomm regulator"),
      node("d1", "data", "sg-paynow-directory", "PayNow directory", "Proxy to account lookup"),
      node("x1", "switch", "sg-meps-plus", "MEPS+", "RTGS, run by MAS"),
      node("x2", "switch", "sg-giro", "GIRO", "Batch debits and credits"),
      node("x3", "wallet", "sg-nets", "NETS", "Cards and QR acceptance"),
      node("x4", "market", "sg-sgd-testnet", "SGD Testnet", "Tokenised settlement trials"),
      node("x5", "switch", "sg-paynow-promptpay-link", "PayNow to PromptPay", "Cross-border link"),
      node("x6", "switch", "global-nexus-global-payments", "Nexus Global Payments", "Links instant systems"),
    ],
    steps: {
      1: { focus: ["payer", "payerBank"], routes: [{ path: "payer_payerBank", flow: "data" }] },
      2: { focus: ["payerBank", "d1"], routes: [{ path: "payerBank_d1", flow: "data" }] },
      3: { focus: ["payer", "payerBank"], routes: [{ path: "payer_payerBank", flow: "data" }] },
      4: { focus: ["payerBank", "switch"], routes: [{ path: "payerBank_switch", flow: "message" }] },
      5: { focus: ["switch", "payeeBank", "payee"], routes: [{ path: "switch_payeeBank", flow: "message" }, { path: "payeeBank_payee", flow: "value" }] },
      6: { focus: ["switch2", "cb", "payerBank", "payeeBank"], routes: [{ path: "switch2_cb", flow: "message" }, { path: "payerBank_cb", flow: "value" }, { path: "cb_payeeBank", flow: "value" }] },
      7: { focus: ["cb"], routes: [] },
      8: { focus: ["payer", "payerBank"], routes: [{ path: "payer_payerBank", flow: "data" }] },
    },
  },
  {
    jur: "CN",
    scenarioId: "scn-cn-ecny-domestic-qr-bank-wallet",
    buildings: [
      node("cb", "central", "cn-pboc", "People's Bank of China", "Issues e-CNY"),
      node("switch", "cbdc", "cn-ecny", "e-CNY central system", "PBOC digital currency"),
      actor("payerBank", "bank", "Operator bank A", "Runs the customer's wallet", "A bank operator holding the customer's real-name e-CNY wallet. Since 1 Jan 2026, bank-wallet balances are treated as deposit liabilities of the bank.", ["cn-ecny"]),
      actor("payeeBank", "bank", "Operator B", "Runs the merchant's wallet", "The operator holding the merchant's unit wallet. A transfer between different operators crosses the PBOC central e-CNY system.", ["cn-ecny"]),
      actor("payer", "person", "Customer", "Pays with e-CNY", "Scans the merchant's QR code in the e-CNY app or a bank app.", ["cn-ecny"]),
      actor("payee", "merchant", "Merchant", "Unit wallet", "Receives e-CNY in its unit wallet.", ["cn-ecny"]),
      node("cbdc", "market", "cn-cbets", "CBETS", "Cross-border e-CNY platform"),
      node("r1", "regulator", "cn-nfra", "NFRA", "Financial regulator"),
      node("r2", "regulator", "cn-safe", "SAFE", "Foreign exchange"),
      node("r3", "regulator", "cn-cac", "CAC", "Cyberspace and data"),
      node("d1", "regulator", "cn-camlmac", "CAMLMAC", "AML monitoring"),
      node("x1", "switch", "cn-cips", "CIPS", "Cross-border RMB"),
      node("x2", "switch", "cn-hvps", "HVPS", "High value, gross"),
      node("x3", "switch", "cn-ibps", "IBPS", "Online interbank"),
      node("x4", "switch", "cn-netsunion", "NetsUnion", "Clears non-bank payments"),
      node("x5", "card", "cn-unionpay", "UnionPay", "Card scheme"),
      node("x6", "wallet", "cn-alipay", "Alipay", "Private payment platform"),
    ],
    steps: {
      1: { focus: ["payer", "payerBank"], routes: [{ path: "payer_payerBank", flow: "data" }] },
      2: { focus: ["payer", "payee"], routes: [{ path: "payer_payee", flow: "data" }] },
      3: { focus: ["payerBank", "switch", "payeeBank", "cb"], routes: [{ path: "payerBank_switch", flow: "value" }, { path: "switch_payeeBank", flow: "value" }] },
      4: { focus: ["payeeBank", "payee"], routes: [{ path: "payeeBank_payee", flow: "value" }] },
      5: { focus: ["cb", "switch"], routes: [{ path: "cb_switch", flow: "control" }] },
    },
  },
];

export const worldFor = (j: Jur) => WORLDS.find((w) => w.jur === j) ?? null;
