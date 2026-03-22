// data/policies.ts — Indian Government Policies dataset

export type PolicyDomain =
  | "Economy"
  | "Environment"
  | "Technology"
  | "Social"
  | "Defence"
  | "Agriculture";

export type PolicyStatus = "Active" | "Proposed" | "Under Review" | "Amended";

export interface Policy {
  id: string;
  title: string;
  domain: PolicyDomain;
  date: string;
  impactScore: number;
  citizenReach: string;
  status: PolicyStatus;
  summary: string;
  trend: "up" | "down" | "stable";
  trendVal: string;
  ministry: string;
  budget: string;
  keyPoints: string[];
  beneficiaries: string[];
  tags: string[];
}

export interface DomainStat {
  domain: PolicyDomain;
  count: number;
  avgImpact: number;
  color: string;
  icon: string;
}

export const DOMAIN_META: Record<
  PolicyDomain,
  { color: string; light: string; icon: string }
> = {
  Economy: {
    color: "#f59e0b",
    light: "rgba(245,158,11,0.15)",
    icon: "trending-up-outline",
  },
  Environment: {
    color: "#10b981",
    light: "rgba(16,185,129,0.15)",
    icon: "leaf-outline",
  },
  Technology: {
    color: "#8b5cf6",
    light: "rgba(139,92,246,0.15)",
    icon: "hardware-chip-outline",
  },
  Social: {
    color: "#3b82f6",
    light: "rgba(59,130,246,0.15)",
    icon: "people-outline",
  },
  Defence: {
    color: "#6b7280",
    light: "rgba(107,114,128,0.15)",
    icon: "shield-outline",
  },
  Agriculture: {
    color: "#84cc16",
    light: "rgba(132,204,22,0.15)",
    icon: "flower-outline",
  },
};

