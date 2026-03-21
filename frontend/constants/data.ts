import { Ionicons } from "@expo/vector-icons";
type IconName = keyof typeof Ionicons.glyphMap;
export const BILLS = [
  {
    id: "1",
    title: "Digital Personal Data Protection Act",
    date: "Mar 14, 2025",
    summary:
      "Establishes a comprehensive framework for processing personal data of Indian citizens with strict consent requirements and a new Data Protection Board.",
    tags: ["Privacy", "Tech"],
    status: "Introduced",
    statusType: "intro" as const,
  },
  {
    id: "2",
    title: "Clean Energy Finance Bill 2025",
    date: "Mar 10, 2025",
    summary:
      "Allocates ₹50,000 crore for renewable energy infrastructure and offers tax incentives for businesses switching to green operations.",
    tags: ["Finance", "Environment"],
    status: "Passed",
    statusType: "passed" as const,
  },
  {
    id: "3",
    title: "National Health Coverage Expansion",
    date: "Mar 7, 2025",
    summary:
      "Extends Ayushman Bharat to 200 million additional citizens with enhanced mental health and rural clinic provisions.",
    tags: ["Health"],
    status: "Under Review",
    statusType: "review" as const,
  },
  {
    id: "4",
    title: "AI Regulation & Ethics Framework",
    date: "Feb 28, 2025",
    summary:
      "Proposes an independent oversight body for AI systems deployed in critical infrastructure, public services, and financial markets.",
    tags: ["Tech", "Privacy"],
    status: "Introduced",
    statusType: "intro" as const,
  },
  {
    id: "5",
    title: "Small Business Relief Package",
    date: "Feb 22, 2025",
    summary:
      "Provides low-interest loans and 3-year tax holidays for MSMEs recovering from economic disruptions.",
    tags: ["Finance"],
    status: "Passed",
    statusType: "passed" as const,
  },
  {
    id: "6",
    title: "Cybersecurity Infrastructure Act",
    date: "Feb 15, 2025",
    summary:
      "Mandates annual security audits for critical digital infrastructure and establishes incident response protocols.",
    tags: ["Tech", "Privacy"],
    status: "Under Review",
    statusType: "review" as const,
  },
];

export const TRENDING = [
  "Data Privacy",
  "Climate Policy",
  "AI Regulation",
  "Healthcare Reform",
  "Tax Policy",
  "Digital Currency",
  "Education",
  "Cybersecurity",
  "Labor Rights",
];

export const FILTERS = [
  "All",
  "Privacy",
  "Finance",
  "Tech",
  "Health",
  "Environment",
];
type Insight = {
  id: string;
  iconName: IconName;
  category: string;
  color: string;
  bg: string;
  score: number;
  trend: "up" | "down" | "neutral";
  bills: number;
  desc: string;
  impacts: string[];
};

export const INSIGHTS: Insight[] = [
  {
    id: "privacy",
    iconName: "shield-checkmark",
    category: "Privacy & Data",
    color: "#5B21B6",
    bg: "#EDE9FE",
    score: 78,
    trend: "up" as const,
    bills: 3,
    desc: "New data laws strengthen citizen rights over personal information held by corporations and government.",
    impacts: ["Right to erasure", "Explicit consent", "Cross-border limits"],
  },
  {
    id: "economy",
    iconName: "trending-up",
    category: "Economy",
    color: "#059669",
    bg: "#D1FAE5",
    score: 65,
    trend: "up" as const,
    bills: 4,
    desc: "Finance bills boost MSME sector with subsidies and provide major green investment incentives.",
    impacts: ["MSME loan access", "Green tax breaks", "Startup exemptions"],
  },
  {
    id: "business",
    iconName: "business",
    category: "Business Regulation",
    color: "#D97706",
    bg: "#FEF3C7",
    score: 54,
    trend: "neutral" as const,
    bills: 2,
    desc: "Compliance requirements rising but offset by improved digital infrastructure and faster approvals.",
    impacts: ["AI audit mandates", "Cyber compliance", "Reporting rules"],
  },
  {
    id: "health",
    iconName: "heart",
    category: "Public Health",
    color: "#DC2626",
    bg: "#FEE2E2",
    score: 83,
    trend: "up" as const,
    bills: 2,
    desc: "Healthcare bills show strong positive impact for lower-income populations and rural communities.",
    impacts: ["200M new covered", "Mental health", "Rural clinics"],
  },
];

export const CHAT_SEED = [
  {
    id: "a0",
    role: "ai" as const,
    text: "Hello! I'm your **AI Policy Assistant**.\n\nI can explain any bill, law, or policy in plain language — no legal background needed. What would you like to understand today?",
    time: "9:41 AM",
    card: null,
  },
  {
    id: "u1",
    role: "user" as const,
    text: "Explain the Digital Personal Data Protection Act",
    time: "9:42 AM",
    card: null,
  },
  {
    id: "a1",
    role: "ai" as const,
    text: "Here's a full breakdown of the **Digital Personal Data Protection Act**:",
    time: "9:42 AM",
    card: {
      summary:
        "India's first comprehensive data protection law that gives citizens direct control over their personal information.",
      points: [
        "Explicit consent required before data collection",
        "Citizens can request deletion of their data anytime",
        "Fines up to ₹250 crore for violations",
        "New Data Protection Board for dispute resolution",
      ],
      impact:
        "Affects 900M+ internet users. Businesses must comply within 18 months of enactment.",
    },
  },
];

export const PROMPTS = [
  "Explain the Data Protection Bill",
  "How does this affect citizens?",
  "What are my rights under this law?",
  "Compare with EU GDPR",
];

export const HOW_IT_WORKS = [
  {
    n: 1,
    iconName: "radio",
    title: "Bills Detected",
    desc: "We monitor Parliament, state legislatures, and regulatory bodies in real time.",
  },
  {
    n: 2,
    iconName: "sparkles",
    title: "AI Processes Legal Text",
    desc: "Our AI reads thousands of pages and compresses them into clear, actionable insights.",
  },
  {
    n: 3,
    iconName: "chatbubble-ellipses",
    title: "Explained in Plain Language",
    desc: "Citizens get jargon-free summaries and can ask follow-up questions naturally.",
  },
];
