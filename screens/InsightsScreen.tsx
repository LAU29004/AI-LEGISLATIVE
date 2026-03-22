// screens/InsightsScreen.tsx — Policy Insights Dashboard

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Accent, useTheme } from "../context/ThemeContext";
import {
  DOMAIN_META,
  DOMAIN_STATS,
  POLICIES,
  Policy,
  STATUS_META,
  TIMELINE_DATA,
} from "../data/Policies";

const { width: SW } = Dimensions.get("window");
const BAR_MAX_W = SW - 32 - 100;

// ─── Props ────────────────────────────────────────────────────────────────────

interface InsightsScreenProps {
  onSelectPolicy: (policy: Policy) => void;
}

// ─── Animated entrance ────────────────────────────────────────────────────────

const useFadeSlide = (delay = 0) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 480,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay,
        useNativeDriver: true,
        speed: 16,
        bounciness: 4,
      }),
    ]).start();
  }, []);
  return { opacity, transform: [{ translateY }] };
};

// ─── Animated bar ─────────────────────────────────────────────────────────────

const AnimatedBar = ({
  value,
  color,
  delay,
}: {
  value: number;
  color: string;
  delay: number;
}) => {
  const width = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(width, {
      toValue: (value / 100) * BAR_MAX_W,
      duration: 700,
      delay,
      useNativeDriver: false,
    }).start();
  }, []);
  return (
    <View style={bar.track}>
      <Animated.View style={[bar.fill, { width, backgroundColor: color }]} />
    </View>
  );
};

// ─── Impact score ring ────────────────────────────────────────────────────────

const ScoreRing = ({ score, color }: { score: number; color: string }) => {
  const { theme: T } = useTheme();
  return (
    <View style={[ring.wrap, { borderColor: color + "40" }]}>
      <LinearGradient colors={[color + "30", color + "10"]} style={ring.bg} />
      <Text style={[ring.score, { color }]}>{score}</Text>
      <Text style={[ring.label, { color: T.textMuted }]}>Impact</Text>
    </View>
  );
};

// ─── Section header ───────────────────────────────────────────────────────────

const SectionHeader = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) => {
  const { theme: T } = useTheme();
  return (
    <View style={sh.wrap}>
      <View style={[sh.accent, { backgroundColor: Accent.violet500 }]} />
      <View>
        <Text style={[sh.title, { color: T.textPrimary }]}>{title}</Text>
        {subtitle && (
          <Text style={[sh.sub, { color: T.textMuted }]}>{subtitle}</Text>
        )}
      </View>
    </View>
  );
};

// ─── Timeline bar ─────────────────────────────────────────────────────────────

const TimelineBar = ({
  item,
  delay,
}: {
  item: (typeof TIMELINE_DATA)[0];
  delay: number;
}) => {
  const { theme: T } = useTheme();
  const heightAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(heightAnim, {
      toValue: item.height,
      delay,
      useNativeDriver: false,
      speed: 12,
      bounciness: 6,
    }).start();
  }, []);
  return (
    <View style={tl.colWrap}>
      {item.count > 0 && (
        <Text style={[tl.count, { color: Accent.violet400 }]}>
          {item.count}
        </Text>
      )}
      <Animated.View
        style={{
          height: heightAnim,
          overflow: "hidden",
          borderRadius: 6,
          width: 22,
        }}
      >
        <LinearGradient
          colors={
            item.count > 1
              ? Accent.gradAI
              : [Accent.violet500, Accent.violet600]
          }
          style={{ flex: 1, borderRadius: 6 }}
        />
      </Animated.View>
      <View style={[tl.base, { backgroundColor: T.border }]} />
    </View>
  );
};

// ─── Policy card ──────────────────────────────────────────────────────────────

