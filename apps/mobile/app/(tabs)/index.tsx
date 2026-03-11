import { lang, t } from "@/i18n";
import { BEARER_KEY } from "@/lib/auth-client";
import { T } from "@/lib/theme";
import { generateAPIUrl } from "@/utils";
import { useChat } from "@ai-sdk/react";
import { Ionicons } from "@expo/vector-icons";
import { DefaultChatTransport } from "ai";
import { getLocales } from "expo-localization";
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
  View,
} from "react-native";
import Markdown from "react-native-markdown-display";
import { SafeAreaView } from "react-native-safe-area-context";

const country = getLocales()[0]?.regionCode ?? "US";

const SUGGESTIONS = [
  { icon: "people-outline" as const, label: t.suggestions[0] ?? "Movie for family" },
  { icon: "rocket-outline" as const, label: t.suggestions[1] ?? "Best Sci-Fi" },
  { icon: "heart-outline" as const, label: t.suggestions[2] ?? "Date night" },
  { icon: "film-outline" as const, label: t.suggestions[3] ?? "Award winners" },
];

export default function HomeScreen() {
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
  const inputRef = useRef<TextInput>(null);
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

  const handleSuggestion = (text: string) => {
    sendMessage({ text });
  };

  const canSend = input.trim().length > 0 && !isLoading;

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoIcon}>
            <Ionicons name="film-outline" size={20} color={T.primary} />
          </View>
          <Text style={styles.headerTitle}>Muvie</Text>
        </View>
        <Pressable style={styles.headerAction} onPress={() => setMessages([])}>
          <Ionicons name="create-outline" size={22} color={T.text} />
        </Pressable>
      </View>

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
            <EmptyState onSuggestion={handleSuggestion} />
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
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{t.errorMessage}</Text>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputArea}>
          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder={t.inputPlaceholder}
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
          <Text style={styles.disclaimer}>{t.disclaimer}</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function EmptyState({ onSuggestion }: { onSuggestion: (text: string) => void }) {
  return (
    <View style={styles.empty}>
      <View style={styles.askHeader}>
        <Ionicons name="sparkles" size={22} color={T.primary} />
        <Text style={styles.askTitle}>Ask Muvie</Text>
      </View>
      <Text style={styles.askSubtitle}>{t.emptyTitle}</Text>

      {/* Suggestion chips */}
      <View style={styles.chips}>
        {SUGGESTIONS.map((s) => (
          <Pressable
            key={s.label}
            style={styles.chip}
            onPress={() => onSuggestion(s.label)}
          >
            <Ionicons name={s.icon} size={16} color={T.primary} />
            <Text style={styles.chipText}>{s.label}</Text>
          </Pressable>
        ))}
      </View>
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

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
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
    </View>
  );
}

function TypingIndicator() {
  return (
    <View style={[styles.row, styles.rowAssistant]}>
      <View style={styles.avatar}>
        <Ionicons name="film-outline" size={14} color={T.primary} />
      </View>
      <View style={styles.typingBubble}>
        <ActivityIndicator size="small" color={T.primary} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, backgroundColor: T.bg },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: T.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: T.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: T.text,
    letterSpacing: -0.3,
  },
  headerAction: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: T.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: T.border,
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
    paddingTop: 32,
    paddingHorizontal: 4,
  },
  askHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  askTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: T.text,
    letterSpacing: -0.3,
  },
  askSubtitle: {
    fontSize: 14,
    color: T.muted,
    marginBottom: 20,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
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
  bubbleText: {
    color: T.text,
    fontSize: 16,
    lineHeight: 24,
  },
  typingBubble: {
    paddingVertical: 8,
    paddingLeft: 4,
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
