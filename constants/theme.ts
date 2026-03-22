// theme.ts — AI Legislative Analyzer Design System

export const Colors = {
  // Backgrounds
  bg: "#09090f",
  bg2: "#111118",
  bg3: "#17171f",
  surface: "#1e1e2a",
  surface2: "#252535",

  // Borders
  border: "#2a2a3d",
  border2: "#353548",

  // Brand
  indigo: "#6366f1",
  indigo2: "#818cf8",
  purple: "#a855f7",
  teal: "#14b8a6",
  teal2: "#2dd4bf",

  // Text
  text: "#f0f0ff",
  text2: "#9898b8",
  text3: "#5c5c7a",

  // Semantic
  green: "#4ade80",
  amber: "#fbbf24",
  red: "#f87171",
  pink: "#c084fc",

  // Gradients (use LinearGradient)
  gradIndigo: ["#6366f1", "#a855f7"] as const,
  gradTeal: ["#6366f1", "#14b8a6"] as const,
  gradAmber: ["#f59e0b", "#ef4444"] as const,
};

export const Radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  full: 999,
};

export const Font = {
  // Using 'Sora' — install via expo-font or react-native-google-fonts
  light: "Sora_300Light",
  regular: "Sora_400Regular",
  medium: "Sora_500Medium",
  semiBold: "Sora_600SemiBold",
  bold: "Sora_700Bold",
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

// Chip color maps
export const ChipColors: Record<
  string,
  { bg: string; border: string; text: string }
> = {
  indigo: {
    bg: "rgba(99,102,241,0.12)",
    border: "rgba(99,102,241,0.3)",
    text: "#818cf8",
  },
  purple: {
    bg: "rgba(168,85,247,0.12)",
    border: "rgba(168,85,247,0.3)",
    text: "#c084fc",
  },
  teal: {
    bg: "rgba(20,184,166,0.12)",
    border: "rgba(20,184,166,0.3)",
    text: "#2dd4bf",
  },
  amber: {
    bg: "rgba(251,191,36,0.10)",
    border: "rgba(251,191,36,0.25)",
    text: "#fbbf24",
  },
  red: {
    bg: "rgba(239,68,68,0.10)",
    border: "rgba(239,68,68,0.25)",
    text: "#f87171",
  },
  green: {
    bg: "rgba(74,222,128,0.10)",
    border: "rgba(74,222,128,0.25)",
    text: "#4ade80",
  },
};
