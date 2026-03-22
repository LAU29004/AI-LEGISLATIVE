import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Bill, BillStatus, TagType } from "../constants/data";
import { COLORS, FONT, RADIUS, SHADOW, SPACING } from "../constants/theme";

// ── Tag Chip ──────────────────────────────────────────────────────────────────
export function TagChip({ tag }: { tag: TagType }) {
  const colorMap: Record<TagType, { bg: string; text: string }> = {
    Privacy: COLORS.tagPrivacy,
    Finance: COLORS.tagFinance,
    Tech: COLORS.tagHealth,
    Healthcare: COLORS.tagHealth,
    Environment: COLORS.tagEnvironment,
    General: COLORS.tagGeneral,
  };
  const color = colorMap[tag] ?? COLORS.tagGeneral;
  return (
    <View style={[styles.chip, { backgroundColor: color.bg }]}>
      <Text style={[styles.chipText, { color: color.text }]}>{tag}</Text>
    </View>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────
export function StatusBadge({ status }: { status: BillStatus }) {
  const colorMap: Record<BillStatus, { bg: string; text: string }> = {
    Passed: { bg: COLORS.successLight, text: COLORS.success },
    "In Review": { bg: COLORS.warningLight, text: COLORS.warning },
    Introduced: { bg: COLORS.primaryLight, text: COLORS.primary },
    Committee: { bg: COLORS.purpleLight, text: COLORS.purple },
  };
  const color = colorMap[status];
  return (
    <View style={[styles.badge, { backgroundColor: color.bg }]}>
      <Text style={[styles.badgeText, { color: color.text }]}>{status}</Text>
    </View>
  );
}

// ── Bill Card ─────────────────────────────────────────────────────────────────
interface BillCardProps {
  bill: Bill;
  showNumber?: boolean;
  onPress?: () => void;
}

export function BillCard({ bill, showNumber = false, onPress }: BillCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.75}
      onPress={onPress}
    >
      {showNumber && (
        <Text style={styles.billNumber}>Bill No. {bill.number}</Text>
      )}
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {bill.title}
        </Text>
        <StatusBadge status={bill.status} />
      </View>
      <Text style={styles.cardSummary} numberOfLines={3}>
        {bill.summary}
      </Text>
      <View style={styles.cardFooter}>
        <View style={styles.tagRow}>
          {bill.tags.map((t) => (
            <TagChip key={t} tag={t} />
          ))}
        </View>
        <Text style={styles.dateText}>{bill.date}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Search Bar ────────────────────────────────────────────────────────────────
interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
}

export function SearchBar({
  placeholder = "Search...",
  value,
  onChangeText,
}: SearchBarProps) {
  return (
    <View style={styles.searchBar}>
      <Text style={styles.searchIcon}>⌕</Text>
      <Text style={styles.searchPlaceholder}>{placeholder}</Text>
    </View>
  );
}

// ── Section Header ────────────────────────────────────────────────────────────
export function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
    </View>
  );
}

// ── Primary Button ────────────────────────────────────────────────────────────
interface PrimaryButtonProps {
  label: string;
  onPress?: () => void;
  icon?: string;
  variant?: "filled" | "outline";
}

export function PrimaryButton({
  label,
  onPress,
  icon,
  variant = "filled",
}: PrimaryButtonProps) {
  const isFilled = variant === "filled";
  return (
    <TouchableOpacity
      style={[
        styles.button,
        isFilled ? styles.buttonFilled : styles.buttonOutline,
        isFilled && SHADOW.button,
      ]}
      activeOpacity={0.8}
      onPress={onPress}
    >
      {icon && (
        <Text
          style={[styles.buttonIcon, !isFilled && { color: COLORS.primary }]}
        >
          {icon}
        </Text>
      )}
      <Text
        style={[styles.buttonLabel, !isFilled && { color: COLORS.primary }]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Tag chip
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  chipText: {
    fontSize: 10,
    fontWeight: FONT.semibold,
  },

  // Status badge
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    flexShrink: 0,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: FONT.bold,
  },

  // Bill card
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    ...SHADOW.card,
  },
  billNumber: {
    fontSize: 10,
    fontWeight: FONT.semibold,
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: SPACING.xs,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  cardTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: FONT.bold,
    color: COLORS.textPrimary,
    lineHeight: 19,
  },
  cardSummary: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: SPACING.md,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tagRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
    flex: 1,
  },
  dateText: {
    fontSize: 11,
    color: COLORS.textMuted,
    flexShrink: 0,
  },

  // Search bar
  searchBar: {
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  searchIcon: {
    fontSize: 16,
    color: COLORS.textMuted,
  },
  searchPlaceholder: {
    fontSize: 14,
    color: COLORS.textMuted,
  },

  // Section header
  sectionHeader: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: FONT.bold,
    color: COLORS.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  // Button
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: RADIUS.lg,
  },
  buttonFilled: {
    backgroundColor: COLORS.primary,
  },
  buttonOutline: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  buttonIcon: {
    fontSize: 16,
    color: COLORS.textWhite,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: FONT.semibold,
    color: COLORS.textWhite,
  },
});
