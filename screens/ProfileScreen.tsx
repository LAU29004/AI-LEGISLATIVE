// screens/ProfileScreen.tsx — Premium Violet Profile (uses global theme)

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Alert,
  Animated,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Accent, useTheme } from "../context/ThemeContext";

// ─── Custom Toggle ─────────────────────────────────────────────────────────────

const ThemeToggle = ({
  isDark,
  onToggle,
}: {
  isDark: boolean;
  onToggle: () => void;
}) => {
  const anim = React.useRef(new Animated.Value(isDark ? 1 : 0)).current;

  const toggle = () => {
    Animated.spring(anim, {
      toValue: isDark ? 0 : 1,
      useNativeDriver: false,
      speed: 20,
      bounciness: 10,
    }).start();
    onToggle();
  };

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 26],
  });
  const trackColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#ddd6fe", "#6d28d9"],
  });

  return (
    <TouchableOpacity onPress={toggle} activeOpacity={0.85}>
      <Animated.View style={[tg.track, { backgroundColor: trackColor }]}>
        <Animated.View style={[tg.thumb, { transform: [{ translateX }] }]}>
          <Ionicons
            name={isDark ? "moon" : "sunny"}
            size={11}
            color={isDark ? "#7c3aed" : "#f59e0b"}
          />
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const tg = StyleSheet.create({
  track: { width: 52, height: 28, borderRadius: 14, justifyContent: "center" },
  thumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: { elevation: 4 },
    }),
  },
});

// ─── Setting Row ──────────────────────────────────────────────────────────────

interface SettingRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
  isLast?: boolean;
}

const SettingRow = ({
  icon,
  label,
  subtitle,
  right,
  onPress,
  danger,
  isLast,
}: SettingRowProps) => {
  const { theme: T } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      style={[
        sr.row,
        { backgroundColor: T.settingRow, borderColor: T.border },
        !isLast && sr.rowBorder,
      ]}
    >
      <View style={[sr.iconWrap, danger && sr.iconWrapDanger]}>
        <Ionicons
          name={icon}
          size={18}
          color={danger ? Accent.danger : Accent.violet400}
        />
      </View>
      <View style={sr.text}>
        <Text
          style={[sr.label, { color: danger ? Accent.danger : T.textPrimary }]}
        >
          {label}
        </Text>
        {subtitle && (
          <Text style={[sr.subtitle, { color: T.textMuted }]}>{subtitle}</Text>
        )}
      </View>
      {right ??
        (onPress ? (
          <Ionicons name="chevron-forward" size={16} color={T.textMuted} />
        ) : null)}
    </TouchableOpacity>
  );
};

const sr = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowBorder: { borderBottomWidth: 1 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "rgba(124,58,237,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  iconWrapDanger: { backgroundColor: "rgba(248,113,113,0.12)" },
  text: { flex: 1 },
  label: { fontSize: 14, fontWeight: "600", letterSpacing: 0.1 },
  subtitle: { fontSize: 12, marginTop: 1, letterSpacing: 0.2 },
});

// ─── Section label ────────────────────────────────────────────────────────────

const SectionLabel = ({ title }: { title: string }) => {
  const { theme: T } = useTheme();
  return (
    <Text style={[sl.text, { color: T.textMuted }]}>{title.toUpperCase()}</Text>
  );
};

const sl = StyleSheet.create({
  text: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 6,
    marginTop: 24,
    paddingHorizontal: 4,
  },
});

// ─── Card wrapper ─────────────────────────────────────────────────────────────

