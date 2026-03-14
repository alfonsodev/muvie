import { lang } from "@/i18n";
import { BEARER_KEY } from "@/lib/auth-client";
import { T } from "@/lib/theme";
import { generateAPIUrl } from "@/utils";
import { useChat } from "@ai-sdk/react";
import { Ionicons } from "@expo/vector-icons";
import { DefaultChatTransport } from "ai";
import { getLocales } from "expo-localization";
import { useRouter } from "expo-router";
import { fetch as expoFetch } from "expo/fetch";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Markdown from "react-native-markdown-display";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInLeft,
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const country = getLocales()[0]?.regionCode ?? "US";

const SUGGESTIONS = [
  { icon: "people-outline" as const, label: "Movie for family" },
  { icon: "rocket-outline" as const, label: "Best Sci-Fi" },
  { icon: "heart-outline" as const, label: "Date night" },
  { icon: "film-outline" as const, label: "Award winners" },
];

export default function ChatScreen() {
  const router = useRouter();
  const [bearerToken, setBearerToken] = React.useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS === "web") { setBearerToken(""); return; }
    SecureStore.getItemAsync(BEARER_KEY).then((tk) => setBearerToken(tk ?? ""));
  }, []);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        fetch: expoFetch as unknown as typeof globalThis.fetch,
        api: generateAPIUrl("/api/chat"),
        body: { locale: lang, country },
        headers: bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {},
      }),
    [bearerToken]
  );

  const { messages, status, sendMessage, error, setMessages } = useChat({ transport });

  const scrollRef = useRef<ScrollView>(null);
  const [input, setInput] = React.useState("");

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    sendMessage({ text });
  };

  const canSend = input.trim().length > 0 && !isLoading;

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(300)} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={T.text} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name="sparkles" size={16} color={T.primary} />
          <Text style={styles.headerTitle}>Ask Muvie</Text>
        </View>
        <Pressable style={styles.newChatBtn} onPress={() => setMessages([])}>
          <Ionicons name="create-outline" size={20} color={T.text} />
        </Pressable>
      </Animated.View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.listContent}
          keyboardDismissMode="interactive"
        >
          {messages.length === 0 ? (
            <EmptyState onSuggestion={(text) => sendMessage({ text })} />
          ) : (
            <>
              {messages.map((msg) => (
                <MessageRow key={msg.id} message={msg} />
              ))}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <TypingIndicator />
              )}
            </>
          )}
          {error && (
            <Animated.View entering={FadeIn.duration(300)} style={styles.errorBanner}>
              <Text style={styles.errorText}>Something went wrong. Try again.</Text>
            </Animated.View>
          )}
        </ScrollView>

        {/* Input */}
        <Animated.View entering={FadeInDown.delay(150).duration(400)} style={styles.inputArea}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="What do you want to watch?"
              placeholderTextColor={T.dim}
              multiline
              maxLength={4000}
              onSubmitEditing={handleSend}
              returnKeyType="send"
            />
            <Pressable
              style={[styles.sendBtn, canSend ? styles.sendBtnActive : styles.sendBtnInactive]}
              onPress={handleSend}
              disabled={!canSend}
            >
              <Ionicons name="arrow-up" size={18} color={canSend ? "#fff" : T.dim} />
            </Pressable>
          </View>
          <Text style={styles.disclaimer}>Muvie can make mistakes. Verify important info.</Text>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function EmptyState({ onSuggestion }: { onSuggestion: (text: string) => void }) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 1600, easing: Easing.inOut(Easing.sine) }),
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sine) })
      ),
      -1,
      false
    );
  }, []);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <View style={styles.empty}>
      <Animated.View entering={FadeIn.delay(100).duration(500)} style={styles.emptyIconWrap}>
        <Animated.View style={[styles.emptyIcon, iconStyle]}>
          <Ionicons name="sparkles" size={28} color={T.primary} />
        </Animated.View>
      </Animated.View>
      <Animated.Text entering={FadeInDown.delay(180).duration(400)} style={styles.emptyTitle}>
        What do you want to watch?
      </Animated.Text>
      <Animated.Text entering={FadeInDown.delay(240).duration(400)} style={styles.emptySubtitle}>
        Ask me for recommendations, what's trending, or what's on your platforms.
      </Animated.Text>
      <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.chips}>
        {SUGGESTIONS.map((s, i) => (
          <Animated.View key={s.label} entering={FadeInDown.delay(340 + i * 60).duration(350)}>
            <Pressable style={styles.chip} onPress={() => onSuggestion(s.label)}>
              <Ionicons name={s.icon} size={16} color={T.primary} />
              <Text style={styles.chipText}>{s.label}</Text>
            </Pressable>
          </Animated.View>
        ))}
      </Animated.View>
    </View>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MessageRow({ message }: { message: any }) {
  const isUser = message.role === "user";
  const text: string = message.parts
    ? message.parts
        .filter((p: { type: string }) => p.type === "text")
        .map((p: { type: string; text: string }) => p.text)
        .join("")
    : (message.content ?? "");

  const entering = isUser
    ? FadeInRight.duration(280).springify().damping(18)
    : FadeInLeft.duration(280).springify().damping(18);

  return (
    <Animated.View entering={entering} style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      {!isUser && (
        <View style={styles.avatar}>
          <Ionicons name="film-outline" size={14} color={T.primary} />
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        {isUser ? (
          <Text style={styles.bubbleText}>{text}</Text>
        ) : (
          <Markdown style={markdownStyles}>{text}</Markdown>
        )}
      </View>
    </Animated.View>
  );
}

function TypingIndicator() {
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    const cfg = { duration: 400, easing: Easing.inOut(Easing.sine) };
    dot1.value = withRepeat(withSequence(withTiming(-5, cfg), withTiming(0, cfg)), -1);
    setTimeout(() => {
      dot2.value = withRepeat(withSequence(withTiming(-5, cfg), withTiming(0, cfg)), -1);
    }, 140);
    setTimeout(() => {
      dot3.value = withRepeat(withSequence(withTiming(-5, cfg), withTiming(0, cfg)), -1);
    }, 280);
  }, []);

  const d1 = useAnimatedStyle(() => ({ transform: [{ translateY: dot1.value }] }));
  const d2 = useAnimatedStyle(() => ({ transform: [{ translateY: dot2.value }] }));
  const d3 = useAnimatedStyle(() => ({ transform: [{ translateY: dot3.value }] }));

  return (
    <Animated.View entering={FadeIn.duration(200)} style={[styles.row, styles.rowAssistant]}>
      <View style={styles.avatar}>
        <Ionicons name="film-outline" size={14} color={T.primary} />
      </View>
      <View style={styles.typingBubble}>
        <Animated.View style={[styles.dot, d1]} />
        <Animated.View style={[styles.dot, d2]} />
        <Animated.View style={[styles.dot, d3]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, backgroundColor: T.bg },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 4,
    paddingVertical: 4,
    minWidth: 70,
  },
  backText: {
    fontSize: 16,
    color: T.text,
    fontWeight: "500",
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: T.text,
    letterSpacing: -0.2,
  },
  newChatBtn: {
    minWidth: 70,
    alignItems: "flex-end" as const,
    justifyContent: "center" as const,
    paddingRight: 4,
  },

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    flexGrow: 1,
  },

  // Empty state
  empty: {
    flex: 1,
    paddingTop: 40,
    paddingHorizontal: 4,
    alignItems: "center",
  },
  emptyIconWrap: { marginBottom: 16 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: T.text,
    letterSpacing: -0.3,
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: T.muted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
    paddingHorizontal: 16,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "500",
    color: T.text,
  },

  // Messages
  row: {
    flexDirection: "row",
    marginBottom: 20,
    alignItems: "flex-end",
    gap: 10,
  },
  rowUser: { justifyContent: "flex-end" },
  rowAssistant: { justifyContent: "flex-start" },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: T.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: T.border,
    marginBottom: 2,
  },
  bubble: {
    maxWidth: "78%",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: "transparent",
    paddingHorizontal: 0,
    paddingVertical: 0,
    maxWidth: "90%",
  },
  bubbleText: { color: T.text, fontSize: 16, lineHeight: 24 },

  // Typing indicator
  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: T.muted,
  },

  // Error
  errorBanner: {
    backgroundColor: "rgba(239,68,68,0.15)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
  },
  errorText: { color: T.error, fontSize: 14 },

  // Input
  inputArea: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 8 : 12,
    borderTopWidth: 1,
    borderTopColor: T.border,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: T.surface,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: T.border,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
  },
  input: {
    flex: 1,
    color: T.text,
    fontSize: 16,
    lineHeight: 22,
    maxHeight: 120,
    paddingTop: 6,
    paddingBottom: 6,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  sendBtnActive: {
    backgroundColor: T.primary,
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  sendBtnInactive: { backgroundColor: T.surface },
  disclaimer: {
    color: T.dim,
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
  },
});

const markdownStyles = {
  body: { color: T.text, fontSize: 16, lineHeight: 24 },
  strong: { fontWeight: "700" as const, color: T.text },
  em: { fontStyle: "italic" as const },
  link: { color: T.primary },
  bullet_list: { marginVertical: 4 },
  ordered_list: { marginVertical: 4 },
  list_item: { marginBottom: 4 },
  paragraph: { marginTop: 0, marginBottom: 8 },
  heading1: { color: T.text, fontSize: 20, fontWeight: "700" as const, marginBottom: 8 },
  heading2: { color: T.text, fontSize: 18, fontWeight: "700" as const, marginBottom: 6 },
  heading3: { color: T.text, fontSize: 16, fontWeight: "700" as const, marginBottom: 4 },
  code_inline: {
    backgroundColor: T.surface,
    color: T.text,
    borderRadius: 4,
    paddingHorizontal: 4,
  },
};
