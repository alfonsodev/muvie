import { authClient, BASE_URL, BEARER_KEY } from "@/lib/auth-client";
import { isUserCancelledError, signInWithPasskey } from "@/lib/passkey";
import * as SecureStore from "expo-secure-store";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const C = {
  bg: "#121212",
  surface: "#1e1e1e",
  border: "#2e2e2e",
  borderFocus: "#6c63ff",
  text: "#ececec",
  muted: "#8e8ea0",
  accent: "#6c63ff",
  error: "#ff6b6b",
};

type Stage = "input" | "sent" | "loading";

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [stage, setStage] = useState<Stage>("input");
  const [error, setError] = useState<string | null>(null);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const passkeySupported = isPasskeySupported();

  async function handleSendLink() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setError("Enter a valid email address");
      return;
    }
    setError(null);
    setStage("loading");

    const { error: err } = await authClient.signIn.magicLink({
      email: trimmed,
      callbackURL: `${BASE_URL}/auth/app-callback`,
    });

    if (err) {
      setError(err.message ?? "Failed to send link");
      setStage("input");
    } else {
      setStage("sent");
    }
  }

  async function handlePasskeySignIn() {
    setPasskeyLoading(true);
    setError(null);
    try {
      const { sessionToken } = await signInWithPasskey();
      await SecureStore.setItemAsync(BEARER_KEY, sessionToken);
      await authClient.getSession();
    } catch (err) {
      if (isUserCancelledError(err)) return;
      setError(
        (err as { message?: string })?.message ?? "Face ID sign-in failed",
      );
    } finally {
      setPasskeyLoading(false);
    }
  }

  // ── Sent state ────────────────────────────────────────────────────────────
  if (stage === "sent") {
    return (
      <View style={styles.container}>
        <View style={styles.logoArea}>
          <Text style={styles.sentIcon}>📬</Text>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.subtitle}>
            We sent a sign-in link to{"\n"}
            <Text style={styles.emailHighlight}>
              {email.trim().toLowerCase()}
            </Text>
          </Text>
          <Text style={[styles.subtitle, { marginTop: 8 }]}>
            Tap the link in your email — this tab will close automatically once
            you're signed in.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => {
            setStage("input");
            setError(null);
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryLabel}>Use a different email</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Input state ───────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.logoArea}>
        <Text style={styles.logo}>🎬</Text>
        <Text style={styles.title}>Muvie</Text>
        <Text style={styles.subtitle}>Your personal movie companion</Text>
      </View>

      <View style={styles.actions}>
        {error && <Text style={styles.errorText}>{error}</Text>}

        <TextInput
          ref={inputRef}
          style={styles.input}
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            setError(null);
          }}
          placeholder="your@email.com"
          placeholderTextColor={C.muted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={handleSendLink}
          editable={stage !== "loading"}
        />

        <TouchableOpacity
          style={[
            styles.primaryButton,
            stage === "loading" && styles.buttonDisabled,
          ]}
          onPress={handleSendLink}
          disabled={stage === "loading"}
          activeOpacity={0.8}
        >
          {stage === "loading" ? (
            <ActivityIndicator color={C.text} />
          ) : (
            <Text style={styles.primaryLabel}>Send magic link</Text>
          )}
        </TouchableOpacity>

        {passkeySupported && (
          <>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={[
                styles.secondaryButton,
                passkeyLoading && styles.buttonDisabled,
              ]}
              onPress={handlePasskeySignIn}
              disabled={passkeyLoading}
              activeOpacity={0.8}
            >
              {passkeyLoading ? (
                <ActivityIndicator color={C.muted} />
              ) : (
                <Text style={styles.secondaryLabel}>Sign in with Face ID</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    justifyContent: "space-between",
    paddingHorizontal: 32,
    paddingTop: 120,
    paddingBottom: 60,
  },
  logoArea: {
    alignItems: "center",
    gap: 12,
  },
  logo: {
    fontSize: 72,
  },
  sentIcon: {
    fontSize: 64,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: C.text,
    letterSpacing: -0.5,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: C.muted,
    textAlign: "center",
    lineHeight: 22,
  },
  emailHighlight: {
    color: C.text,
    fontWeight: "600",
  },
  actions: {
    gap: 12,
  },
  input: {
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: 16,
    height: 52,
    fontSize: 16,
    color: C.text,
  },
  primaryButton: {
    backgroundColor: C.accent,
    borderRadius: 14,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryLabel: {
    fontSize: 17,
    fontWeight: "600",
    color: C.text,
  },
  secondaryButton: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 14,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: C.muted,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.border,
  },
  dividerText: {
    color: C.muted,
    fontSize: 13,
  },
  errorText: {
    fontSize: 13,
    color: C.error,
    textAlign: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