const Card = ({ children }: { children: React.ReactNode }) => {
  const { theme: T } = useTheme();
  return (
    <View
      style={[ps.card, { backgroundColor: T.bgCard, borderColor: T.border }]}
    >
      <View
        style={[
          ps.cardHighlight,
          {
            backgroundColor: T.isDark
              ? "rgba(196,181,253,0.08)"
              : "rgba(109,40,217,0.05)",
          },
        ]}
      />
      {children}
    </View>
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────

interface ProfileScreenProps {
  onLogout?: () => void;
}

export default function ProfileScreen({ onLogout }: ProfileScreenProps) {
  const { theme: T, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: onLogout },
    ]);
  };

  return (
    <View style={[ps.root, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.statusBar} />

      {isDark && (
        <>
          <View style={ps.glow1} />
          <View style={ps.glow2} />
        </>
      )}

      <ScrollView
        contentContainerStyle={[
          ps.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Page title */}
        <Text style={[ps.pageTitle, { color: T.textPrimary }]}>Profile</Text>

        {/* ── Avatar card ── */}
        <View
          style={[
            ps.avatarCard,
            { backgroundColor: T.bgCard, borderColor: T.borderStrong },
          ]}
        >
          <View
            style={[
              ps.cardHighlight,
              {
                backgroundColor: T.isDark
                  ? "rgba(196,181,253,0.12)"
                  : "rgba(109,40,217,0.08)",
              },
            ]}
          />

          <View style={ps.avatarSection}>
            <View style={[ps.avatarRing, { borderColor: T.avatarRing }]}>
              <LinearGradient colors={Accent.gradAI} style={ps.avatarGrad}>
                <Ionicons name="person" size={44} color="#fff" />
              </LinearGradient>
              <View style={ps.onlineBadge}>
                <View style={ps.onlineDot} />
              </View>
            </View>
            <LinearGradient
              colors={Accent.gradAI}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={ps.proBadge}
            >
              <Ionicons name="sparkles" size={10} color="#fff" />
              <Text style={ps.proBadgeText}>PRO</Text>
            </LinearGradient>
          </View>

          <Text style={[ps.userName, { color: T.textPrimary }]}>
            Alex Johnson
          </Text>
          <Text style={[ps.userEmail, { color: T.textMuted }]}>
            alex.johnson@email.com
          </Text>

          <View style={[ps.statsRow, { borderTopColor: T.border }]}>
            {[
              { label: "Chats", value: "248" },
              { label: "PDFs", value: "34" },
              { label: "Days", value: "127" },
            ].map((stat, i) => (
              <View
                key={stat.label}
                style={[
                  ps.stat,
                  i < 2 && { borderRightWidth: 1, borderRightColor: T.border },
                ]}
              >
                <Text style={[ps.statValue, { color: T.textPrimary }]}>
                  {stat.value}
                </Text>
                <Text style={[ps.statLabel, { color: T.textMuted }]}>
                  {stat.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Appearance ── */}
        <SectionLabel title="Appearance" />
        <Card>
          <SettingRow
            icon={isDark ? "moon" : "sunny-outline"}
            label={isDark ? "Dark Mode" : "Light Mode"}
            subtitle={isDark ? "Switch to light theme" : "Switch to dark theme"}
            right={<ThemeToggle isDark={isDark} onToggle={toggleTheme} />}
          />
          <SettingRow
            icon="color-palette-outline"
            label="Accent colour"
            subtitle="Violet (default)"
            onPress={() => {}}
          />
          <SettingRow
            icon="text-outline"
            label="Font size"
            subtitle="Medium"
            onPress={() => {}}
            isLast
          />
        </Card>

        {/* ── Account ── */}
        <SectionLabel title="Account" />
        <Card>
          <SettingRow
            icon="person-outline"
            label="Edit profile"
            onPress={() => {}}
          />
          <SettingRow
            icon="lock-closed-outline"
            label="Privacy & security"
            onPress={() => {}}
          />
          <SettingRow
            icon="notifications-outline"
            label="Notifications"
            subtitle="All enabled"
            onPress={() => {}}
          />
          <SettingRow
            icon="card-outline"
            label="Subscription"
            subtitle="Violet Pro · Active"
            onPress={() => {}}
            isLast
          />
        </Card>

        {/* ── Preferences ── */}
        <SectionLabel title="Preferences" />
        <Card>
          <SettingRow
            icon="language-outline"
            label="Language"
            subtitle="English"
            onPress={() => {}}
          />
          <SettingRow
            icon="cloud-outline"
            label="Data & storage"
            onPress={() => {}}
          />
          <SettingRow
            icon="help-circle-outline"
            label="Help & support"
            onPress={() => {}}
          />
          <SettingRow
            icon="information-circle-outline"
            label="About"
            subtitle="Version 1.0.0"
            onPress={() => {}}
            isLast
          />
        </Card>

        {/* ── Session ── */}
        <SectionLabel title="Session" />
        <Card>
          <SettingRow
            icon="log-out-outline"
            label="Sign out"
            subtitle="You'll be redirected to login"
            danger
            onPress={handleLogout}
            isLast
          />
        </Card>

        {/* ── Footer ── */}
        <View style={ps.footer}>
          <LinearGradient colors={Accent.gradAI} style={ps.footerBadge}>
            <Ionicons name="sparkles" size={12} color="#fff" />
            <Text style={ps.footerBadgeText}>Violet AI · Pro</Text>
          </LinearGradient>
          <Text style={[ps.footerText, { color: T.textMuted }]}>
            Made with ✦ by Violet team
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const ps = StyleSheet.create({
  root: { flex: 1 },
  glow1: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(124,58,237,0.13)",
  },
  glow2: {
    position: "absolute",
    bottom: 200,
    left: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(217,70,239,0.07)",
  },
  scroll: { paddingHorizontal: 20 },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 20,
  },

  avatarCard: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
    paddingBottom: 0,
    ...Platform.select({
      ios: {
        shadowColor: "#4c1d95",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3,
        shadowRadius: 24,
      },
      android: { elevation: 12 },
    }),
  },
  cardHighlight: {
    position: "absolute",
    top: 0,
    left: 32,
    right: 32,
    height: 1,
    borderRadius: 99,
  },

  avatarSection: { alignItems: "center", paddingTop: 28, marginBottom: 4 },
  avatarRing: {
    width: 100,
    height: 100,
    borderRadius: 32,
    borderWidth: 2,
    padding: 3,
    marginBottom: 10,
    position: "relative",
  },
  avatarGrad: {
    flex: 1,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  onlineBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Accent.green,
  },
  proBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  proBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 1,
  },

  userName: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginTop: 10,
  },
  userEmail: { fontSize: 13, marginTop: 3, letterSpacing: 0.2 },

  statsRow: {
    flexDirection: "row",
    width: "100%",
    marginTop: 20,
    borderTopWidth: 1,
  },
  stat: { flex: 1, alignItems: "center", paddingVertical: 16 },
  statValue: { fontSize: 20, fontWeight: "800", letterSpacing: -0.5 },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
    letterSpacing: 0.4,
    fontWeight: "500",
  },

  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#4c1d95",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: { elevation: 4 },
    }),
  },

  footer: { alignItems: "center", gap: 10, marginTop: 32 },
  footerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 99,
  },
  footerBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
  },
  footerText: { fontSize: 11, letterSpacing: 0.3 },
});
