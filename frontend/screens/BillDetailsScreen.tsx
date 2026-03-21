// screens/BillDetailsScreen.tsx — Full Bill Detail with Ask AI
// Replaced static Bill type with ApiBillDetail fetched from GET /bills/:bill_number

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
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
import { ApiBill, ApiBillDetail, fetchBillDetail } from "../services/api";

// ─── Props ────────────────────────────────────────────────────────────────────
// onAskAI receives the resolved ApiBillDetail (or the shallow ApiBill while loading)

interface BillDetailsScreenProps {
  bill: ApiBill; // shallow bill passed from ExploreScreen
  onBack: () => void;
  onAskAI: (bill: ApiBill) => void;
}

// ─── Status meta ─────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { color: string; bg: string }> = {
  Introduced: { color: "#8b5cf6", bg: "rgba(139,92,246,0.12)" },
  Passed: { color: "#10b981", bg: "rgba(16,185,129,0.12)" },
  Pending: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  Withdrawn: { color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  Unknown: { color: "#6b7280", bg: "rgba(107,114,128,0.12)" },
};

function getStatusMeta(status: string | null) {
  if (!status) return STATUS_META["Unknown"];
  const key = Object.keys(STATUS_META).find((k) =>
    status.toLowerCase().includes(k.toLowerCase()),
  );
  return STATUS_META[key ?? "Unknown"];
}

// ─── Animated section ─────────────────────────────────────────────────────────

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

// ─── Info row ─────────────────────────────────────────────────────────────────