const PolicyCard = ({
  policy,
  delay,
  onPress,
}: {
  policy: Policy;
  delay: number;
  onPress: () => void;
}) => {
  const { theme: T } = useTheme();
  const meta = DOMAIN_META[policy.domain];
  const sMeta = STATUS_META[policy.status];
  const anim = useFadeSlide(delay);
  const scale = useRef(new Animated.Value(1)).current;

  const onIn = () =>
    Animated.spring(scale, {
      toValue: 0.975,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();
  const onOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 6,
    }).start();

  const trendColor =
    policy.trend === "up"
      ? Accent.green
      : policy.trend === "down"
        ? Accent.danger
        : Accent.violet400;
  const trendIcon: keyof typeof Ionicons.glyphMap =
    policy.trend === "up"
      ? "arrow-up"
      : policy.trend === "down"
        ? "arrow-down"
        : "remove";

  return (
    <Animated.View style={[{ transform: [{ scale }] }, anim]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onIn}
        onPressOut={onOut}
        activeOpacity={1}
        style={[pc.card, { backgroundColor: T.bgCard, borderColor: T.border }]}
      >
        <View style={[pc.stripe, { backgroundColor: meta.color }]} />
        <View style={pc.content}>
          {/* Top */}
          <View style={pc.topRow}>
            <View style={[pc.domainBadge, { backgroundColor: meta.light }]}>
              <Ionicons name={meta.icon as any} size={11} color={meta.color} />
              <Text style={[pc.domainText, { color: meta.color }]}>
                {policy.domain}
              </Text>
            </View>
            <View style={pc.topRight}>
              <View style={[pc.statusBadge, { backgroundColor: sMeta.bg }]}>
                <Text style={[pc.statusText, { color: sMeta.color }]}>
                  {policy.status}
                </Text>
              </View>
              <View
                style={[pc.trendPill, { backgroundColor: trendColor + "18" }]}
              >
                <Ionicons name={trendIcon} size={10} color={trendColor} />
                <Text style={[pc.trendText, { color: trendColor }]}>
                  {policy.trendVal}
                </Text>
              </View>
            </View>
          </View>

          {/* Title */}
          <Text style={[pc.title, { color: T.textPrimary }]}>
            {policy.title}
          </Text>
          <Text style={[pc.id, { color: Accent.violet400 }]}>
            {policy.id} · {policy.date}
          </Text>
          <Text
            style={[pc.summary, { color: T.textSecondary }]}
            numberOfLines={2}
          >
            {policy.summary}
          </Text>

          {/* Footer */}
          <View style={pc.footer}>
            <View style={{ flex: 1 }}>
              <View style={pc.barLabelRow}>
                <Text style={[pc.barLabel, { color: T.textMuted }]}>
                  Impact Score
                </Text>
                <Text style={[pc.barValue, { color: meta.color }]}>
                  {policy.impactScore}/100
                </Text>
              </View>
              <AnimatedBar
                value={policy.impactScore}
                color={meta.color}
                delay={delay + 200}
              />
            </View>
            <View
              style={[
                pc.reachPill,
                { backgroundColor: T.bgCard2, borderColor: T.border },
              ]}
            >
              <Ionicons name="people-outline" size={11} color={T.textMuted} />
              <Text style={[pc.reachText, { color: T.textSecondary }]}>
                {policy.citizenReach}
              </Text>
            </View>
            <View style={[pc.chevron, { backgroundColor: T.bgCard2 }]}>
              <Ionicons
                name="arrow-forward"
                size={14}
                color={Accent.violet400}
              />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Filter tab ───────────────────────────────────────────────────────────────

const FilterTab = ({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) => {
  const { theme: T } = useTheme();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
      {active ? (
        <LinearGradient
          colors={Accent.gradAI}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={ft.chip}
        >
          <Text style={ft.activeText}>{label}</Text>
        </LinearGradient>
      ) : (
        <View
          style={[
            ft.chip,
            {
              backgroundColor: T.bgCard,
              borderWidth: 1,
              borderColor: T.border,
            },
          ]}
        >
          <Text style={[ft.idleText, { color: T.textMuted }]}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────

const FILTERS = [
  "All",
  "Active",
  "Proposed",
  "Under Review",
  "Amended",
] as const;
type Filter = (typeof FILTERS)[number];

export default function InsightsScreen({
  onSelectPolicy,
}: InsightsScreenProps) {
  const { theme: T } = useTheme();
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<Filter>("All");
  const [query, setQuery] = useState("");
  const inputRef = useRef<TextInput>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return POLICIES.filter((p) => {
      const matchesStatus = activeFilter === "All" || p.status === activeFilter;
      const matchesQuery =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.domain.toLowerCase().includes(q) ||
        p.ministry.toLowerCase().includes(q) ||
        p.summary.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q));
      return matchesStatus && matchesQuery;
    });
  }, [query, activeFilter]);

  const avgImpact = Math.round(
    POLICIES.reduce((s, p) => s + p.impactScore, 0) / POLICIES.length,
  );
  const activeCount = POLICIES.filter((p) => p.status === "Active").length;
  const topPolicy = POLICIES[0]; // highest impact score

  return (
    <View style={[is.root, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.statusBar} />

      {T.isDark && (
        <>
          <View style={is.glow1} />
          <View style={is.glow2} />
        </>
      )}

      <ScrollView
        contentContainerStyle={[
          is.scroll,
          { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Page header ── */}
        <Animated.View style={[is.pageHeader, useFadeSlide(0)]}>
          <View>
            <Text style={[is.pageLabel, { color: T.textMuted }]}>
              GOVERNMENT OF INDIA
            </Text>
            <Text style={[is.pageTitle, { color: T.textPrimary }]}>
              Policy Insights
            </Text>
          </View>
          <LinearGradient colors={Accent.gradAI} style={is.headerIcon}>
            <Ionicons name="stats-chart" size={18} color="#fff" />
          </LinearGradient>
        </Animated.View>

        {/* ── Search bar ── */}
        <Animated.View style={[is.searchWrap, useFadeSlide(40)]}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => inputRef.current?.focus()}
            style={[
              is.searchBar,
              { backgroundColor: T.inputBg, borderColor: T.borderStrong },
            ]}
          >
            <Ionicons name="search-outline" size={18} color={T.textMuted} />
            <TextInput
              ref={inputRef}
              style={[is.searchInput, { color: T.textPrimary }]}
              placeholder="Search policies, domains, ministries…"
              placeholderTextColor={T.textMuted}
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              autoCorrect={false}
            />
            {query.length > 0 && (
              <TouchableOpacity
                onPress={() => setQuery("")}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={18} color={T.textMuted} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
          {query.length > 0 && (
            <View style={is.searchResultBadge}>
              <LinearGradient
                colors={Accent.gradAI}
                style={is.searchResultGrad}
              >
                <Text style={is.searchResultText}>
                  {filtered.length} result{filtered.length !== 1 ? "s" : ""}
                </Text>
              </LinearGradient>
            </View>
          )}
        </Animated.View>

        {/* ── Summary cards ── */}
        <Animated.View style={[is.summaryRow, useFadeSlide(80)]}>
          <LinearGradient
            colors={T.isDark ? ["#1e0d40", "#110720"] : ["#ede9fe", "#ddd6fe"]}
            style={[is.summaryCard, { borderColor: T.borderStrong }]}
          >
            <View
              style={[
                is.summaryIconWrap,
                { backgroundColor: "rgba(139,92,246,0.2)" },
              ]}
            >
              <Ionicons
                name="document-text-outline"
                size={18}
                color={Accent.violet400}
              />
            </View>
            <Text style={[is.summaryVal, { color: T.textPrimary }]}>
              {POLICIES.length}
            </Text>
            <Text style={[is.summaryLabel, { color: T.textMuted }]}>
              Total Policies
            </Text>
          </LinearGradient>

          <LinearGradient
            colors={T.isDark ? ["#0d2818", "#061410"] : ["#d1fae5", "#ecfdf5"]}
            style={[is.summaryCard, { borderColor: "rgba(16,185,129,0.2)" }]}
          >
            <View
              style={[
                is.summaryIconWrap,
                { backgroundColor: "rgba(16,185,129,0.2)" },
              ]}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={18}
                color="#10b981"
              />
            </View>
            <Text style={[is.summaryVal, { color: T.textPrimary }]}>
              {activeCount}
            </Text>
            <Text style={[is.summaryLabel, { color: T.textMuted }]}>
              Active
            </Text>
          </LinearGradient>

          <LinearGradient
            colors={T.isDark ? ["#2d1060", "#180830"] : ["#ede9fe", "#ddd6fe"]}
            style={[is.summaryCard, { borderColor: "rgba(217,70,239,0.2)" }]}
          >
            <View
              style={[
                is.summaryIconWrap,
                { backgroundColor: "rgba(217,70,239,0.2)" },
              ]}
            >
              <Ionicons name="flash-outline" size={18} color={Accent.fuchsia} />
            </View>
            <Text style={[is.summaryVal, { color: T.textPrimary }]}>
              {avgImpact}
            </Text>
            <Text style={[is.summaryLabel, { color: T.textMuted }]}>
              Avg Impact
            </Text>
          </LinearGradient>

          <LinearGradient
            colors={T.isDark ? ["#0d1a2d", "#060e1c"] : ["#dbeafe", "#eff6ff"]}
            style={[is.summaryCard, { borderColor: "rgba(59,130,246,0.2)" }]}
          >
            <View
              style={[
                is.summaryIconWrap,
                { backgroundColor: "rgba(59,130,246,0.2)" },
              ]}
            >
              <Ionicons name="people-outline" size={18} color="#3b82f6" />
            </View>
            <Text style={[is.summaryVal, { color: T.textPrimary }]}>37Cr+</Text>
            <Text style={[is.summaryLabel, { color: T.textMuted }]}>Reach</Text>
          </LinearGradient>
        </Animated.View>

        {/* ── Domain breakdown ── */}
        <Animated.View style={useFadeSlide(160)}>
          <SectionHeader
            title="Domain Breakdown"
            subtitle="Policies by sector · Impact average"
          />
          <View
            style={[
              is.domainCard,
              { backgroundColor: T.bgCard, borderColor: T.border },
            ]}
          >
            <View
              style={[
                is.domainHighlight,
                {
                  backgroundColor: T.isDark
                    ? "rgba(196,181,253,0.07)"
                    : "rgba(109,40,217,0.04)",
                },
              ]}
            />
            {DOMAIN_STATS.map((d, i) => (
              <View
                key={d.domain}
                style={[
                  is.domainRow,
                  i < DOMAIN_STATS.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: T.border,
                  },
                ]}
              >
                <View
                  style={[is.domainIcon, { backgroundColor: d.color + "20" }]}
                >
                  <Ionicons name={d.icon as any} size={14} color={d.color} />
                </View>
                <Text style={[is.domainName, { color: T.textSecondary }]}>
                  {d.domain}
                </Text>
                <View style={is.domainBarWrap}>
                  <AnimatedBar
                    value={d.avgImpact}
                    color={d.color}
                    delay={200 + i * 80}
                  />
                </View>
                <Text style={[is.domainScore, { color: d.color }]}>
                  {d.avgImpact}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* ── Timeline ── */}
        <Animated.View style={useFadeSlide(300)}>
          <SectionHeader
            title="2024 Policy Activity"
            subtitle="Policies introduced per month"
          />
          <View
            style={[
              is.timelineCard,
              { backgroundColor: T.bgCard, borderColor: T.border },
            ]}
          >
            <View
              style={[
                is.domainHighlight,
                {
                  backgroundColor: T.isDark
                    ? "rgba(196,181,253,0.07)"
                    : "rgba(109,40,217,0.04)",
                },
              ]}
            />
            <View style={is.chartRow}>
              {TIMELINE_DATA.map((item, i) => (
                <View key={item.month} style={is.chartCol}>
                  <TimelineBar item={item} delay={320 + i * 60} />
                  <Text style={[is.chartLabel, { color: T.textMuted }]}>
                    {item.month}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>

        {/* ── Spotlight ── */}
        <Animated.View style={useFadeSlide(400)}>
          <SectionHeader
            title="Top Impact Policy"
            subtitle="Highest citizen impact score this quarter"
          />
          <TouchableOpacity
            onPress={() => onSelectPolicy(topPolicy)}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={
                T.isDark
                  ? ["#2d1060", "#1a0d40", "#0f0720"]
                  : ["#ddd6fe", "#ede9fe", "#f5f3ff"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[is.spotlightCard, { borderColor: T.borderStrong }]}
            >
              <View
                style={[
                  is.spotShimmer,
                  {
                    backgroundColor: T.isDark
                      ? "rgba(196,181,253,0.12)"
                      : "rgba(109,40,217,0.08)",
                  },
                ]}
              />
              <View style={is.spotTop}>
                <LinearGradient
                  colors={["#8b5cf6", "#a855f7"]}
                  style={is.spotIcon}
                >
                  <Ionicons
                    name={DOMAIN_META[topPolicy.domain].icon as any}
                    size={20}
                    color="#fff"
                  />
                </LinearGradient>
                <View
                  style={[
                    is.spotBadge,
                    { backgroundColor: "rgba(139,92,246,0.25)" },
                  ]}
                >
                  <Ionicons name="trophy" size={11} color={Accent.violet300} />
                  <Text style={[is.spotBadgeText, { color: Accent.violet300 }]}>
                    Highest Impact
                  </Text>
                </View>
              </View>
              <Text style={[is.spotTitle, { color: T.textPrimary }]}>
                {topPolicy.title}
              </Text>
              <Text style={[is.spotId, { color: Accent.violet400 }]}>
                {topPolicy.id} · {topPolicy.domain} · {topPolicy.date}
              </Text>
              <Text style={[is.spotSummary, { color: T.textSecondary }]}>
                {topPolicy.summary}
              </Text>
              <View style={is.spotFooter}>
                <ScoreRing
                  score={topPolicy.impactScore}
                  color={Accent.violet400}
                />
                <View style={is.spotStats}>
                  <View
                    style={[
                      is.spotStatRow,
                      { borderBottomWidth: 1, borderBottomColor: T.border },
                    ]}
                  >
                    <Text style={[is.spotStatLabel, { color: T.textMuted }]}>
                      Citizen Reach
                    </Text>
                    <Text style={[is.spotStatVal, { color: T.textPrimary }]}>
                      {topPolicy.citizenReach}
                    </Text>
                  </View>
                  <View style={is.spotStatRow}>
                    <Text style={[is.spotStatLabel, { color: T.textMuted }]}>
                      Trend
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Ionicons
                        name="arrow-up"
                        size={12}
                        color={Accent.green}
                      />
                      <Text style={[is.spotStatVal, { color: Accent.green }]}>
                        {topPolicy.trendVal} this quarter
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
              {/* Tap to view hint */}
              <View
                style={[
                  is.spotTapHint,
                  {
                    backgroundColor: T.isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(109,40,217,0.07)",
                  },
                ]}
              >
                <Text style={[is.spotTapText, { color: T.textMuted }]}>
                  Tap to view details
                </Text>
                <Ionicons name="arrow-forward" size={13} color={T.textMuted} />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* ── Filter tabs ── */}
        <Animated.View style={[is.filterRow, useFadeSlide(460)]}>
          {FILTERS.map((f) => (
            <FilterTab
              key={f}
              label={f}
              active={activeFilter === f}
              onPress={() => setActiveFilter(f)}
            />
          ))}
        </Animated.View>

        {/* ── Policy list ── */}
        <View style={is.policyList}>
          <SectionHeader
            title={query ? "Search Results" : "All Policies"}
            subtitle={
              query
                ? `${filtered.length} result${filtered.length !== 1 ? "s" : ""} for "${query}"`
                : `${filtered.length} polic${filtered.length !== 1 ? "ies" : "y"} · ${activeFilter}`
            }
          />
          {filtered.length === 0 ? (
            <View style={is.emptyState}>
              <LinearGradient colors={Accent.gradAI} style={is.emptyIcon}>
                <Ionicons name="search" size={26} color="#fff" />
              </LinearGradient>
              <Text style={[is.emptyTitle, { color: T.textPrimary }]}>
                No policies found
              </Text>
              <Text style={[is.emptyDesc, { color: T.textMuted }]}>
                Try a different search term or filter
              </Text>
            </View>
          ) : (
            filtered.map((policy, i) => (
              <PolicyCard
                key={policy.id}
                policy={policy}
                delay={480 + i * 60}
                onPress={() => onSelectPolicy(policy)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const is = StyleSheet.create({
  root: { flex: 1 },
  glow1: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(109,40,217,0.13)",
  },
  glow2: {
    position: "absolute",
    bottom: 200,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(217,70,239,0.07)",
  },

  scroll: { paddingHorizontal: 16 },

  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  pageLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 3,
  },
  pageTitle: { fontSize: 28, fontWeight: "900", letterSpacing: -0.8 },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#7c3aed",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },

  summaryRow: { flexDirection: "row", gap: 8, marginBottom: 24 },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 11,
    alignItems: "center",
    gap: 5,
    ...Platform.select({
      ios: {
        shadowColor: "#4c1d95",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
      },
      android: { elevation: 3 },
    }),
  },
  summaryIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  summaryVal: { fontSize: 16, fontWeight: "900", letterSpacing: -0.5 },
  summaryLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
    textAlign: "center",
  },

  domainCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 24,
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
  domainHighlight: {
    position: "absolute",
    top: 0,
    left: 20,
    right: 20,
    height: 1,
    borderRadius: 99,
  },
  domainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  domainIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  domainName: { fontSize: 12, fontWeight: "600", width: 80 },
  domainBarWrap: { flex: 1 },
  domainScore: {
    fontSize: 13,
    fontWeight: "800",
    width: 28,
    textAlign: "right",
  },

  timelineCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    padding: 16,
    marginBottom: 24,
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
  chartRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 100,
    paddingTop: 12,
  },
  chartCol: { alignItems: "center", gap: 6, flex: 1 },
  chartLabel: { fontSize: 9, fontWeight: "600", letterSpacing: 0.3 },

  spotlightCard: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 24,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#6d28d9",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 24,
      },
      android: { elevation: 10 },
    }),
  },
  spotShimmer: {
    position: "absolute",
    top: 0,
    left: 24,
    right: 24,
    height: 1,
    borderRadius: 99,
  },
  spotTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  spotIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  spotBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
  },
  spotBadgeText: { fontSize: 11, fontWeight: "700" },
  spotTitle: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  spotId: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    marginBottom: 12,
  },
  spotSummary: { fontSize: 13, lineHeight: 20, marginBottom: 16 },
  spotFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 14,
  },
  spotStats: { flex: 1, gap: 8 },
  spotStatRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 8,
  },
  spotStatLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.3 },
  spotStatVal: { fontSize: 13, fontWeight: "700" },
  spotTapHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
  },
  spotTapText: { fontSize: 12, fontWeight: "600" },

  filterRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 20,
  },
  policyList: { gap: 12 },

  searchWrap: { marginBottom: 20, gap: 8 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0, margin: 0 },
  searchResultBadge: { alignSelf: "flex-start" },
  searchResultGrad: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 99,
  },
  searchResultText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.2,
  },

  emptyState: { alignItems: "center", paddingVertical: 48, gap: 12 },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: { fontSize: 17, fontWeight: "700" },
  emptyDesc: { fontSize: 13, textAlign: "center", lineHeight: 19 },
});

