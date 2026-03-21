// components/BottomNav.tsx — Violet Palette Floating Bottom Navigation Bar (Theme-aware)

import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Accent, useTheme } from "./context/ThemeContext";

// ─── Tab config ───────────────────────────────────────────────────────────────

export type TabName = "Home" | "Insights" | "AI" | "Explore" | "Profile";

interface TabConfig {
  name: TabName;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
  center?: boolean;
}

const TABS: TabConfig[] = [
  { name: "Home", label: "Home", icon: "home-outline", iconActive: "home" },
  {
    name: "Insights",
    label: "Insights",
    icon: "stats-chart-outline",
    iconActive: "stats-chart",
  },
  {
    name: "AI",
    label: "AI",
    icon: "sparkles-outline",
    iconActive: "sparkles",
    center: true,
  },
  {
    name: "Explore",
    label: "Explore",
    icon: "compass-outline",
    iconActive: "compass",
  },
  {
    name: "Profile",
    label: "Profile",
    icon: "person-circle-outline",
    iconActive: "person-circle",
  },
];

// ─── Animated tab ─────────────────────────────────────────────────────────────

const NavTab = ({
  tab,
  isActive,
  onPress,
}: {
  tab: TabConfig;
  isActive: boolean;
  onPress: () => void;
}) => {
  const { theme: T, isDark } = useTheme();

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    if (isActive) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1.12,
          useNativeDriver: true,
          speed: 22,
          bounciness: 10,
        }),
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          speed: 22,
          bounciness: 8,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isActive]);

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 0.86,
        useNativeDriver: true,
        speed: 45,
        bounciness: 0,
      }),
      Animated.spring(scaleAnim, {
        toValue: isActive ? 1.12 : 1,
        useNativeDriver: true,
        speed: 22,
        bounciness: 10,
      }),
    ]).start();
    onPress();
  };

  // ── Theme-derived colors ────────────────────────────────────────────────────
  const iconActiveColor = isDark ? "#c4b5fd" : Accent.violet600;
  const iconIdleColor = isDark
    ? "rgba(196,181,253,0.35)"
    : "rgba(91,33,182,0.40)";
  const pillBg = isDark ? "rgba(139,92,246,0.16)" : "rgba(109,40,217,0.10)";
  const pillBorder = isDark ? "rgba(139,92,246,0.25)" : "rgba(109,40,217,0.18)";
  const dotColor = Accent.violet400;

  // ── Center AI Tab ──────────────────────────────────────────────────────────
  if (tab.center) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={1}
        style={s.centerTabWrap}
      >
        {/* Glow ring */}
        <Animated.View
          style={[
            s.centerGlowRing,
            {
              borderColor: isDark ? Accent.violet400 : Accent.violet600,
              opacity: glowAnim,
              transform: [
                {
                  scale: glowAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1.15],
                  }),
                },
              ],
            },
          ]}
        />

        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <LinearGradient
            colors={Accent.gradAI}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.centerBtn}
          >
            <View style={s.centerBtnShimmer} />
            <Ionicons
              name={isActive ? tab.iconActive : tab.icon}
              size={26}
              color="#fff"
            />
          </LinearGradient>
        </Animated.View>

        {/* Glow dot */}
        <Animated.View style={[s.centerGlowDot, { opacity: glowAnim }]} />

        <Text
          style={[
            s.tabLabel,
            {
              color: isDark ? "rgba(196,181,253,0.35)" : "rgba(91,33,182,0.50)",
            },
            isActive && { color: isDark ? "#c4b5fd" : Accent.violet600 },
            s.centerLabel,
          ]}
        >
          {tab.label}
        </Text>
      </TouchableOpacity>
    );
  }

  // ── Regular Tab ────────────────────────────────────────────────────────────
  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8} style={s.tab}>
      <Animated.View
        style={[s.tabInner, { transform: [{ scale: scaleAnim }] }]}
      >
        <View style={s.tabIconWrap}>
          {/* Active pill */}
          <Animated.View
            style={[
              s.activePill,
              {
                backgroundColor: pillBg,
                borderColor: pillBorder,
                opacity: opacityAnim,
              },
            ]}
          />
          <Ionicons
            name={isActive ? tab.iconActive : tab.icon}
            size={22}
            color={isActive ? iconActiveColor : iconIdleColor}
          />
          {/* Glow dot */}
          <Animated.View
            style={[
              s.glowDot,
              { backgroundColor: dotColor, opacity: glowAnim },
            ]}
          />
        </View>

        <Text
          style={[
            s.tabLabel,
            { color: iconIdleColor },
            isActive && { color: iconActiveColor },
          ]}
        >
          {tab.label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

// ─── Bottom Nav ───────────────────────────────────────────────────────────────

interface BottomNavProps {
  activeTab: TabName;
  onTabPress: (name: TabName) => void;
}

export default function BottomNav({ activeTab, onTabPress }: BottomNavProps) {
  const { theme: T, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 8);

  // Theme-derived container styles
  const bgOverlay = isDark ? "rgba(18,12,36,0.82)" : "rgba(245,243,255,0.88)";
  const borderColor = isDark
    ? "rgba(167,139,250,0.12)"
    : "rgba(109,40,217,0.15)";
  const shadowColor = isDark ? "#4c1d95" : "#7c3aed";
  const highlightBg = isDark
    ? "rgba(196,181,253,0.18)"
    : "rgba(109,40,217,0.12)";

  return (
    <View
      style={[
        s.container,
        {
          bottom: bottomPad,
          borderColor,
          shadowColor,
        },
      ]}
    >
      {/* Frosted glass base */}
      <BlurView
        intensity={isDark ? 48 : 60}
        tint={isDark ? "dark" : "light"}
        style={StyleSheet.absoluteFill}
      />

      {/* Colour overlay tint */}
      <View
        style={[
          StyleSheet.absoluteFill,
          s.overlay,
          { backgroundColor: bgOverlay, borderRadius: 30 },
        ]}
      />

      {/* Top highlight edge */}
      <View style={[s.topHighlight, { backgroundColor: highlightBg }]} />

      {/* Tabs */}
      <View style={s.tabsRow}>
        {TABS.map((tab) => (
          <NavTab
            key={tab.name}
            tab={tab}
            isActive={activeTab === tab.name}
            onPress={() => onTabPress(tab.name)}
          />
        ))}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    height: 80,
    borderRadius: 30,
    overflow: "visible",
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.45,
        shadowRadius: 28,
      },
      android: { elevation: 24 },
    }),
  },
  overlay: { overflow: "hidden" },
  topHighlight: {
    position: "absolute",
    top: 0,
    left: 28,
    right: 28,
    height: 1,
    borderRadius: 99,
  },
  tabsRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 4,
  },

  // Regular tab
  tab: { flex: 1, alignItems: "center", paddingVertical: 4 },
  tabInner: { alignItems: "center", gap: 3 },
  tabIconWrap: {
    width: 44,
    height: 34,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    position: "relative",
  },
  activePill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    borderWidth: 1,
  },
  glowDot: {
    position: "absolute",
    bottom: -5,
    left: "50%" as any,
    width: 4,
    height: 4,
    borderRadius: 99,
    marginLeft: -2,
    ...Platform.select({
      ios: {
        shadowColor: Accent.violet500,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 6,
      },
    }),
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.4,
  },

  // Center AI tab
  centerTabWrap: {
    alignItems: "center",
    justifyContent: "flex-end",
    width: 68,
    paddingBottom: 4,
    marginTop: -28,
    position: "relative",
  },
  centerGlowRing: {
    position: "absolute",
    top: -2,
    width: 64,
    height: 64,
    borderRadius: 22,
    borderWidth: 1.5,
    opacity: 0.5,
  },
  centerBtn: {
    width: 58,
    height: 58,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: Accent.violet600,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.75,
        shadowRadius: 20,
      },
      android: { elevation: 16 },
    }),
  },
  centerBtnShimmer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  centerGlowDot: {
    width: 6,
    height: 6,
    borderRadius: 99,
    backgroundColor: Accent.fuchsia,
    marginTop: 4,
    ...Platform.select({
      ios: {
        shadowColor: Accent.fuchsia,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 8,
      },
    }),
  },
  centerLabel: { marginTop: 2 },
});
