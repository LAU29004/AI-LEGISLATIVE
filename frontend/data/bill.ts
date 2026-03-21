// data/bills.ts — Indian Parliamentary Bills dataset

export type BillStatus =
  | "Passed"
  | "Pending"
  | "Under Review"
  | "Referred"
  | "Lapsed";
export type BillCategory =
  | "Finance"
  | "Environment"
  | "Technology"
  | "Healthcare"
  | "Education"
  | "Defence"
  | "Agriculture"
  | "Infrastructure"
  | "Labour"
  | "Justice";

export interface Bill {
  id: string;
  bill_number: string; // Parliamentary bill number — used by the API for context filtering & ingest
  name: string;
  shortName: string;
  category: BillCategory;
  status: BillStatus;
  introducedBy: string;
  ministry: string;
  introducedDate: string;
  house: "Lok Sabha" | "Rajya Sabha";
  summary: string;
  keyPoints: string[];
  tokenCount: number;
  compressionRatio: string;
  carbonSaved: string;
  tags: string[];
}

export const CATEGORY_META: Record<
  BillCategory,
  { color: string; bg: string; icon: string }
> = {
  Finance: {
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.15)",
    icon: "cash-outline",
  },
  Environment: {
    color: "#10b981",
    bg: "rgba(16,185,129,0.15)",
    icon: "leaf-outline",
  },
  Technology: {
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.15)",
    icon: "hardware-chip-outline",
  },
  Healthcare: {
    color: "#ef4444",
    bg: "rgba(239,68,68,0.15)",
    icon: "medical-outline",
  },
  Education: {
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.15)",
    icon: "school-outline",
  },
  Defence: {
    color: "#6b7280",
    bg: "rgba(107,114,128,0.15)",
    icon: "shield-outline",
  },
  Agriculture: {
    color: "#84cc16",
    bg: "rgba(132,204,22,0.15)",
    icon: "flower-outline",
  },
  Infrastructure: {
    color: "#f97316",
    bg: "rgba(249,115,22,0.15)",
    icon: "construct-outline",
  },
  Labour: {
    color: "#06b6d4",
    bg: "rgba(6,182,212,0.15)",
    icon: "people-outline",
  },
  Justice: {
    color: "#d946ef",
    bg: "rgba(217,70,239,0.15)",
    icon: "scale-outline",
  },
};