export const STATUS_META: Record<PolicyStatus, { color: string; bg: string }> =
  {
    Active: { color: "#10b981", bg: "rgba(16,185,129,0.15)" },
    Proposed: { color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
    "Under Review": { color: "#8b5cf6", bg: "rgba(139,92,246,0.15)" },
    Amended: { color: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
  };

export const POLICIES: Policy[] = [
  {
    id: "P-2024-001",
    title: "National AI Mission",
    domain: "Technology",
    date: "Mar 2024",
    impactScore: 91,
    citizenReach: "1.4 Billion",
    status: "Active",
    ministry: "Ministry of Electronics & IT",
    budget: "₹10,371 crore",
    summary:
      "₹10,371 crore initiative to position India as a global AI powerhouse, funding compute infrastructure, research hubs, and AI startups across the country.",
    trend: "up",
    trendVal: "+12%",
    keyPoints: [
      "10,000 GPUs to be procured for a shared AI compute infrastructure",
      "Establishes India AI Research Analytics and Knowledge dissemination platform",
      "Funds 5 Centres of Excellence in AI at top institutions",
      "AI startup financing through ₹2,000 crore deep-tech fund",
      "Safe and trusted AI development framework to prevent misuse",
    ],
    beneficiaries: [
      "AI Startups",
      "Research Institutions",
      "Students",
      "Tech Industry",
      "Government Departments",
    ],
    tags: ["AI", "Deep Tech", "Compute", "Research", "Startups"],
  },
  {
    id: "P-2024-002",
    title: "PM Surya Ghar Muft Bijli Yojana",
    domain: "Environment",
    date: "Feb 2024",
    impactScore: 86,
    citizenReach: "10 crore homes",
    status: "Active",
    ministry: "Ministry of New & Renewable Energy",
    budget: "₹75,021 crore",
    summary:
      "Free rooftop solar for 1 crore households, providing 300 units of free electricity monthly and reducing grid dependency while cutting carbon emissions.",
    trend: "up",
    trendVal: "+24%",
    keyPoints: [
      "1 crore households to get rooftop solar panels free of cost",
      "300 units of free electricity per month for beneficiary families",
      "Subsidy of ₹30,000–₹78,000 depending on system size",
      "Direct benefit transfer for installation costs",
      "Aims to generate 30 GW of solar capacity",
    ],
    beneficiaries: [
      "Low and Middle Income Households",
      "Rural Families",
      "Urban Residents",
      "Electricity Boards",
    ],
    tags: [
      "Solar",
      "Renewable Energy",
      "Free Electricity",
      "Green India",
      "Subsidy",
    ],
  },
  {
    id: "P-2024-003",
    title: "Interim Budget 2024–25",
    domain: "Economy",
    date: "Feb 2024",
    impactScore: 88,
    citizenReach: "140 crore citizens",
    status: "Active",
    ministry: "Ministry of Finance",
    budget: "₹47.65 lakh crore",
    summary:
      "₹47.65 lakh crore outlay with focus on infrastructure, housing, and tax relief. Capital expenditure at ₹11.11 lakh crore — the highest ever in India's history.",
    trend: "stable",
    trendVal: "0%",
    keyPoints: [
      "Capital expenditure raised to ₹11.11 lakh crore (3.4% of GDP)",
      "Income tax rebate retained for income up to ₹7 lakh",
      "No changes to direct or indirect tax slabs",
      "₹2.66 lakh crore allocated for rural development",
      "PM Awas Yojana target raised to 2 crore houses",
    ],
    beneficiaries: [
      "Taxpayers",
      "Infrastructure Sector",
      "Rural Citizens",
      "Women",
      "Youth",
    ],
    tags: ["Budget", "Finance", "Infrastructure", "Capex", "Tax"],
  },
  {
    id: "P-2024-004",
    title: "Pradhan Mantri Awas Yojana 2.0",
    domain: "Social",
    date: "Jan 2024",
    impactScore: 83,
    citizenReach: "2 crore families",
    status: "Active",
    ministry: "Ministry of Housing & Urban Affairs",
    budget: "₹2.30 lakh crore",
    summary:
      "Urban housing for all — 2 crore pucca houses for the middle class and EWS (Economically Weaker Sections) in cities over the next 5 years.",
    trend: "up",
    trendVal: "+8%",
    keyPoints: [
      "2 crore urban houses to be constructed in 5 years",
      "Interest subsidy on home loans for middle income group",
      "Focus on EWS and LIG (Lower Income Group) beneficiaries",
      "Women head-of-household priority in allotment",
      "Integration with RERA for quality assurance",
    ],
    beneficiaries: [
      "Urban Poor",
      "EWS Families",
      "LIG Households",
      "Middle Class",
      "Women",
    ],
    tags: ["Housing", "Urban", "Affordable Homes", "EWS", "LIG"],
  },
  {
    id: "P-2024-005",
    title: "Unified Pension Scheme",
    domain: "Social",
    date: "Aug 2024",
    impactScore: 78,
    citizenReach: "23 lakh employees",
    status: "Proposed",
    ministry: "Department of Pension & Pensioners' Welfare",
    budget: "₹800 crore annually",
    summary:
      "Assured pension of 50% of last drawn basic pay after 25 years of service for Central Government employees, effective April 2025.",
    trend: "up",
    trendVal: "+5%",
    keyPoints: [
      "50% of last drawn basic pay as assured pension after 25 years",
      "Proportional pension after minimum 10 years of service",
      "Assured family pension at 60% of employee's pension on death",
      "Inflation indexation based on AICPI",
      "Lump sum payment on superannuation in addition to gratuity",
    ],
    beneficiaries: [
      "Central Government Employees",
      "Pensioners",
      "Government Families",
    ],
    tags: ["Pension", "Government Employees", "Social Security", "Retirement"],
  },
  {
    id: "P-2024-006",
    title: "PM-KISAN Enhanced Outreach",
    domain: "Agriculture",
    date: "Jun 2024",
    impactScore: 80,
    citizenReach: "9.3 crore farmers",
    status: "Active",
    ministry: "Ministry of Agriculture & Farmers' Welfare",
    budget: "₹60,000 crore annually",
    summary:
      "₹6,000 annual income support expanded with enhanced crop insurance integration and real-time disbursement via PM-KISAN portal.",
    trend: "stable",
    trendVal: "+2%",
    keyPoints: [
      "₹6,000 per year in 3 equal instalments of ₹2,000 each",
      "9.3 crore farmer families covered across India",
      "Direct bank transfer — no middlemen",
      "Integration with Pradhan Mantri Fasal Bima Yojana",
      "e-KYC mandatory for continued benefit eligibility",
    ],
    beneficiaries: [
      "Small Farmers",
      "Marginal Farmers",
      "Landholding Families",
      "Agricultural Workers",
    ],
    tags: ["Farmers", "Income Support", "Agriculture", "DBT", "KISAN"],
  },
  {
    id: "P-2024-007",
    title: "Defence Indigenisation Policy",
    domain: "Defence",
    date: "Apr 2024",
    impactScore: 75,
    citizenReach: "Defence ecosystem",
    status: "Active",
    ministry: "Ministry of Defence",
    budget: "₹6.21 lakh crore (defence budget)",
    summary:
      "75% of defence procurement from domestic industry. Positive indigenisation list expanded to 509 items banned from imports, boosting Atmanirbhar Bharat.",
    trend: "up",
    trendVal: "+18%",
    keyPoints: [
      "509 defence items on positive indigenisation list — banned from imports",
      "68% of defence capital procurement reserved for domestic industry",
      "Defence exports target: ₹35,000 crore by 2025",
      "iDEX (Innovations for Defence Excellence) expanded",
      "Private sector allowed in fighter jet and submarine production",
    ],
    beneficiaries: [
      "Defence PSUs",
      "Private Defence Firms",
      "MSMEs",
      "Armed Forces",
      "Defence Startups",
    ],
    tags: [
      "Defence",
      "Indigenisation",
      "Atmanirbhar",
      "Exports",
      "Manufacturing",
    ],
  },
  {
    id: "P-2024-008",
    title: "National Logistics Policy Update",
    domain: "Economy",
    date: "May 2024",
    impactScore: 72,
    citizenReach: "All industry sectors",
    status: "Under Review",
    ministry: "Ministry of Commerce & Industry",
    budget: "₹8 lakh crore (PM GatiShakti)",
    summary:
      "Aims to reduce logistics cost from 13–14% to 8% of GDP through PM GatiShakti, Unified Logistics Interface Platform (ULIP), and Ease of Logistics (ELOG).",
    trend: "down",
    trendVal: "-3%",
    keyPoints: [
      "Target: reduce logistics cost to 8% of GDP from 13–14%",
      "Unified Logistics Interface Platform (ULIP) integrates 35+ systems",
      "PM GatiShakti National Master Plan for multi-modal connectivity",
      "Ease of Logistics (ELOG) portal for industry feedback",
      "National Logistics Excellence Awards to incentivise efficiency",
    ],
    beneficiaries: [
      "Exporters",
      "Manufacturers",
      "E-commerce Sector",
      "Consumers",
      "Transport Industry",
    ],
    tags: [
      "Logistics",
      "GatiShakti",
      "Supply Chain",
      "Trade",
      "Infrastructure",
    ],
  },
];

export const DOMAIN_STATS: DomainStat[] = [
  {
    domain: "Technology",
    count: 1,
    avgImpact: 91,
    color: "#8b5cf6",
    icon: "hardware-chip-outline",
  },
  {
    domain: "Economy",
    count: 2,
    avgImpact: 80,
    color: "#f59e0b",
    icon: "trending-up-outline",
  },
  {
    domain: "Environment",
    count: 1,
    avgImpact: 86,
    color: "#10b981",
    icon: "leaf-outline",
  },
  {
    domain: "Social",
    count: 2,
    avgImpact: 80,
    color: "#3b82f6",
    icon: "people-outline",
  },
  {
    domain: "Agriculture",
    count: 1,
    avgImpact: 80,
    color: "#84cc16",
    icon: "flower-outline",
  },
  {
    domain: "Defence",
    count: 1,
    avgImpact: 75,
    color: "#6b7280",
    icon: "shield-outline",
  },
];

export const TIMELINE_DATA = [
  { month: "Jan", count: 1, height: 40 },
  { month: "Feb", count: 2, height: 80 },
  { month: "Mar", count: 1, height: 40 },
  { month: "Apr", count: 1, height: 40 },
  { month: "May", count: 1, height: 35 },
  { month: "Jun", count: 1, height: 40 },
  { month: "Jul", count: 0, height: 10 },
  { month: "Aug", count: 1, height: 40 },
];
