// context/ThemeContext.tsx — Global dark/light theme shared across all screens

import React, { createContext, useContext, useState } from "react";

// ─── Theme tokens ─────────────────────────────────────────────────────────────

export type Theme = {
  isDark: boolean;
  bg: string;
  bgCard: string;
  bgCard2: string;
  border: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  surface2: string;
  surface3: string;
  settingRow: string;
  avatarRing: string;
  inputBg: string;
  statusBar: "light-content" | "dark-content";
};

export const DARK: Theme = {
  isDark: true,
  bg: "#080612",
  bgCard: "#110d1f",
  bgCard2: "#1a1330",
  border: "rgba(167,139,250,0.12)",
  borderStrong: "rgba(167,139,250,0.22)",
  textPrimary: "#ede9fe",
  textSecondary: "#c4b5fd",
  textMuted: "rgba(196,181,253,0.40)",
  surface2: "#1a1330",
  surface3: "#221840",
  settingRow: "rgba(26,19,48,0.9)",
  avatarRing: "rgba(139,92,246,0.4)",
  inputBg: "#1a1330",
  statusBar: "light-content",
};

export const LIGHT: Theme = {
  isDark: false,
  bg: "#f5f3ff",
  bgCard: "#ffffff",
  bgCard2: "#ede9fe",
  border: "rgba(109,40,217,0.10)",
  borderStrong: "rgba(109,40,217,0.20)",
  textPrimary: "#1e0a3c",
  textSecondary: "#5b21b6",
  textMuted: "rgba(91,33,182,0.50)",
  surface2: "#ede9fe",
  surface3: "#ddd6fe",
  settingRow: "rgba(255,255,255,0.95)",
  avatarRing: "rgba(139,92,246,0.25)",
  inputBg: "#ffffff",
  statusBar: "dark-content",
};

// ─── Accent (always violet, theme-independent) ────────────────────────────────

export const Accent = {
  violet300: "#c4b5fd",
  violet400: "#a78bfa",
  violet500: "#8b5cf6",
  violet600: "#7c3aed",
  violet700: "#6d28d9",
  fuchsia: "#d946ef",
  purple: "#a855f7",
  gradAI: ["#7c3aed", "#a855f7", "#d946ef"] as const,
  gradCard: ["#7c3aed", "#6d28d9"] as const,
  danger: "#f87171",
  green: "#4ade80",
};

// ─── Context ──────────────────────────────────────────────────────────────────

type ThemeCtx = {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeCtx>({
  theme: DARK,
  isDark: true,
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [isDark, setIsDark] = useState(true);
  const theme = isDark ? DARK : LIGHT;
  const toggleTheme = () => setIsDark((d) => !d);
  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
