// screens/PolicyDetailsScreen.tsx — Full Policy Detail with Ask AI

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import {
    Animated,
    Dimensions,
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
import { DOMAIN_META, Policy, STATUS_META } from "../data/Policies";

const { width: SW } = Dimensions.get("window");

// ─── Props ────────────────────────────────────────────────────────────────────

interface PolicyDetailsScreenProps {
  policy: Policy;
  onBack: () => void;
  onAskAI: (policy: Policy) => void;
}

// ─── Animated fade-in ─────────────────────────────────────────────────────────

const FadeIn = ({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay,
        useNativeDriver: true,
        speed: 18,
        bounciness: 4,
      }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
};

// ─── Animated impact bar ──────────────────────────────────────────────────────

const ImpactBar = ({ value, color }: { value: number; color: string }) => {
  const width = useRef(new Animated.Value(0)).current;
  const maxW = SW - 32 - 48;
  useEffect(() => {
    Animated.timing(width, {
      toValue: (value / 100) * maxW,
      duration: 900,
      delay: 300,
      useNativeDriver: false,
    }).start();
  }, []);
  return (
    <View style={[ib.track]}>
      <Animated.View style={[ib.fill, { width, backgroundColor: color }]} />
    </View>
  );
};

// ─── Info row ─────────────────────────────────────────────────────────────────

const InfoRow = ({
  icon,
  label,
  value,
  isLast,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  isLast?: boolean;
}) => {
  const { theme: T } = useTheme();
  return (
    <View
      style={[
        ir.row,
        !isLast && { borderBottomWidth: 1, borderBottomColor: T.border },
      ]}
    >
      <View
        style={[
          ir.iconWrap,
          {
            backgroundColor: T.isDark
              ? "rgba(139,92,246,0.12)"
              : "rgba(109,40,217,0.07)",
          },
        ]}
      >
        <Ionicons name={icon} size={15} color={Accent.violet400} />
      </View>
      <View style={ir.texts}>
        <Text style={[ir.label, { color: T.textMuted }]}>{label}</Text>
        <Text style={[ir.value, { color: T.textPrimary }]}>{value}</Text>
      </View>
    </View>
  );
};

// ─── Key point ────────────────────────────────────────────────────────────────

const KeyPoint = ({ text, index }: { text: string; index: number }) => {
  const { theme: T } = useTheme();
  return (
    <FadeIn delay={320 + index * 60}>
      <View
        style={[
          kp.row,
          {
            backgroundColor: T.isDark
              ? "rgba(124,58,237,0.08)"
              : "rgba(109,40,217,0.05)",
            borderColor: T.border,
          },
        ]}
      >
        <LinearGradient colors={Accent.gradAI} style={kp.badge}>
          <Text style={kp.num}>{index + 1}</Text>
        </LinearGradient>
        <Text style={[kp.text, { color: T.textSecondary }]}>{text}</Text>
      </View>
    </FadeIn>
  );
};

// ─── Beneficiary chip ─────────────────────────────────────────────────────────

const BeneficiaryChip = ({ label }: { label: string }) => {
  const { theme: T } = useTheme();
  return (
    <View
      style={[
        bc.chip,
        {
          backgroundColor: T.isDark
            ? "rgba(59,130,246,0.12)"
            : "rgba(59,130,246,0.08)",
          borderColor: "rgba(59,130,246,0.25)",
        },
      ]}
    >
      <Ionicons name="person-outline" size={10} color="#3b82f6" />
      <Text style={bc.text}>{label}</Text>
    </View>
  );
};

// ─── Tag chip ─────────────────────────────────────────────────────────────────

const TagChip = ({ tag }: { tag: string }) => {
  const { theme: T } = useTheme();
  return (
    <View
      style={[
        tc.chip,
        {
          backgroundColor: T.isDark
            ? "rgba(139,92,246,0.15)"
            : "rgba(109,40,217,0.08)",
          borderColor: T.borderStrong,
        },
      ]}
    >
      <Text style={[tc.text, { color: Accent.violet400 }]}>#{tag}</Text>
    </View>
  );
};

// ─── Stat tile ────────────────────────────────────────────────────────────────

const StatTile = ({
  icon,
  value,
  label,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  color: string;
}) => {
  const { theme: T } = useTheme();
  return (
    <View
      style={[st.tile, { backgroundColor: T.bgCard, borderColor: T.border }]}
    >
      <View style={[st.icon, { backgroundColor: color + "22" }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[st.value, { color: T.textPrimary }]}>{value}</Text>
      <Text style={[st.label, { color: T.textMuted }]}>{label}</Text>
    </View>
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PolicyDetailsScreen({
  policy,
  onBack,
  onAskAI,
}: PolicyDetailsScreenProps) {
  const { theme: T } = useTheme();
  const insets = useSafeAreaInsets();
  const meta = DOMAIN_META[policy.domain];
  const sMeta = STATUS_META[policy.status];

  const trendColor =
    policy.trend === "up"
      ? Accent.green
      : policy.trend === "down"
        ? Accent.danger
        : Accent.violet400;
  const trendIcon: keyof typeof Ionicons.glyphMap =
    policy.trend === "up"
      ? "trending-up"
      : policy.trend === "down"
        ? "trending-down"
        : "remove-outline";

  return (
    <View style={[ds.root, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.statusBar} />

      {T.isDark && (
        <>
          <View style={ds.glow1} />
          <View style={ds.glow2} />
        </>
      )}

      {/* ── Header ── */}
      <LinearGradient
        colors={T.isDark ? ["#0c0818", "#110d1f"] : ["#f5f3ff", "#ede9fe"]}
        style={[
          ds.header,
          { paddingTop: insets.top + 10, borderBottomColor: T.border },
        ]}
      >
        <TouchableOpacity
          onPress={onBack}
          style={[
            ds.iconBtn,
            { backgroundColor: T.surface2, borderColor: T.border },
          ]}
          activeOpacity={0.75}
        >
          <Ionicons name="chevron-back" size={22} color={Accent.violet300} />
        </TouchableOpacity>
        <Text
          style={[ds.headerTitle, { color: T.textPrimary }]}
          numberOfLines={1}
        >
          Policy Details
        </Text>
        <TouchableOpacity
          style={[
            ds.iconBtn,
            { backgroundColor: T.surface2, borderColor: T.border },
          ]}
          activeOpacity={0.75}
        >
          <Ionicons name="share-outline" size={20} color={Accent.violet300} />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[
          ds.scroll,
          { paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ── */}
        <FadeIn delay={0}>
          <LinearGradient
            colors={T.isDark ? ["#1a0d40", "#0f0820"] : ["#ede9fe", "#f5f3ff"]}
            style={ds.hero}
          >
            <View
              style={[
                ds.heroShimmer,
                {
                  backgroundColor: T.isDark
                    ? "rgba(196,181,253,0.1)"
                    : "rgba(109,40,217,0.08)",
                },
              ]}
            />

            {/* Domain + status + trend */}
            <View style={ds.heroTopRow}>
              <View style={[ds.domainBadge, { backgroundColor: meta.light }]}>
                <Ionicons
                  name={meta.icon as any}
                  size={12}
                  color={meta.color}
                />
                <Text style={[ds.domainText, { color: meta.color }]}>
                  {policy.domain}
                </Text>
              </View>
              <View style={ds.heroRightRow}>
                <View style={[ds.statusBadge, { backgroundColor: sMeta.bg }]}>
                  <View
                    style={[ds.statusDot, { backgroundColor: sMeta.color }]}
                  />
                  <Text style={[ds.statusText, { color: sMeta.color }]}>
                    {policy.status}
                  </Text>
                </View>
                <View
                  style={[
                    ds.trendBadge,
                    { backgroundColor: trendColor + "18" },
                  ]}
                >
                  <Ionicons name={trendIcon} size={12} color={trendColor} />
                  <Text style={[ds.trendText, { color: trendColor }]}>
                    {policy.trendVal}
                  </Text>
                </View>
              </View>
            </View>

            {/* Title */}
            <Text style={[ds.policyTitle, { color: T.textPrimary }]}>
              {policy.title}
            </Text>

            {/* ID badge */}
            <View
              style={[
                ds.idBadge,
                {
                  backgroundColor: T.isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(109,40,217,0.08)",
                  borderColor: T.borderStrong,
                },
              ]}
            >
              <Ionicons name="barcode-outline" size={13} color={T.textMuted} />
              <Text style={[ds.idText, { color: T.textMuted }]}>
                {policy.id} · {policy.date}
              </Text>
            </View>
          </LinearGradient>
        </FadeIn>

        <View style={ds.body}>
          {/* ── Impact + reach stats ── */}
          <FadeIn delay={80}>
            <View style={ds.statsRow}>
              <StatTile
                icon="flash-outline"
                value={`${policy.impactScore}/100`}
                label="Impact Score"
                color={meta.color}
              />
              <StatTile
                icon="people-outline"
                value={policy.citizenReach}
                label="Citizen Reach"
                color="#3b82f6"
              />
              <StatTile
                icon="wallet-outline"
                value={policy.budget}
                label="Budget"
                color={Accent.fuchsia}
              />
            </View>
          </FadeIn>

          {/* ── Impact bar ── */}
          <FadeIn delay={120}>
            <View
              style={[
                ds.section,
                { backgroundColor: T.bgCard, borderColor: T.border },
              ]}
            >
              <View style={ds.sectionHeader}>
                <View
                  style={[
                    ds.sectionIcon,
                    {
                      backgroundColor: T.isDark
                        ? "rgba(139,92,246,0.15)"
                        : "rgba(109,40,217,0.08)",
                    },
                  ]}
                >
                  <Ionicons
                    name="analytics-outline"
                    size={16}
                    color={Accent.violet400}
                  />
                </View>
                <Text style={[ds.sectionTitle, { color: T.textPrimary }]}>
                  Impact Measurement
                </Text>
              </View>
              <View style={ds.impactRow}>
                <ImpactBar value={policy.impactScore} color={meta.color} />
                <Text style={[ds.impactScore, { color: meta.color }]}>
                  {policy.impactScore}%
                </Text>
              </View>
              <Text style={[ds.impactNote, { color: T.textMuted }]}>
                Composite score based on citizen reach, budget allocation,
                implementation progress, and public sentiment analysis.
              </Text>
            </View>
          </FadeIn>

          {/* ── Summary ── */}
          <FadeIn delay={160}>
            <View
              style={[
                ds.section,
                { backgroundColor: T.bgCard, borderColor: T.border },
              ]}
            >
              <View style={ds.sectionHeader}>
                <View
                  style={[
                    ds.sectionIcon,
                    {
                      backgroundColor: T.isDark
                        ? "rgba(139,92,246,0.15)"
                        : "rgba(109,40,217,0.08)",
                    },
                  ]}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={16}
                    color={Accent.violet400}
                  />
                </View>
                <Text style={[ds.sectionTitle, { color: T.textPrimary }]}>
                  Plain-English Summary
                </Text>
              </View>
              <Text style={[ds.summaryText, { color: T.textSecondary }]}>
                {policy.summary}
              </Text>
            </View>
          </FadeIn>

          {/* ── Policy info ── */}
          <FadeIn delay={220}>
            <View
              style={[
                ds.section,
                { backgroundColor: T.bgCard, borderColor: T.border },
              ]}
            >
              <View style={ds.sectionHeader}>
                <View
                  style={[
                    ds.sectionIcon,
                    {
                      backgroundColor: T.isDark
                        ? "rgba(139,92,246,0.15)"
                        : "rgba(109,40,217,0.08)",
                    },
                  ]}
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={16}
                    color={Accent.violet400}
                  />
                </View>
                <Text style={[ds.sectionTitle, { color: T.textPrimary }]}>
                  Policy Information
                </Text>
              </View>
              <InfoRow
                icon="business-outline"
                label="Ministry"
                value={policy.ministry}
              />
              <InfoRow
                icon="calendar-outline"
                label="Announced"
                value={policy.date}
              />
              <InfoRow
                icon="wallet-outline"
                label="Budget Outlay"
                value={policy.budget}
              />
              <InfoRow
                icon="checkmark-circle-outline"
                label="Status"
                value={policy.status}
                isLast
              />
            </View>
          </FadeIn>

          {/* ── Key points ── */}
          <View style={ds.keyWrap}>
            <FadeIn delay={280}>
              <View style={ds.keyHeader}>
                <LinearGradient colors={Accent.gradAI} style={ds.keyIcon}>
                  <Ionicons name="list-outline" size={15} color="#fff" />
                </LinearGradient>
                <Text style={[ds.keyTitle, { color: T.textPrimary }]}>
                  Key Points
                </Text>
                <View
                  style={[
                    ds.keyCount,
                    {
                      backgroundColor: T.isDark
                        ? "rgba(139,92,246,0.2)"
                        : "rgba(109,40,217,0.1)",
                    },
                  ]}
                >
                  <Text style={[ds.keyCountText, { color: Accent.violet400 }]}>
                    {policy.keyPoints.length}
                  </Text>
                </View>
              </View>
            </FadeIn>
            {policy.keyPoints.map((pt, i) => (
              <KeyPoint key={i} text={pt} index={i} />
            ))}
          </View>

          {/* ── Beneficiaries ── */}
          <FadeIn delay={480}>
            <View style={ds.benefWrap}>
              <View style={ds.keyHeader}>
                <LinearGradient
                  colors={["#3b82f6", "#6366f1"]}
                  style={ds.keyIcon}
                >
                  <Ionicons name="people-outline" size={15} color="#fff" />
                </LinearGradient>
                <Text style={[ds.keyTitle, { color: T.textPrimary }]}>
                  Who Benefits
                </Text>
              </View>
              <View style={ds.chipRow}>
                {policy.beneficiaries.map((b) => (
                  <BeneficiaryChip key={b} label={b} />
                ))}
              </View>
            </View>
          </FadeIn>

          {/* ── Tags ── */}
          <FadeIn delay={520}>
            <View style={ds.chipRow}>
              {policy.tags.map((tag) => (
                <TagChip key={tag} tag={tag} />
              ))}
            </View>
          </FadeIn>

          {/* ── Ask AI CTA ── */}
          <FadeIn delay={580}>
            <TouchableOpacity
              onPress={() => onAskAI(policy)}
              activeOpacity={0.88}
              style={ds.askAICard}
            >
              <LinearGradient
                colors={["#4c1d95", "#7c3aed", "#a855f7"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={ds.askAIGrad}
              >
                <View style={ds.askAIShimmer} />
                <View style={ds.askAILeft}>
                  <LinearGradient
                    colors={["rgba(255,255,255,0.25)", "rgba(255,255,255,0.1)"]}
                    style={ds.askAIIcon}
                  >
                    <Ionicons name="sparkles" size={22} color="#fff" />
                  </LinearGradient>
                  <View>
                    <Text style={ds.askAITitle}>Ask AI About This Policy</Text>
                    <Text style={ds.askAISub}>
                      Get instant plain-English explanations
                    </Text>
                  </View>
                </View>
                <View style={ds.askAIArrow}>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </FadeIn>

          {/* ── AI hint questions ── */}
          <FadeIn delay={640}>
            <View
              style={[
                ds.hintsCard,
                { backgroundColor: T.bgCard, borderColor: T.border },
              ]}
            >
              <Text style={[ds.hintsTitle, { color: T.textPrimary }]}>
                What you can ask AI
              </Text>
              {[
                "Explain this policy in simple terms",
                "How does this policy affect me personally?",
                "What are the criticisms of this policy?",
                "How is this different from previous schemes?",
              ].map((hint, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => onAskAI(policy)}
                  style={[
                    ds.hintRow,
                    i < 3 && {
                      borderBottomColor: T.border,
                      borderBottomWidth: 1,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={14}
                    color={Accent.violet400}
                  />
                  <Text style={[ds.hintText, { color: T.textSecondary }]}>
                    {hint}
                  </Text>
                  <Ionicons
                    name="arrow-forward-outline"
                    size={13}
                    color={T.textMuted}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </FadeIn>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const ds = StyleSheet.create({
  root: { flex: 1 },
  glow1: {
    position: "absolute",
    top: -40,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(109,40,217,0.14)",
  },
  glow2: {
    position: "absolute",
    bottom: 180,
    left: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(217,70,239,0.08)",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
    letterSpacing: 0.1,
  },

  scroll: {},

  hero: { padding: 22, paddingBottom: 24 },
  heroShimmer: {
    position: "absolute",
    top: 0,
    left: 28,
    right: 28,
    height: 1,
    borderRadius: 99,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  heroRightRow: { flexDirection: "row", alignItems: "center", gap: 6 },

  domainBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
  },
  domainText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.3 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 99,
  },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.3 },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 99,
  },
  trendText: { fontSize: 11, fontWeight: "700" },

  policyTitle: {
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 28,
    letterSpacing: -0.5,
    marginBottom: 14,
  },
  idBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
    borderWidth: 1,
  },
  idText: { fontSize: 12, fontWeight: "600", letterSpacing: 0.4 },

  body: { paddingHorizontal: 16, paddingTop: 16, gap: 14 },

  statsRow: { flexDirection: "row", gap: 10 },

  section: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#4c1d95",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: { elevation: 3 },
    }),
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    paddingBottom: 12,
  },
  sectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: { fontSize: 15, fontWeight: "800", letterSpacing: -0.2 },
  summaryText: {
    fontSize: 14,
    lineHeight: 22,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  impactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  impactScore: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.5,
    width: 48,
    textAlign: "right",
  },
  impactNote: {
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  keyWrap: { gap: 8 },
  keyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  keyIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  keyTitle: { fontSize: 15, fontWeight: "800", flex: 1, letterSpacing: -0.2 },
  keyCount: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  keyCountText: { fontSize: 12, fontWeight: "800" },

  benefWrap: { gap: 10 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  askAICard: {
    borderRadius: 22,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#6d28d9",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
      },
      android: { elevation: 12 },
    }),
  },
  askAIGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
  },
  askAIShimmer: {
    position: "absolute",
    top: 0,
    left: 24,
    right: 24,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 99,
  },
  askAILeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  askAIIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  askAITitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  askAISub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 0.1,
  },
  askAIArrow: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },

  hintsCard: { borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  hintsTitle: {
    fontSize: 14,
    fontWeight: "800",
    padding: 16,
    paddingBottom: 12,
  },
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  hintText: { flex: 1, fontSize: 13, lineHeight: 18 },
});

const ib = StyleSheet.create({
  track: {
    flex: 1,
    height: 8,
    backgroundColor: "rgba(139,92,246,0.12)",
    borderRadius: 99,
    overflow: "hidden",
  },
  fill: { height: 8, borderRadius: 99 },
});

const ir = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  texts: { flex: 1 },
  label: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  value: { fontSize: 14, fontWeight: "600" },
});

const kp = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 1,
  },
  num: { fontSize: 11, fontWeight: "800", color: "#fff" },
  text: { flex: 1, fontSize: 13, lineHeight: 19 },
});

const st = StyleSheet.create({
  tile: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 11,
    alignItems: "center",
    gap: 5,
    ...Platform.select({
      ios: {
        shadowColor: "#4c1d95",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  value: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: -0.3,
    textAlign: "center",
  },
  label: {
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 0.3,
    textAlign: "center",
  },
});

const bc = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
    borderWidth: 1,
  },
  text: { fontSize: 12, fontWeight: "600", color: "#3b82f6" },
});

const tc = StyleSheet.create({
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
    borderWidth: 1,
  },
  text: { fontSize: 12, fontWeight: "600", letterSpacing: 0.3 },
});