const bar = StyleSheet.create({
  track: {
    height: 6,
    backgroundColor: "rgba(139,92,246,0.1)",
    borderRadius: 99,
    overflow: "hidden",
  },
  fill: { height: 6, borderRadius: 99 },
});

const ring = StyleSheet.create({
  wrap: {
    width: 70,
    height: 70,
    borderRadius: 20,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  bg: { ...StyleSheet.absoluteFillObject },
  score: { fontSize: 22, fontWeight: "900", letterSpacing: -1 },
  label: { fontSize: 9, fontWeight: "700", letterSpacing: 0.5 },
});

const sh = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  accent: { width: 4, height: 20, borderRadius: 2 },
  title: { fontSize: 16, fontWeight: "800", letterSpacing: -0.3 },
  sub: { fontSize: 11, marginTop: 1, letterSpacing: 0.2 },
});

const tl = StyleSheet.create({
  colWrap: {
    alignItems: "center",
    justifyContent: "flex-end",
    flex: 1,
    gap: 3,
  },
  count: { fontSize: 9, fontWeight: "800" },
  base: { height: 2, width: 22, borderRadius: 1 },
});

const pc = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#4c1d95",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.1,
        shadowRadius: 14,
      },
      android: { elevation: 4 },
    }),
  },
  stripe: { width: 4 },
  content: { flex: 1, padding: 14 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  topRight: { flexDirection: "row", alignItems: "center", gap: 6 },

  domainBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
  },
  domainText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.3 },
  statusBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 99 },
  statusText: { fontSize: 10, fontWeight: "700" },
  trendPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 99,
  },
  trendText: { fontSize: 10, fontWeight: "700" },

  title: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  id: { fontSize: 11, fontWeight: "700", letterSpacing: 0.4, marginBottom: 8 },
  summary: { fontSize: 12, lineHeight: 18, marginBottom: 12 },

  footer: { flexDirection: "row", alignItems: "center", gap: 8 },
  barLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  barLabel: { fontSize: 10, fontWeight: "600" },
  barValue: { fontSize: 10, fontWeight: "800" },
  reachPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  reachText: { fontSize: 11, fontWeight: "600" },
  chevron: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
});

const ft = StyleSheet.create({
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99 },
  activeText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  idleText: { fontSize: 12, fontWeight: "600" },
});