export const STATUS_META: Record<BillStatus, { color: string; bg: string }> = {
  Passed: { color: "#10b981", bg: "rgba(16,185,129,0.15)" },
  Pending: { color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
  "Under Review": { color: "#8b5cf6", bg: "rgba(139,92,246,0.15)" },
  Referred: { color: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
  Lapsed: { color: "#6b7280", bg: "rgba(107,114,128,0.15)" },
};

export const BILLS: Bill[] = [
  {
    id: "LS-2024-001",
    bill_number: "No. 18 of 2023", // Digital Personal Data Protection Bill, 2023
    name: "The Digital Personal Data Protection Act",
    shortName: "DPDP Act",
    category: "Technology",
    status: "Passed",
    introducedBy: "Ashwini Vaishnaw",
    ministry: "Ministry of Electronics & IT",
    introducedDate: "3 Aug 2023",
    house: "Lok Sabha",
    summary:
      "Establishes a comprehensive framework for the protection of digital personal data of Indian citizens, creating rights for data principals and obligations for data fiduciaries, with significant penalties for breaches.",
    keyPoints: [
      "Defines 'data principal' (citizen) and 'data fiduciary' (company) roles",
      "Requires explicit consent before processing personal data",
      "Right to erasure and right to grievance redressal for citizens",
      "Penalties up to ₹250 crore for data breaches",
      "Creates Data Protection Board of India",
    ],
    tokenCount: 84200,
    compressionRatio: "94%",
    carbonSaved: "3.2 kg CO₂",
    tags: ["Privacy", "Digital", "MEITY", "Data Rights"],
  },
  {
    id: "RS-2024-007",
    bill_number: "No. 19 of 2023", // Anusandhan National Research Foundation Bill, 2023
    name: "The Anusandhan National Research Foundation Bill",
    shortName: "ANRF Bill",
    category: "Education",
    status: "Passed",
    introducedBy: "Dharmendra Pradhan",
    ministry: "Ministry of Education",
    introducedDate: "28 Jul 2023",
    house: "Rajya Sabha",
    summary:
      "Establishes the Anusandhan National Research Foundation to seed, grow and promote research and development across India, with a corpus of ₹50,000 crore over five years.",
    keyPoints: [
      "₹50,000 crore corpus over 5 years (2023–2028)",
      "Governs research in natural sciences, engineering, technology, humanities",
      "Industry collaboration mandatory for applied research grants",
      "Replaces the Science and Engineering Research Board (SERB)",
      "PM chairs governing board; focuses on translational research",
    ],
    tokenCount: 62500,
    compressionRatio: "91%",
    carbonSaved: "2.4 kg CO₂",
    tags: ["Research", "Education", "Innovation", "Science"],
  },
  {
    id: "LS-2024-013",
    bill_number: "No. 24 of 2023", // Bharatiya Nyaya Sanhita, 2023
    name: "The Bharatiya Nyaya Sanhita",
    shortName: "BNS 2023",
    category: "Justice",
    status: "Passed",
    introducedBy: "Amit Shah",
    ministry: "Ministry of Home Affairs",
    introducedDate: "11 Aug 2023",
    house: "Lok Sabha",
    summary:
      "Replaces the Indian Penal Code 1860, modernising India's criminal law framework with new provisions for organised crime, terrorism, and gender-based violence while removing colonial-era offences.",
    keyPoints: [
      "Replaces 163-year-old Indian Penal Code (IPC)",
      "358 sections vs 511 in IPC — more concise",
      "New offences: organised crime, terrorism, hit-and-run",
      "Enhanced penalties for crimes against women and children",
      "Removes sedition law (Section 124A IPC)",
    ],
    tokenCount: 118000,
    compressionRatio: "96%",
    carbonSaved: "4.5 kg CO₂",
    tags: ["Criminal Law", "Reform", "MHA", "IPC Replacement"],
  },
  {
    id: "LS-2024-019",
    bill_number: "No. 8 of 2023", // Forest (Conservation) Amendment Bill, 2023
    name: "The Forest (Conservation) Amendment Bill",
    shortName: "FCA Amendment",
    category: "Environment",
    status: "Passed",
    introducedBy: "Bhupender Yadav",
    ministry: "Ministry of Environment, Forest & Climate Change",
    introducedDate: "29 Mar 2023",
    house: "Lok Sabha",
    summary:
      "Amends the Forest Conservation Act 1980 to exempt certain land categories from prior approval requirements and expands the scope to include plantations on non-forest land.",
    keyPoints: [
      "Exempts border area land within 100km from prior approval",
      "Allows strategic linear projects along borders",
      "Promotes forest plantations outside notified forests",
      "Defines 'forest' for the first time in the central law",
      "Controversial: critics argue it dilutes forest protections",
    ],
    tokenCount: 45800,
    compressionRatio: "89%",
    carbonSaved: "1.8 kg CO₂",
    tags: ["Forest", "Environment", "Amendment", "Biodiversity"],
  },
  {
    id: "RS-2024-022",
    bill_number: "No. 20 of 2023", // Multi-State Co-operative Societies (Amendment) Bill, 2023
    name: "The Multi-State Co-operative Societies (Amendment) Bill",
    shortName: "MSCS Amendment",
    category: "Agriculture",
    status: "Passed",
    introducedBy: "Amit Shah",
    ministry: "Ministry of Cooperation",
    introducedDate: "25 Jul 2023",
    house: "Rajya Sabha",
    summary:
      "Enhances governance and transparency in multi-state cooperative societies by strengthening audit, election, and member-rights provisions.",
    keyPoints: [
      "Mandatory filing of annual reports with Central Registrar",
      "Co-operative Election Authority to oversee board elections",
      "Reserved seats for women and SC/ST on boards",
      "Dispute resolution through conciliation mechanisms",
      "Penalties for mismanagement and fund diversion",
    ],
    tokenCount: 38200,
    compressionRatio: "88%",
    carbonSaved: "1.5 kg CO₂",
    tags: ["Cooperative", "Agriculture", "Governance"],
  },
  {
    id: "LS-2024-031",
    bill_number: "No. 40 of 2023", // Telecommunications Bill, 2023
    name: "The Telecommunications Bill",
    shortName: "Telecom Bill 2023",
    category: "Technology",
    status: "Passed",
    introducedBy: "Ashwini Vaishnaw",
    ministry: "Ministry of Communications",
    introducedDate: "18 Sep 2023",
    house: "Lok Sabha",
    summary:
      "Replaces three archaic telecom laws — Indian Telegraph Act 1885, Indian Wireless Telegraphy Act 1933, and Telegraph Wires (Unlawful Possession) Act 1950 — with a modern unified framework.",
    keyPoints: [
      "Replaces three laws dating back to the British era",
      "Government can take over telecom services in national security",
      "OTT platforms (WhatsApp, Signal) may come under ambit",
      "Biometric verification mandatory for SIM cards",
      "New spectrum allocation framework for 5G/6G",
    ],
    tokenCount: 72400,
    compressionRatio: "92%",
    carbonSaved: "2.8 kg CO₂",
    tags: ["Telecom", "5G", "Digital India", "OTT"],
  },
  {
    id: "RS-2024-038",
    bill_number: "No. 43 of 2023", // Jammu and Kashmir Reorganisation (Amendment) Bill, 2023
    name: "The Jammu and Kashmir Reorganisation (Amendment) Bill",
    shortName: "J&K Amendment",
    category: "Infrastructure",
    status: "Passed",
    introducedBy: "Amit Shah",
    ministry: "Ministry of Home Affairs",
    introducedDate: "7 Dec 2023",
    house: "Rajya Sabha",
    summary:
      "Amends the J&K Reorganisation Act 2019 to increase the number of seats in the Jammu and Kashmir Legislative Assembly and restore statehood provisions.",
    keyPoints: [
      "Increases assembly seats from 83 to 90",
      "Reserves 9 seats for Scheduled Tribes (STs)",
      "Lieutenant Governor retains certain discretionary powers",
      "First J&K elections under new UT framework",
      "Part of roadmap to full statehood restoration",
    ],
    tokenCount: 29600,
    compressionRatio: "85%",
    carbonSaved: "1.1 kg CO₂",
    tags: ["J&K", "Statehood", "Elections", "Constitutional"],
  },
  {
    id: "LS-2024-044",
    bill_number: "No. 21 of 2023", // Mediation Bill, 2023
    name: "The Mediation Bill",
    shortName: "Mediation Bill",
    category: "Justice",
    status: "Passed",
    introducedBy: "Kiren Rijiju",
    ministry: "Ministry of Law & Justice",
    introducedDate: "1 Aug 2023",
    house: "Lok Sabha",
    summary:
      "Creates a statutory framework for mediation in India, establishing the Mediation Council of India and providing for pre-litigation and online mediation.",
    keyPoints: [
      "Promotes pre-litigation mediation to reduce court backlog",
      "Mediation Council of India to regulate mediators",
      "Mediated settlement agreements enforceable as court decrees",
      "Online mediation recognised as valid process",
      "Applies to commercial and civil disputes",
    ],
    tokenCount: 41300,
    compressionRatio: "90%",
    carbonSaved: "1.6 kg CO₂",
    tags: ["ADR", "Mediation", "Courts", "Dispute Resolution"],
  },
];

export const CATEGORIES: BillCategory[] = [
  "Finance",
  "Environment",
  "Technology",
  "Healthcare",
  "Education",
  "Defence",
  "Agriculture",
  "Infrastructure",
  "Labour",
  "Justice",
];
