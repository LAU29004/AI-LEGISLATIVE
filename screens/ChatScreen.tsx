// screens/ChatScreen.tsx  (API-connected version)

import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
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
import { Policy } from "../data/Policies";
import {
  ApiBill,
  ChatResponse,
  sendChat,
  triggerIngest,
  uploadPdf,
  UploadPdfResponse,
} from "../services/api";

const { width: SW } = Dimensions.get("window");

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = "user" | "ai";
interface Attachment {
  name: string;
  size: string;
  uri?: string;
}
interface Message {
  id: string;
  role: Role;
  text: string;
  time: string;
  attachment?: Attachment;
  sources?: ChatResponse["sources"];
  billsUsed?: { bill_number: string; title: string }[];
  compressionRatio?: number;
  sectionsFound?: string[];
}

// In-memory history store: bill_number (or "general") → Message[]
const historyStore: Record<string, Message[]> = {};

// ─── Props ────────────────────────────────────────────────────────────────────

interface ChatScreenProps {
  onBack?: () => void;
  initialBill?: ApiBill;
  initialPolicy?: Policy;
}

// ─── Typing dots ──────────────────────────────────────────────────────────────

const TypingDots = () => {
  const d0 = useRef(new Animated.Value(0)).current;
  const d1 = useRef(new Animated.Value(0)).current;
  const d2 = useRef(new Animated.Value(0)).current;
  const { theme: T } = useTheme();

  useEffect(() => {
    const mk = (d: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(d, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(d, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.delay(420 - delay),
        ]),
      );
    const a = Animated.parallel([mk(d0, 0), mk(d1, 140), mk(d2, 280)]);
    a.start();
    return () => a.stop();
  }, []);

  return (
    <View style={ts.wrap}>
      <LinearGradient colors={Accent.gradAI} style={ts.avatar}>
        <Ionicons name="sparkles" size={10} color="#fff" />
      </LinearGradient>
      <View style={ts.bubble}>
        {[d0, d1, d2].map((d, i) => (
          <Animated.View
            key={i}
            style={[
              ts.dot,
              {
                opacity: d,
                transform: [
                  {
                    translateY: d.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -4],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
};

// ─── Token report card ────────────────────────────────────────────────────────

const PIPELINE_STEPS = [
  { step: "L1 Strip", desc: "Boilerplate removed" },
  { step: "L2 Dedup", desc: "Semantic deduplication" },
  { step: "L3 Extract", desc: "TF-IDF key sentences" },
  { step: "L4 Classify", desc: "Section classification" },
  { step: "ChromaDB", desc: "Vector similarity search" },
  { step: "Chain-of-Density", desc: "Context densification" },
  { step: "LLM Answer", desc: "Strong model responds" },
];

const TokenReport = ({
  sources,
  billsUsed,
  compressionRatio,
  sectionsFound,
}: {
  sources?: ChatResponse["sources"];
  billsUsed?: { bill_number: string; title: string }[];
  compressionRatio?: number;
  sectionsFound?: string[];
}) => {
  const { theme: T } = useTheme();
  const [open, setOpen] = useState(false);

  const hasBills = billsUsed && billsUsed.length > 0;
  const uniqueSections =
    sources && sources.length > 0
      ? [...new Set(sources.map((s) => s.section.replace(/[\[\]]/g, "")))]
      : (sectionsFound ?? []);

  if (!hasBills && uniqueSections.length === 0) return null;

  return (
    <TouchableOpacity
      onPress={() => setOpen((v) => !v)}
      activeOpacity={0.85}
      style={[tr.card, { backgroundColor: T.bgCard, borderColor: T.border }]}
    >
      {/* Header */}
      <View style={tr.headerRow}>
        <LinearGradient colors={["#059669", "#10b981"]} style={tr.icon}>
          <Ionicons name="git-merge-outline" size={12} color="#fff" />
        </LinearGradient>
        <Text style={[tr.label, { color: Accent.green }]}>
          Token Compression Report
        </Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={13}
          color={T.textMuted}
        />
      </View>

      {/* Collapsed pills */}
      {!open && (
        <View style={tr.pills}>
          {compressionRatio && compressionRatio > 0 ? (
            <View
              style={[tr.pill, { backgroundColor: "rgba(16,185,129,0.15)" }]}
            >
              <Ionicons name="layers-outline" size={10} color={Accent.green} />
              <Text style={[tr.pillText, { color: Accent.green }]}>
                {compressionRatio.toFixed(1)}x compressed
              </Text>
            </View>
          ) : null}
          {uniqueSections.length > 0 && (
            <View
              style={[tr.pill, { backgroundColor: "rgba(139,92,246,0.15)" }]}
            >
              <Ionicons
                name="document-text-outline"
                size={10}
                color={Accent.violet400}
              />
              <Text style={[tr.pillText, { color: Accent.violet400 }]}>
                {uniqueSections.length} section
                {uniqueSections.length !== 1 ? "s" : ""} used
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Expanded detail */}
      {open && (
        <View style={tr.body}>
          {/* Bills matched */}
          {hasBills && (
            <View style={tr.block}>
              <Text style={[tr.blockLabel, { color: T.textMuted }]}>
                Bills matched
              </Text>
              {billsUsed!.map((b) => (
                <View
                  key={b.bill_number}
                  style={[tr.billRow, { borderBottomColor: T.border }]}
                >
                  <View
                    style={[tr.billDot, { backgroundColor: Accent.violet400 }]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[tr.billTitle, { color: T.textPrimary }]}
                      numberOfLines={1}
                    >
                      {b.title}
                    </Text>
                    <Text style={[tr.billNum, { color: T.textMuted }]}>
                      Bill #{b.bill_number}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Compression ratio */}
          {compressionRatio && compressionRatio > 0 ? (
            <View
              style={[
                tr.block,
                { borderTopWidth: 1, borderTopColor: T.border, paddingTop: 10 },
              ]}
            >
              <Text style={[tr.blockLabel, { color: T.textMuted }]}>
                Compression
              </Text>
              <View style={tr.statRow}>
                <View
                  style={[
                    tr.statPill,
                    { backgroundColor: "rgba(16,185,129,0.15)" },
                  ]}
                >
                  <Ionicons
                    name="git-merge-outline"
                    size={11}
                    color={Accent.green}
                  />
                  <Text style={[tr.statVal, { color: Accent.green }]}>
                    {compressionRatio.toFixed(1)}x smaller
                  </Text>
                </View>
                <Text style={[tr.statNote, { color: T.textMuted }]}>
                  vs raw PDF tokens
                </Text>
              </View>
            </View>
          ) : null}

          {/* Sections */}
          {uniqueSections.length > 0 && (
            <View
              style={[
                tr.block,
                { borderTopWidth: 1, borderTopColor: T.border, paddingTop: 10 },
              ]}
            >
              <Text style={[tr.blockLabel, { color: T.textMuted }]}>
                Sections retrieved from ChromaDB
              </Text>
              <View style={tr.sectionChips}>
                {uniqueSections.map((s) => (
                  <View
                    key={s}
                    style={[
                      tr.sectionChip,
                      {
                        backgroundColor: "rgba(139,92,246,0.12)",
                        borderColor: T.borderStrong,
                      },
                    ]}
                  >
                    <Text
                      style={[tr.sectionChipText, { color: Accent.violet300 }]}
                    >
                      {s.toLowerCase().replace(/_/g, " ")}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Pipeline steps */}
          <View
            style={[
              tr.block,
              { borderTopWidth: 1, borderTopColor: T.border, paddingTop: 10 },
            ]}
          >
            <Text style={[tr.blockLabel, { color: T.textMuted }]}>
              Pipeline
            </Text>
            {PIPELINE_STEPS.map((p, i) => (
              <View key={p.step} style={tr.pipelineRow}>
                <View
                  style={[
                    tr.pipelineNum,
                    { backgroundColor: Accent.violet500 + "40" },
                  ]}
                >
                  <Text
                    style={[tr.pipelineNumText, { color: Accent.violet300 }]}
                  >
                    {i + 1}
                  </Text>
                </View>
                <Text style={[tr.pipelineStep, { color: T.textPrimary }]}>
                  {p.step}
                </Text>
                <Text style={[tr.pipelineDesc, { color: T.textMuted }]}>
                  {p.desc}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ─── Message bubble ───────────────────────────────────────────────────────────

const Bubble = ({ msg }: { msg: Message }) => {
  const { theme: T } = useTheme();
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 240,
        useNativeDriver: true,
      }),
      Animated.spring(slide, {
        toValue: 0,
        useNativeDriver: true,
        speed: 26,
        bounciness: 6,
      }),
    ]).start();
  }, []);

  const isUser = msg.role === "user";
  return (
    <Animated.View
      style={{ opacity: fade, transform: [{ translateY: slide }] }}
    >
      <View style={[bs.row, isUser ? bs.rowUser : bs.rowAI]}>
        {!isUser && (
          <LinearGradient colors={Accent.gradAI} style={bs.aiAvatar}>
            <Ionicons name="sparkles" size={12} color="#fff" />
          </LinearGradient>
        )}
        <View style={[bs.wrap, isUser ? bs.wrapUser : bs.wrapAI]}>
          {msg.attachment && (
            <View style={ap.pill}>
              <LinearGradient
                colors={["rgba(124,58,237,0.3)", "rgba(168,85,247,0.15)"]}
                style={ap.grad}
              >
                <Ionicons
                  name="document-text"
                  size={14}
                  color={Accent.violet300}
                />
                <View style={{ flex: 1 }}>
                  <Text style={ap.name} numberOfLines={1}>
                    {msg.attachment.name}
                  </Text>
                  <Text style={ap.size}>{msg.attachment.size}</Text>
                </View>
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={Accent.violet400}
                />
              </LinearGradient>
            </View>
          )}
          {isUser ? (
            <LinearGradient
              colors={["#7c3aed", "#a855f7"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={bs.userBubble}
            >
              <Text style={bs.userText}>{msg.text}</Text>
            </LinearGradient>
          ) : (
            <View
              style={[
                bs.aiBubble,
                { backgroundColor: T.bgCard2, borderColor: T.border },
              ]}
            >
              <Text style={[bs.aiText, { color: T.textSecondary }]}>
                {msg.text}
              </Text>
            </View>
          )}
          <Text
            style={[bs.time, { color: T.textMuted }, isUser && bs.timeUser]}
          >
            {msg.time}
          </Text>
        </View>
      </View>

      {/* Token report — only on AI messages */}
      {!isUser && (msg.billsUsed || msg.sectionsFound) && (
        <TokenReport
          sources={msg.sources}
          billsUsed={msg.billsUsed}
          compressionRatio={msg.compressionRatio}
          sectionsFound={msg.sectionsFound}
        />
      )}
    </Animated.View>
  );
};

// ─── History sidebar ──────────────────────────────────────────────────────────

const HistorySidebar = ({
  visible,
  currentKey,
  onClose,
  onSelectSession,
  onClearAll,
}: {
  visible: boolean;
  currentKey: string;
  onClose: () => void;
  onSelectSession: (key: string, msgs: Message[]) => void;
  onClearAll: () => void;
}) => {
  const { theme: T } = useTheme();
  const translateX = useRef(new Animated.Value(-SW)).current;

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: visible ? 0 : -SW,
      useNativeDriver: true,
      speed: 20,
      bounciness: 0,
    }).start();
  }, [visible]);

  const sessions = Object.entries(historyStore).filter(
    ([, msgs]) => msgs.length > 1,
  );

  return (
    <>
      {visible && (
        <TouchableOpacity
          style={hs.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
      )}
      <Animated.View
        style={[
          hs.sidebar,
          {
            backgroundColor: T.bg,
            borderRightColor: T.border,
            transform: [{ translateX }],
          },
        ]}
      >
        <View style={[hs.sidebarHeader, { borderBottomColor: T.border }]}>
          <Text style={[hs.sidebarTitle, { color: T.textPrimary }]}>
            Chat History
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={22} color={T.textMuted} />
          </TouchableOpacity>
        </View>

        {sessions.length === 0 ? (
          <View style={hs.empty}>
            <Ionicons
              name="chatbubbles-outline"
              size={36}
              color={T.textMuted}
            />
            <Text style={[hs.emptyText, { color: T.textMuted }]}>
              No history yet
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={hs.list}>
            {sessions.map(([key, msgs]) => {
              const firstUserMsg = msgs.find((m) => m.role === "user");
              const label = firstUserMsg
                ? firstUserMsg.text.slice(0, 48) +
                  (firstUserMsg.text.length > 48 ? "…" : "")
                : key;
              const isActive = key === currentKey;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => {
                    onSelectSession(key, msgs);
                    onClose();
                  }}
                  activeOpacity={0.75}
                  style={[
                    hs.sessionRow,
                    { borderBottomColor: T.border },
                    isActive && {
                      backgroundColor: T.isDark
                        ? "rgba(139,92,246,0.1)"
                        : "rgba(109,40,217,0.06)",
                    },
                  ]}
                >
                  <View
                    style={[
                      hs.sessionIcon,
                      {
                        backgroundColor: T.isDark
                          ? "rgba(139,92,246,0.15)"
                          : "rgba(109,40,217,0.08)",
                      },
                    ]}
                  >
                    <Ionicons
                      name="chatbubble-outline"
                      size={14}
                      color={Accent.violet400}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[hs.sessionLabel, { color: T.textPrimary }]}
                      numberOfLines={2}
                    >
                      {label}
                    </Text>
                    <Text style={[hs.sessionMeta, { color: T.textMuted }]}>
                      {msgs.length - 1} message
                      {msgs.length - 1 !== 1 ? "s" : ""} ·{" "}
                      {key === "general" ? "General" : `Bill #${key}`}
                    </Text>
                  </View>
                  {isActive && (
                    <View
                      style={[
                        hs.activeDot,
                        { backgroundColor: Accent.violet400 },
                      ]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {sessions.length > 0 && (
          <TouchableOpacity
            onPress={onClearAll}
            style={[hs.clearBtn, { borderTopColor: T.border , marginBottom : 100 }]}
            activeOpacity={0.75}
          >
            <Ionicons name="trash-outline" size={15} color="#ef4444" />
            <Text style={hs.clearText}>Clear all history</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </>
  );
};

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ChatScreen({
  onBack,
  initialBill,
  initialPolicy,
}: ChatScreenProps) {
  const { theme: T } = useTheme();
  const insets = useSafeAreaInsets();
  const now = () =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const listRef = useRef<FlatList>(null);
  const scrollEnd = () =>
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);

  // Session key — one history per bill, or "general"
  const sessionKey = initialBill?.bill_number ?? "general";

  const buildSeed = (): Message[] => {
    const t = now();
    if (initialBill) {
      return [
        {
          id: "seed",
          role: "ai",
          time: t,
          text: `Hello! I have loaded "${initialBill.title}". What would you like to know about this bill?`,
        },
      ];
    }
    if (initialPolicy) {
      return [
        {
          id: "seed",
          role: "ai",
          time: t,
          text: `Hello! I have loaded the policy: ${initialPolicy.title}. What would you like to know?`,
        },
      ];
    }
    return [
      {
        id: "seed",
        role: "ai",
        time: t,
        text: "Hello! I'm your AI assistant for Indian legislation. Ask me about any bill, or upload a PDF for instant analysis.",
      },
    ];
  };

  // Restore from history or build fresh seed
  const [messages, setMessages] = useState<Message[]>(() => {
    if (historyStore[sessionKey] && historyStore[sessionKey].length > 0) {
      return historyStore[sessionKey];
    }
    const seed = buildSeed();
    historyStore[sessionKey] = seed;
    return seed;
  });

  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [pdf, setPdf] = useState<Attachment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Keep history in sync whenever messages change
  const updateMessages = (updater: (prev: Message[]) => Message[]) => {
    setMessages((prev) => {
      const next = updater(prev);
      historyStore[sessionKey] = next;
      return next;
    });
  };

  const addAI = (
    text: string,
    sources?: ChatResponse["sources"],
    billsUsed?: { bill_number: string; title: string }[],
    compressionRatio?: number,
    sectionsFound?: string[],
  ) => {
    updateMessages((p) => [
      ...p,
      {
        id: (Date.now() + 1).toString(),
        role: "ai",
        text,
        time: now(),
        sources,
        billsUsed,
        compressionRatio,
        sectionsFound,
      },
    ]);
    scrollEnd();
  };

  const pickPdf = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;
      const f = res.assets[0];
      const kb = f.size ? Math.round(f.size / 1024) : 0;
      setPdf({
        name: f.name,
        uri: f.uri,
        size: kb > 1024 ? (kb / 1024).toFixed(1) + " MB" : kb + " KB",
      });
    } catch (_) {}
  };

  const send = async () => {
    const text = input.trim();
    const captured = pdf;
    if (!text && !captured) return;

    updateMessages((p) => [
      ...p,
      {
        id: Date.now().toString(),
        role: "user",
        text: text || `Please analyse this PDF: ${captured!.name}`,
        time: now(),
        attachment: captured ?? undefined,
      },
    ]);
    setInput("");
    setPdf(null);
    setError(null);
    scrollEnd();
    setTyping(true);

    try {
      if (captured?.uri) {
        const res: UploadPdfResponse = await uploadPdf(
          captured.uri,
          captured.name,
          text || undefined,
        );
        addAI(
          res.answer,
          undefined,
          [{ bill_number: "—", title: res.bill_title }],
          res.compression_ratio,
          res.sections_found,
        );
        return;
      }

      const billNumber = initialBill?.bill_number ?? undefined;
      try {
        const res: ChatResponse = await sendChat(text, billNumber);
        addAI(
          res.answer,
          res.sources,
          res.bills_used,
          undefined,
          res.sources
            ? [...new Set(res.sources.map((s) => s.section))]
            : undefined,
        );
      } catch (err: any) {
        if (err.status === 404 && billNumber) {
          addAI(
            "This bill is not in my database yet. Fetching it now, please wait...",
          );
          setTyping(true);
          await triggerIngest(billNumber);
          const retry: ChatResponse = await sendChat(text, billNumber);
          addAI(
            retry.answer,
            retry.sources,
            retry.bills_used,
            undefined,
            retry.sources
              ? [...new Set(retry.sources.map((s) => s.section))]
              : undefined,
          );
        } else {
          throw err;
        }
      }
    } catch (err: any) {
      const msg = err?.message ?? "Something went wrong. Please try again.";
      setError(msg);
      addAI(`Sorry, I encountered an error: ${msg}`);
    } finally {
      setTyping(false);
    }
  };

  const canSend = (input.trim().length > 0 || !!pdf) && !typing;

  return (
    <View style={[sc.root, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.statusBar} />

      {/* History sidebar */}
      <HistorySidebar
        visible={sidebarOpen}
        currentKey={sessionKey}
        onClose={() => setSidebarOpen(false)}
        onSelectSession={(_, msgs) => setMessages(msgs)}
        onClearAll={() => {
          Object.keys(historyStore).forEach((k) => delete historyStore[k]);
          const seed = buildSeed();
          historyStore[sessionKey] = seed;
          setMessages(seed);
          setSidebarOpen(false);
        }}
      />

      {/* ── Header ── */}
      <LinearGradient
        colors={T.isDark ? ["#0c0818", "#110d1f"] : ["#f5f3ff", "#ede9fe"]}
        style={[
          sc.header,
          { paddingTop: insets.top + 10, borderBottomColor: T.border },
        ]}
      >
        <TouchableOpacity
          onPress={onBack}
          activeOpacity={0.75}
          style={[
            sc.iconBtn,
            { backgroundColor: T.surface2, borderColor: T.border },
          ]}
        >
          <Ionicons name="chevron-back" size={22} color={Accent.violet300} />
        </TouchableOpacity>

        <View style={sc.headerCenter}>
          <LinearGradient colors={Accent.gradAI} style={sc.headerAvatar}>
            <Ionicons name="sparkles" size={15} color="#fff" />
          </LinearGradient>
          <View>
            <Text
              style={[sc.headerTitle, { color: T.textPrimary }]}
              numberOfLines={1}
            >
              {initialBill ? initialBill.title || "Bill AI" : "AI Assistant"}
            </Text>
            <View style={sc.statusRow}>
              <View style={sc.onlineDot} />
              <Text style={[sc.headerSub, { color: T.textMuted }]}>
                Online · Violet AI
              </Text>
            </View>
          </View>
        </View>

        {/* History button */}
        <TouchableOpacity
          onPress={() => setSidebarOpen(true)}
          style={[
            sc.iconBtn,
            { backgroundColor: T.surface2, borderColor: T.border },
          ]}
          activeOpacity={0.75}
        >
          <Ionicons name="time-outline" size={20} color={Accent.violet300} />
        </TouchableOpacity>
      </LinearGradient>

      {/* ── Body ── */}
      <KeyboardAvoidingView
        style={sc.body}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <Bubble msg={item} />}
          contentContainerStyle={sc.listContent}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={typing ? <TypingDots /> : null}
          onContentSizeChange={scrollEnd}
          keyboardShouldPersistTaps="handled"
        />

        {pdf && (
          <View style={[sc.pdfStrip, { borderColor: T.borderStrong }]}>
            <LinearGradient
              colors={["rgba(124,58,237,0.38)", "rgba(168,85,247,0.18)"]}
              style={sc.pdfStripInner}
            >
              <Ionicons
                name="document-text"
                size={17}
                color={Accent.violet300}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={[sc.pdfName, { color: T.textPrimary }]}
                  numberOfLines={1}
                >
                  {pdf.name}
                </Text>
                <Text style={[sc.pdfSize, { color: T.textMuted }]}>
                  {pdf.size} · Ready to send
                </Text>
              </View>
              <TouchableOpacity onPress={() => setPdf(null)}>
                <Ionicons name="close-circle" size={20} color={T.textMuted} />
              </TouchableOpacity>
            </LinearGradient>
          </View>
        )}

        {/* Input bar */}
        <View
          style={[
            sc.inputBar,
            {
              paddingBottom: Math.max(insets.bottom, 16),
              borderTopColor: T.border,
              backgroundColor: T.isDark
                ? "rgba(8,6,18,0.97)"
                : "rgba(245,243,255,0.97)",
            },
          ]}
        >
          <View style={sc.inputRow}>
            <TouchableOpacity onPress={pickPdf} activeOpacity={0.8}>
              <LinearGradient
                colors={["rgba(124,58,237,0.38)", "rgba(168,85,247,0.18)"]}
                style={[sc.squareBtn, { borderColor: T.borderStrong }]}
              >
                <Ionicons
                  name="document-attach-outline"
                  size={21}
                  color={Accent.violet300}
                />
              </LinearGradient>
            </TouchableOpacity>

            <TextInput
              style={[
                sc.input,
                {
                  backgroundColor: T.inputBg,
                  borderColor: T.borderStrong,
                  color: T.textPrimary,
                },
              ]}
              placeholder="Message AI…"
              placeholderTextColor={T.textMuted}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={2000}
              textAlignVertical="center"
              editable={!typing}
            />

            <TouchableOpacity
              onPress={send}
              disabled={!canSend}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={canSend ? Accent.gradAI : [T.surface2, T.surface2]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[sc.squareBtn, { borderColor: T.borderStrong }]}
              >
                <Ionicons
                  name="arrow-up"
                  size={21}
                  color={canSend ? "#fff" : T.textMuted}
                />
              </LinearGradient>
            </TouchableOpacity>
          </View>
          <Text style={[sc.hint, { color: T.textMuted }]}>
            Tap the clip to attach a PDF · clock icon for history
          </Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const sc = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
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
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    marginHorizontal: 10,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 14, fontWeight: "700", letterSpacing: 0.1 },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Accent.green,
  },
  headerSub: { fontSize: 11, letterSpacing: 0.3 },
  listContent: { padding: 16, gap: 12, paddingBottom: 12 },
  pdfStrip: {
    marginHorizontal: 14,
    marginBottom: 8,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
  },
  pdfStripInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
  },
  pdfName: { fontSize: 13, fontWeight: "600" },
  pdfSize: { fontSize: 11, marginTop: 2 },
  inputBar: { borderTopWidth: 1, paddingTop: 12, paddingHorizontal: 14 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  squareBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: Platform.OS === "ios" ? 13 : 10,
    paddingBottom: Platform.OS === "ios" ? 13 : 10,
    fontSize: 15,
    lineHeight: 21,
    minHeight: 46,
    maxHeight: 130,
  },
  hint: {
    fontSize: 10,
    textAlign: "center",
    marginTop: 9,
    marginBottom: 2,
    letterSpacing: 0.3,
  },
});

const bs = StyleSheet.create({
  row: { flexDirection: "row", marginBottom: 4 },
  rowUser: { justifyContent: "flex-end" },
  rowAI: { justifyContent: "flex-start", gap: 8 },
  aiAvatar: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  wrap: { maxWidth: "78%" },
  wrapUser: { alignItems: "flex-end" },
  wrapAI: { alignItems: "flex-start" },
  userBubble: {
    borderRadius: 20,
    borderBottomRightRadius: 5,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  userText: { fontSize: 15, color: "#fff", lineHeight: 21 },
  aiBubble: {
    borderRadius: 20,
    borderBottomLeftRadius: 5,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderWidth: 1,
    overflow: "hidden",
  },
  aiText: { fontSize: 15, lineHeight: 21 },
  time: { fontSize: 10, marginTop: 4, marginLeft: 2, letterSpacing: 0.3 },
  timeUser: { marginLeft: 0, marginRight: 2 },
});

const ts = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 4,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  bubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#1a1330",
    borderRadius: 20,
    borderBottomLeftRadius: 5,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.12)",
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Accent.violet400,
  },
});

const ap = StyleSheet.create({
  pill: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.3)",
  },
  grad: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  name: { fontSize: 12, fontWeight: "600", color: "#ede9fe" },
  size: { fontSize: 10, color: "rgba(196,181,253,0.38)", marginTop: 1 },
});

const tr = StyleSheet.create({
  card: {
    marginLeft: 38,
    marginTop: -4,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  icon: {
    width: 22,
    height: 22,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
  },
  label: { flex: 1, fontSize: 11, fontWeight: "700", letterSpacing: 0.3 },
  pills: { flexDirection: "row", gap: 6, marginTop: 7, flexWrap: "wrap" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
  },
  pillText: { fontSize: 10, fontWeight: "600" },
  body: { marginTop: 12, gap: 0 },
  block: { marginBottom: 10 },
  blockLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  billRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 7,
    borderBottomWidth: 1,
  },
  billDot: { width: 6, height: 6, borderRadius: 3 },
  billTitle: { fontSize: 12, fontWeight: "600" },
  billNum: { fontSize: 10, marginTop: 2 },
  statRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
  },
  statVal: { fontSize: 13, fontWeight: "800" },
  statNote: { fontSize: 11 },
  sectionChips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  sectionChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 99,
    borderWidth: 1,
  },
  sectionChipText: { fontSize: 11, fontWeight: "600" },
  pipelineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  pipelineNum: {
    width: 24,
    height: 24,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
  },
  pipelineNumText: {
    fontSize: 12,
    fontWeight: "900",
    color: Accent.violet300,
  },
  pipelineStep: { fontSize: 12, fontWeight: "700", width: 130 },
  pipelineDesc: { fontSize: 11, flex: 1 },
});

const hs = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 10,
  },
  sidebar: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: SW * 0.78,
    zIndex: 11,
    borderRightWidth: 1,
  },
  sidebarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 16,
    paddingTop: 52,
    borderBottomWidth: 1,
  },
  sidebarTitle: { fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  list: { paddingVertical: 8 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingTop: 60,
  },
  emptyText: { fontSize: 14 },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  sessionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  sessionLabel: { fontSize: 13, fontWeight: "600", lineHeight: 18 },
  sessionMeta: { fontSize: 11, marginTop: 3 },
  activeDot: { width: 8, height: 8, borderRadius: 4 },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 18,
    borderTopWidth: 1,
  },
  clearText: { fontSize: 13, fontWeight: "600", color: "#ef4444" },
});
