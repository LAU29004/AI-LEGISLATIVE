// screens/ExploreScreen.tsx — Search & Browse Indian Parliamentary Bills
// Static BILLS/CATEGORIES replaced with live fetchBills() from API

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
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
import { ApiBill, fetchBills } from "../services/api";

// ─── Local Bill type (mapped from ApiBill for UI) ─────────────────────────────
// The UI only needs a subset of fields; we derive display values from ApiBill.

type BillStatus = "Introduced" | "Passed" | "Pending" | "Withdrawn";

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

// Derive a human-readable compression string e.g. "4.2x"
function compressionLabel(ratio: number): string {
  return ratio > 0 ? `${ratio.toFixed(1)}x` : "—";
}

// Derive a token count string e.g. "84k"
function tokenLabel(tokens: number): string {
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(0)}k`;
  return String(tokens);
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ExploreScreenProps {
  onSelectBill: (bill: ApiBill) => void;
}

// ─── Category chip ────────────────────────────────────────────────────────────
// We no longer have a category taxonomy from the backend, so we filter by
// status instead ("All" | "Introduced" | "Passed" | "Pending").

const FILTERS = ["All", "Introduced", "Passed", "Pending"] as const;
type Filter = (typeof FILTERS)[number];

const FilterChip = ({
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
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={cc.wrap}>
      {active ? (
        <LinearGradient
          colors={Accent.gradAI}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={cc.chip}
        >
          <Text style={cc.activeText}>{label}</Text>
        </LinearGradient>
      ) : (
        <View
          style={[
            cc.chip,
            {
              backgroundColor: T.bgCard,
              borderWidth: 1,
              borderColor: T.border,
            },
          ]}
        >
          <Text style={[cc.idleText, { color: T.textMuted }]}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ─── Bill card ────────────────────────────────────────────────────────────────

const BillCard = ({
  bill,
  onPress,
}: {
  bill: ApiBill;
  onPress: () => void;
}) => {
  const { theme: T } = useTheme();
  const stsMeta = getStatusMeta(bill.status);
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();
  const onPressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 6,
    }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
        style={[
          bcard.card,
          { backgroundColor: T.bgCard, borderColor: T.border },
        ]}
      >
        {/* Top row: year + status */}
        <View style={bcard.topRow}>
          {bill.year ? (
            <View
              style={[
                bcard.catBadge,
                {
                  backgroundColor: T.isDark
                    ? "rgba(139,92,246,0.15)"
                    : "rgba(109,40,217,0.08)",
                },
              ]}
            >
              <Ionicons
                name="calendar-outline"
                size={11}
                color={Accent.violet400}
              />
              <Text style={[bcard.catText, { color: Accent.violet400 }]}>
                {bill.year}
              </Text>
            </View>
          ) : null}
          <View style={[bcard.statusBadge, { backgroundColor: stsMeta.bg }]}>
            <View
              style={[bcard.statusDot, { backgroundColor: stsMeta.color }]}
            />
            <Text style={[bcard.statusText, { color: stsMeta.color }]}>
              {bill.status ?? "Unknown"}
            </Text>
          </View>
        </View>

        {/* Bill title */}
        <Text style={[bcard.name, { color: T.textPrimary }]} numberOfLines={2}>
          {bill.title}
        </Text>

        {/* Bill number */}
        <Text style={[bcard.short, { color: Accent.violet400 }]}>
          Bill No. {bill.bill_number}
        </Text>

        {/* Divider */}
        <View style={[bcard.divider, { backgroundColor: T.border }]} />

        {/* Meta row */}
        <View style={bcard.metaRow}>
          <View style={bcard.metaItem}>
            <Ionicons name="barcode-outline" size={12} color={T.textMuted} />
            <Text style={[bcard.metaText, { color: T.textMuted }]}>
              #{bill.bill_number}
            </Text>
          </View>
          <View style={bcard.metaItem}>
            <Ionicons name="layers-outline" size={12} color={T.textMuted} />
            <Text style={[bcard.metaText, { color: T.textMuted }]}>
              {tokenLabel(bill.original_tokens)} tokens
            </Text>
          </View>
        </View>

        {/* Footer: compression stats + chevron */}
        <View style={bcard.footer}>
          <View style={bcard.statsRow}>
            <View
              style={[
                bcard.statPill,
                {
                  backgroundColor: T.isDark
                    ? "rgba(139,92,246,0.12)"
                    : "rgba(109,40,217,0.07)",
                },
              ]}
            >
              <Ionicons
                name="git-merge-outline"
                size={10}
                color={Accent.violet400}
              />
              <Text style={[bcard.statPillText, { color: Accent.violet400 }]}>
                {compressionLabel(bill.compression_ratio)} compressed
              </Text>
            </View>
            <View
              style={[
                bcard.statPill,
                {
                  backgroundColor: T.isDark
                    ? "rgba(16,185,129,0.1)"
                    : "rgba(16,185,129,0.08)",
                },
              ]}
            >
              <Ionicons name="leaf-outline" size={10} color={Accent.green} />
              <Text style={[bcard.statPillText, { color: Accent.green }]}>
                {tokenLabel(bill.compressed_tokens)} stored
              </Text>
            </View>
          </View>
          <View style={[bcard.chevron, { backgroundColor: T.bgCard2 }]}>
            <Ionicons name="arrow-forward" size={14} color={Accent.violet400} />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Loading skeleton ─────────────────────────────────────────────────────────

const SkeletonCard = () => {
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
    <Animated.View
      style={[
        bcard.card,
        { backgroundColor: T.bgCard, borderColor: T.border, opacity: pulse },
      ]}
    >
      <View style={[sk.line, { width: "40%", backgroundColor: T.border }]} />
      <View
        style={[
          sk.line,
          {
            width: "90%",
            backgroundColor: T.border,
            height: 18,
            marginTop: 10,
          },
        ]}
      />
      <View
        style={[
          sk.line,
          { width: "60%", backgroundColor: T.border, marginTop: 6 },
        ]}
      />
      <View
        style={[
          sk.line,
          { width: "30%", backgroundColor: T.border, marginTop: 14 },
        ]}
      />
    </Animated.View>
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ExploreScreen({ onSelectBill }: ExploreScreenProps) {
  const { theme: T } = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<Filter>("All");
  const [bills, setBills] = useState<ApiBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  // Debounce ref so we don't fire on every keystroke
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (search: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchBills(search || undefined);
      setBills(data);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load bills");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    load("");
  }, []);

  // Debounced search when query changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(query), 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Client-side status filter (applied on top of server search results)
  const filtered = bills.filter((b) => {
    if (activeFilter === "All") return true;
    return (b.status ?? "").toLowerCase().includes(activeFilter.toLowerCase());
  });

  return (
    <View style={[es.root, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.statusBar} />

      {T.isDark && (
        <>
          <View style={es.glow1} />
          <View style={es.glow2} />
        </>
      )}

      {/* ── Sticky header ── */}
      <View
        style={[
          es.header,
          {
            paddingTop: insets.top + 14,
            backgroundColor: T.bg,
            borderBottomColor: T.border,
          },
        ]}
      >
        {/* Title row */}
        <View style={es.titleRow}>
          <View>
            <Text style={[es.pageTitle, { color: T.textPrimary }]}>
              Explore Bills
            </Text>
            <Text style={[es.pageSubtitle, { color: T.textMuted }]}>
              {loading
                ? "Loading…"
                : `${filtered.length} bill${filtered.length !== 1 ? "s" : ""} found`}
            </Text>
          </View>
          <LinearGradient colors={Accent.gradAI} style={es.titleBadge}>
            <Ionicons name="library" size={16} color="#fff" />
          </LinearGradient>
        </View>

        {/* Search bar */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => inputRef.current?.focus()}
          style={[
            es.searchBar,
            { backgroundColor: T.inputBg, borderColor: T.borderStrong },
          ]}
        >
          <Ionicons name="search-outline" size={18} color={T.textMuted} />
          <TextInput
            ref={inputRef}
            style={[es.searchInput, { color: T.textPrimary }]}
            placeholder="Search bills, acts, numbers…"
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

        {/* Status filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={es.chipsScroll}
        >
          {FILTERS.map((f) => (
            <FilterChip
              key={f}
              label={f}
              active={activeFilter === f}
              onPress={() => setActiveFilter(f)}
            />
          ))}
        </ScrollView>
      </View>

      {/* ── Error banner ── */}
      {error && (
        <View
          style={[es.errorBanner, { backgroundColor: "rgba(239,68,68,0.1)" }]}
        >
          <Ionicons name="alert-circle-outline" size={16} color="#ef4444" />
          <Text style={es.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => load(query)}>
            <Text style={[es.retryText, { color: Accent.violet400 }]}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Bill list ── */}
      {loading ? (
        <View style={[es.listContent, { paddingBottom: insets.bottom + 110 }]}>
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(b) => b.bill_number}
          renderItem={({ item }) => (
            <BillCard bill={item} onPress={() => onSelectBill(item)} />
          )}
          contentContainerStyle={[
            es.listContent,
            { paddingBottom: insets.bottom + 110 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={es.empty}>
              <LinearGradient colors={Accent.gradAI} style={es.emptyIcon}>
                <Ionicons name="search" size={28} color="#fff" />
              </LinearGradient>
              <Text style={[es.emptyTitle, { color: T.textPrimary }]}>
                No bills found
              </Text>
              <Text style={[es.emptyDesc, { color: T.textMuted }]}>
                Try a different search term or status filter
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const es = StyleSheet.create({
  root: { flex: 1 },
  glow1: {
    position: "absolute",
    top: -40,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(109,40,217,0.13)",
  },
  glow2: {
    position: "absolute",
    bottom: 200,
    left: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(217,70,239,0.07)",
  },

  header: { paddingHorizontal: 18, paddingBottom: 12, borderBottomWidth: 1 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  pageTitle: { fontSize: 26, fontWeight: "900", letterSpacing: -0.8 },
  pageSubtitle: { fontSize: 12, marginTop: 2, letterSpacing: 0.2 },
  titleBadge: {
    width: 40,
    height: 40,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0, margin: 0 },

  chipsScroll: { gap: 8, paddingRight: 4 },
  listContent: { paddingHorizontal: 16, paddingTop: 14, gap: 12 },

  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  errorText: { flex: 1, fontSize: 13, color: "#ef4444" },
  retryText: { fontSize: 13, fontWeight: "700" },

  empty: { alignItems: "center", paddingTop: 60, gap: 14 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyDesc: { fontSize: 13, textAlign: "center", lineHeight: 20 },
});

const cc = StyleSheet.create({
  wrap: {},
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 99,
  },
  activeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.2,
  },
  idleText: { fontSize: 12, fontWeight: "600", letterSpacing: 0.2 },
});

const bcard = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
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
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  catBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 99,
  },
  catText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.3 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 99,
  },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.3 },

  name: {
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  short: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  divider: { height: 1, marginBottom: 10 },

  metaRow: { flexDirection: "row", gap: 14, marginBottom: 10 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 11, letterSpacing: 0.2 },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statsRow: { flexDirection: "row", gap: 8 },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
  },
  statPillText: { fontSize: 10, fontWeight: "600" },
  chevron: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
});

const sk = StyleSheet.create({
  line: { height: 12, borderRadius: 6 },
});