const InfoRow = ({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) => {
  const { theme: T } = useTheme();
  return (
    <View style={[ir.row, { borderBottomColor: T.border }]}>
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

// ─── Section card (from ApiBillDetail.sections) ───────────────────────────────

const SectionCard = ({
  sectionName,
  content,
  index,
}: {
  sectionName: string;
  content: string;
  index: number;
}) => {
  const { theme: T } = useTheme();
  const [expanded, setExpanded] = useState(index === 0);
  const displayName = sectionName
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <FadeIn delay={300 + index * 60}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setExpanded((v) => !v)}
        style={[
          sc.card,
          {
            backgroundColor: T.isDark
              ? "rgba(124,58,237,0.08)"
              : "rgba(109,40,217,0.05)",
            borderColor: T.border,
          },
        ]}
      >
        <View style={sc.header}>
          <LinearGradient colors={Accent.gradAI} style={sc.numBadge}>
            <Text style={sc.num}>{index + 1}</Text>
          </LinearGradient>
          <Text style={[sc.name, { color: T.textPrimary }]} numberOfLines={1}>
            {displayName}
          </Text>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={16}
            color={T.textMuted}
          />
        </View>
        {expanded && (
          <Text style={[sc.content, { color: T.textSecondary }]}>
            {content}
          </Text>
        )}
      </TouchableOpacity>
    </FadeIn>
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

// ─── Loading skeleton ─────────────────────────────────────────────────────────

const LoadingSkeleton = () => {
  const { theme: T } = useTheme();
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);
  return (
    <Animated.View style={[{ padding: 22, gap: 14, opacity: pulse }]}>
      {[90, 60, 40, 80, 50].map((w, i) => (
        <View
          key={i}
          style={[
            {
              height: 14,
              borderRadius: 7,
              width: `${w}%`,
              backgroundColor: T.border,
            },
          ]}
        />
      ))}
    </Animated.View>
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function BillDetailsScreen({
  bill: shallowBill,
  onBack,
  onAskAI,
}: BillDetailsScreenProps) {
  const { theme: T } = useTheme();
  const insets = useSafeAreaInsets();
  const [detail, setDetail] = useState<ApiBillDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use the shallow bill for hero rendering immediately,
  // then enrich with sections from the detail endpoint.
  const bill = detail ?? shallowBill;
  const stsMeta = getStatusMeta(bill.status);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchBillDetail(shallowBill.bill_number);
        if (!cancelled) setDetail(data);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load bill details");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [shallowBill.bill_number]);

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
          Bill Details
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
        {/* ── Hero section ── */}
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

            {/* Year + Status */}
            <View style={ds.heroTopRow}>
              {bill.year ? (
                <View
                  style={[
                    ds.catBadge,
                    {
                      backgroundColor: T.isDark
                        ? "rgba(139,92,246,0.15)"
                        : "rgba(109,40,217,0.08)",
                    },
                  ]}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={12}
                    color={Accent.violet400}
                  />
                  <Text style={[ds.catText, { color: Accent.violet400 }]}>
                    {bill.year}
                  </Text>
                </View>
              ) : (
                <View />
              )}
              <View style={[ds.statusBadge, { backgroundColor: stsMeta.bg }]}>
                <View
                  style={[ds.statusDot, { backgroundColor: stsMeta.color }]}
                />
                <Text style={[ds.statusText, { color: stsMeta.color }]}>
                  {bill.status ?? "Unknown"}
                </Text>
              </View>
            </View>

            {/* Bill title */}
            <Text style={[ds.billName, { color: T.textPrimary }]}>
              {bill.title}
            </Text>
            <Text style={[ds.billShort, { color: Accent.violet400 }]}>
              Bill No. {bill.bill_number}
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
                #{bill.bill_number}
              </Text>
            </View>
          </LinearGradient>
        </FadeIn>

        <View style={ds.body}>
          {/* ── Compression stats ── */}
          <FadeIn delay={80}>
            <View style={ds.statsRow}>
              <StatTile
                icon="layers-outline"
                value={
                  bill.original_tokens >= 1000
                    ? `${(bill.original_tokens / 1000).toFixed(0)}k`
                    : String(bill.original_tokens)
                }
                label="Raw Tokens"
                color={Accent.violet500}
              />
              <StatTile
                icon="git-merge-outline"
                value={
                  bill.compression_ratio > 0
                    ? `${bill.compression_ratio.toFixed(1)}x`
                    : "—"
                }
                label="Compressed"
                color={Accent.fuchsia}
              />
              <StatTile
                icon="leaf-outline"
                value={
                  bill.compressed_tokens >= 1000
                    ? `${(bill.compressed_tokens / 1000).toFixed(0)}k`
                    : String(bill.compressed_tokens)
                }
                label="Stored Tokens"
                color={Accent.green}
              />
            </View>
          </FadeIn>

          {/* ── Bill info ── */}
          <FadeIn delay={140}>
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
                  Bill Information
                </Text>
              </View>
              <InfoRow
                icon="barcode-outline"
                label="Bill Number"
                value={bill.bill_number}
              />
              {bill.year ? (
                <InfoRow
                  icon="calendar-outline"
                  label="Year"
                  value={bill.year}
                />
              ) : null}
              {bill.status ? (
                <InfoRow
                  icon="checkmark-circle-outline"
                  label="Status"
                  value={bill.status}
                />
              ) : null}
              {bill.pdf_url ? (
                <InfoRow
                  icon="document-outline"
                  label="Source PDF"
                  value="Available"
                />
              ) : null}
            </View>
          </FadeIn>

          {/* ── Sections from detail endpoint ── */}
          {loading ? (
            <FadeIn delay={200}>
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
                      name="list-outline"
                      size={16}
                      color={Accent.violet400}
                    />
                  </View>
                  <Text style={[ds.sectionTitle, { color: T.textPrimary }]}>
                    Compressed Sections
                  </Text>
                </View>
                <LoadingSkeleton />
              </View>
            </FadeIn>
          ) : error ? (
            <FadeIn delay={200}>
              <View
                style={[
                  ds.section,
                  { backgroundColor: T.bgCard, borderColor: T.border },
                ]}
              >
                <View style={[ds.errorInner]}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={20}
                    color="#ef4444"
                  />
                  <Text style={[ds.errorText, { color: T.textSecondary }]}>
                    {error}
                  </Text>
                  <TouchableOpacity
                    onPress={async () => {
                      try {
                        setLoading(true);
                        setError(null);
                        const data = await fetchBillDetail(
                          shallowBill.bill_number,
                        );
                        setDetail(data);
                      } catch (e: any) {
                        setError(e?.message ?? "Failed to load bill details");
                      } finally {
                        setLoading(false);
                      }
                    }}
                    style={ds.retryBtn}
                  >
                    <LinearGradient colors={Accent.gradAI} style={ds.retryGrad}>
                      <Text style={ds.retryText}>Retry</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </FadeIn>
          ) : detail && detail.sections.length > 0 ? (
            <View style={ds.sectionsWrap}>
              <FadeIn delay={200}>
                <View style={ds.keyPointsHeader}>
                  <LinearGradient
                    colors={Accent.gradAI}
                    style={ds.keyPointsIcon}
                  >
                    <Ionicons name="list-outline" size={15} color="#fff" />
                  </LinearGradient>
                  <Text style={[ds.keyPointsTitle, { color: T.textPrimary }]}>
                    Compressed Sections
                  </Text>
                  <View
                    style={[
                      ds.keyPointsCount,
                      {
                        backgroundColor: T.isDark
                          ? "rgba(139,92,246,0.2)"
                          : "rgba(109,40,217,0.1)",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        ds.keyPointsCountText,
                        { color: Accent.violet400 },
                      ]}
                    >
                      {detail.sections.length}
                    </Text>
                  </View>
                </View>
              </FadeIn>
              {detail.sections.map((s, i) => (
                <SectionCard
                  key={s.section_name}
                  sectionName={s.section_name}
                  content={s.content}
                  index={i}
                />
              ))}
            </View>
          ) : null}

          {/* ── Ask AI card ── */}
          <FadeIn delay={560}>
            <TouchableOpacity
              onPress={() => onAskAI(bill)}
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
                    <Text style={ds.askAITitle}>Ask AI About This Bill</Text>
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

          {/* ── What AI can answer ── */}
          <FadeIn delay={620}>
            <View
              style={[
                ds.aiHintsCard,
                { backgroundColor: T.bgCard, borderColor: T.border },
              ]}
            >
              <Text style={[ds.aiHintsTitle, { color: T.textPrimary }]}>
                What you can ask AI
              </Text>
              {[
                "Explain this bill in simple terms",
                "How does this affect me as a citizen?",
                "What are the criticisms of this bill?",
                "Compare with the previous law",
              ].map((hint, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => onAskAI(bill)}
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
    marginBottom: 14,
  },
  catBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
  },
  catText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.3 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
  },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.3 },
  billName: {
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 28,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  billShort: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.8,
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

  // Sections list
  sectionsWrap: { gap: 8 },
  keyPointsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  keyPointsIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  keyPointsTitle: {
    fontSize: 15,
    fontWeight: "800",
    flex: 1,
    letterSpacing: -0.2,
  },
  keyPointsCount: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  keyPointsCountText: { fontSize: 12, fontWeight: "800" },

  // Error state
  errorInner: {
    alignItems: "center",
    gap: 12,
    padding: 24,
  },
  errorText: { fontSize: 13, textAlign: "center", lineHeight: 19 },
  retryBtn: { borderRadius: 12, overflow: "hidden" },
  retryGrad: { paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { fontSize: 13, fontWeight: "700", color: "#fff" },

  // Ask AI
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

  // AI hints
  aiHintsCard: { borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  aiHintsTitle: {
    fontSize: 14,
    fontWeight: "800",
    padding: 16,
    paddingBottom: 12,
    letterSpacing: -0.1,
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

const ir = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
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

const sc = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  numBadge: {
    width: 24,
    height: 24,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  num: { fontSize: 11, fontWeight: "800", color: "#fff" },
  name: { flex: 1, fontSize: 13, fontWeight: "700", letterSpacing: 0.2 },
  content: { fontSize: 13, lineHeight: 20 },
});

const st = StyleSheet.create({
  tile: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    gap: 5,
    ...Platform.select({
      ios: {
        shadowColor: "#4c1d95",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: { elevation: 3 },
    }),
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  value: { fontSize: 15, fontWeight: "800", letterSpacing: -0.5 },
  label: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.3,
    textAlign: "center",
  },
});
