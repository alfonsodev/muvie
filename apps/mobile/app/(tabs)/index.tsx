import { lang, t } from "@/i18n";
import { generateAPIUrl } from "@/utils";
import { useChat } from "@ai-sdk/react";
import { Ionicons } from "@expo/vector-icons";
import { DefaultChatTransport } from "ai";
import { getLocales } from "expo-localization";
import { fetch as expoFetch } from "expo/fetch";
import React, { useEffect, useRef } from "react";
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

const C = {
  bg: "#212121",
  surface: "#2f2f2f",
  border: "#3d3d3d",
  text: "#ececec",
  muted: "#8e8ea0",
  sendActive: "#ececec",
  sendInactive: "#3d3d3d",
};

const country = getLocales()[0]?.regionCode ?? "US";

export default function ChatScreen() {
  const { messages, status, sendMessage, error, setMessages } = useChat({
    transport: new DefaultChatTransport({
      fetch: expoFetch as unknown as typeof globalThis.fetch,
      api: generateAPIUrl("/api/chat"),
      body: { locale: lang, country },
    }),
  });

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
        <Text style={styles.headerTitle}>Muvie</Text>
        <Pressable style={styles.headerAction} onPress={() => setMessages([])}>
          <Ionicons name="create-outline" size={22} color={C.text} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* Message list */}
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

        {/* Input bar */}
        <View style={styles.inputArea}>
          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder={t.inputPlaceholder}
              placeholderTextColor={C.muted}
              multiline
              maxLength={4000}
              onSubmitEditing={handleSend}
              returnKeyType="send"
            />
            <Pressable
              style={[
                styles.sendBtn,
                canSend ? styles.sendBtnActive : styles.sendBtnInactive,
              ]}
              onPress={handleSend}
              disabled={!canSend}
            >
              <Ionicons
                name="arrow-up"
                size={18}
                color={canSend ? C.bg : C.muted}
              />
            </Pressable>
          </View>
          <Text style={styles.disclaimer}>{t.disclaimer}</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function EmptyState({
  onSuggestion,
}: {
  onSuggestion: (text: string) => void;
}) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>🎬</Text>
      <Text style={styles.emptyTitle}>{t.emptyTitle}</Text>
      <View style={styles.chips}>
        {t.suggestions.map((s) => (
          <Pressable
            key={s}
            style={styles.chip}
            onPress={() => onSuggestion(s)}
          >
            <Text style={styles.chipText}>{s}</Text>
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
          <Text style={styles.avatarEmoji}>🎬</Text>
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAssistant,
        ]}
      >
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
        <Text style={styles.avatarEmoji}>🎬</Text>
      </View>
      <View style={styles.typingBubble}>
        <ActivityIndicator size="small" color={C.muted} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: C.text,
    letterSpacing: 0.3,
  },
  headerAction: {
    position: "absolute",
    right: 16,
    padding: 4,
  },

  // Message list
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    flexGrow: 1,
  },

  // Empty state
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 48,
    paddingHorizontal: 8,
  },
  emptyEmoji: { fontSize: 52, marginBottom: 16 },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: C.text,
    marginBottom: 28,
    textAlign: "center",
  },
  chips: { width: "100%", gap: 10 },
  chip: {
    backgroundColor: C.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  chipText: { color: C.text, fontSize: 15 },

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
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 2,
  },
  avatarEmoji: { fontSize: 15 },

  bubble: {
    maxWidth: "78%",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: C.surface,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: "transparent",
    paddingHorizontal: 0,
    paddingVertical: 0,
    maxWidth: "88%",
  },
  bubbleText: {
    color: C.text,
    fontSize: 16,
    lineHeight: 24,
  },
  typingBubble: {
    paddingVertical: 8,
    paddingLeft: 4,
  },

  // Error
  errorBanner: {
    backgroundColor: "#3d1c1c",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#5c2c2c",
  },
  errorText: { color: "#f87171", fontSize: 14 },

  // Input
  inputArea: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 8 : 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: C.surface,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: C.border,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
  },
  input: {
    flex: 1,
    color: C.text,
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
  sendBtnActive: { backgroundColor: C.sendActive },
  sendBtnInactive: { backgroundColor: C.sendInactive },
  disclaimer: {
    color: C.muted,
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
  },
});

const markdownStyles = {
  body: { color: C.text, fontSize: 16, lineHeight: 24 },
  strong: { fontWeight: "700" as const, color: C.text },
  em: { fontStyle: "italic" as const },
  link: { color: "#6c63ff" },
  bullet_list: { marginVertical: 4 },
  ordered_list: { marginVertical: 4 },
  list_item: { marginBottom: 4 },
  paragraph: { marginTop: 0, marginBottom: 8 },
  heading1: {
    color: C.text,
    fontSize: 20,
    fontWeight: "700" as const,
    marginBottom: 8,
  },
  heading2: {
    color: C.text,
    fontSize: 18,
    fontWeight: "700" as const,
    marginBottom: 6,
  },
  heading3: {
    color: C.text,
    fontSize: 16,
    fontWeight: "700" as const,
    marginBottom: 4,
  },
  code_inline: {
    backgroundColor: "#2f2f2f",
    color: "#ececec",
    borderRadius: 4,
    paddingHorizontal: 4,
  },
};
