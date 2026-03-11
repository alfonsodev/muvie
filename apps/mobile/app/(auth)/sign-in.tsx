import { authClient, BASE_URL, BEARER_KEY } from "@/lib/auth-client";
import { isPasskeySupported, isUserCancelledError, signInWithPasskey } from "@/lib/passkey";
import { T } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Stage = "input" | "sent" | "loading";

function GoogleIcon() {
  return (
    <View style={styles.googleIconBox}>
      <Text style={styles.googleIconText}>G</Text>
    </View>
  );
}

// ── Debug modal ───────────────────────────────────────────────────────────────

function DebugModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [bearerStored, setBearerStored] = useState("checking…");

  useEffect(() => {
    if (!visible) return;
    if (Platform.OS === "web") { setBearerStored("n/a (web)"); return; }
    import("expo-secure-store")
      .then((SS) => SS.getItemAsync(BEARER_KEY))
      .then((t) => setBearerStored(t ? `stored (${t.slice(0, 8)}…)` : "not stored"));
  }, [visible]);

  const extra = Constants.expoConfig?.extra;

  const rows: { label: string; value: string }[] = [
    { label: "BASE_URL",            value: BASE_URL },
    { label: "EXPO_PUBLIC_API_URL", value: process.env.EXPO_PUBLIC_API_URL ?? "(not set)" },
    { label: "__DEV__",             value: String(__DEV__) },
    { label: "Platform.OS",         value: Platform.OS },
    { label: "Platform.Version",    value: String(Platform.Version) },
    { label: "hostUri",             value: Constants.expoConfig?.hostUri ?? "(not set)" },
    { label: "app name",            value: Constants.expoConfig?.name ?? "(not set)" },
    { label: "app version",         value: Constants.expoConfig?.version ?? "(not set)" },
    { label: "scheme",              value: (Constants.expoConfig?.scheme as string | undefined) ?? "(not set)" },
    { label: "Bearer token",        value: bearerStored },
    { label: "extra",               value: extra ? JSON.stringify(extra, null, 2) : "(none)" },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={dbStyles.backdrop} onPress={onClose} />
      <View style={dbStyles.sheet}>
        <View style={dbStyles.handle} />
        <View style={dbStyles.header}>
          <View style={dbStyles.titleRow}>
            <Ionicons name="bug-outline" size={17} color={T.primary} />
            <Text style={dbStyles.title}>Runtime Config</Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={22} color={T.muted} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={dbStyles.list} showsVerticalScrollIndicator={false}>
          {rows.map((r) => (
            <View key={r.label} style={dbStyles.row}>
              <Text style={dbStyles.rowLabel}>{r.label}</Text>
              <Text style={dbStyles.rowValue} selectable>{r.value}</Text>
            </View>
          ))}
          <View style={{ height: 32 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [stage, setStage] = useState<Stage>("input");
  const [error, setError] = useState<string | null>(null);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [hasRegisteredPasskey, setHasRegisteredPasskey] = useState(false);
  const [debugVisible, setDebugVisible] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const passkeySupported = isPasskeySupported();

  useEffect(() => {
    if (!passkeySupported || Platform.OS === "web") return;
    import("expo-secure-store").then(SS =>
      SS.getItemAsync(BEARER_KEY)
    ).then(token => setHasRegisteredPasskey(!!token));
  }, []);

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

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setError(null);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: `${BASE_URL}/auth/app-callback`,
      });
    } catch (err) {
      setError((err as { message?: string })?.message ?? "Google sign-in failed");
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handlePasskeySignIn() {
    setPasskeyLoading(true);
    setError(null);
    try {
      const { sessionToken } = await signInWithPasskey();
      const SS = await import("expo-secure-store");
      await SS.setItemAsync(BEARER_KEY, sessionToken);
      const { data } = await authClient.getSession();
      const user = data?.user as (Record<string, unknown> & { username?: string | null }) | undefined;
      if (user?.username) {
        router.replace("/(tabs)");
      } else {
        router.replace("/(auth)/onboarding");
      }
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
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <View style={styles.iconBox}>
            <Ionicons name="mail-outline" size={40} color={T.primary} />
          </View>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.subtitle}>
            We sent a sign-in link to{"\n"}
            <Text style={styles.emailHighlight}>{email.trim().toLowerCase()}</Text>
          </Text>
          <Text style={[styles.subtitle, { marginTop: 8 }]}>
            Tap the link in your email — this tab will close automatically once you're signed in.
          </Text>
          <TouchableOpacity
            style={[styles.secondaryBtn, { marginTop: 32 }]}
            onPress={() => { setStage("input"); setError(null); }}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryLabel}>Use a different email</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Input state ───────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.root}>
      <DebugModal visible={debugVisible} onClose={() => setDebugVisible(false)} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Logo — tap to open debug panel */}
        <View style={styles.logoArea}>
          <TouchableOpacity
            style={styles.iconBox}
            onPress={() => setDebugVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="film-outline" size={40} color={T.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Muvie</Text>
          <Text style={styles.subtitle}>Your personal cinema guide</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {error && <Text style={styles.errorText}>{error}</Text>}

          {/* Email field */}
          <View style={styles.fieldLabel}>
            <Text style={styles.label}>Email address</Text>
          </View>
          <View style={styles.inputWrap}>
            <Ionicons name="mail-outline" size={20} color={T.dim} style={styles.inputIcon} />
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={email}
              onChangeText={(v) => { setEmail(v); setError(null); }}
              placeholder="name@example.com"
              placeholderTextColor={T.dim}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={handleSendLink}
              editable={stage !== "loading"}
            />
          </View>

          {/* Primary CTA */}
          <TouchableOpacity
            style={[styles.primaryBtn, stage === "loading" && styles.btnDisabled]}
            onPress={handleSendLink}
            disabled={stage === "loading"}
            activeOpacity={0.85}
          >
            {stage === "loading" ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryLabel}>Send magic link</Text>
            )}
          </TouchableOpacity>

          {/* Social options */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google */}
          <TouchableOpacity
            style={[styles.socialBtn, googleLoading && styles.btnDisabled]}
            onPress={handleGoogleSignIn}
            disabled={googleLoading}
            activeOpacity={0.8}
          >
            {googleLoading ? (
              <ActivityIndicator color={T.muted} />
            ) : (
              <>
                <GoogleIcon />
                <Text style={styles.socialLabel}>Sign in with Google</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Face ID */}
          {passkeySupported && hasRegisteredPasskey && (
            <TouchableOpacity
              style={[styles.socialBtn, passkeyLoading && styles.btnDisabled]}
              onPress={handlePasskeySignIn}
              disabled={passkeyLoading}
              activeOpacity={0.8}
            >
              {passkeyLoading ? (
                <ActivityIndicator color={T.muted} />
              ) : (
                <>
                  <Ionicons name="finger-print-outline" size={20} color={T.text} />
                  <Text style={styles.socialLabel}>Sign in with Face ID</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.footer} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  flex: { flex: 1, paddingHorizontal: 28 },

  logoArea: {
    alignItems: "center",
    paddingTop: 72,
    paddingBottom: 40,
    gap: 12,
  },
  iconBox: {
    width: 76,
    height: 76,
    borderRadius: 20,
    backgroundColor: T.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: T.border,
    marginBottom: 4,
  },
  title: {
    fontSize: 34,
    fontWeight: "700",
    color: T.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: T.muted,
    textAlign: "center",
    lineHeight: 22,
  },
  emailHighlight: {
    color: T.text,
    fontWeight: "600",
  },

  form: { gap: 12 },
  fieldLabel: { marginBottom: -4 },
  label: {
    fontSize: 13,
    fontWeight: "500",
    color: T.muted,
    marginLeft: 4,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.surfaceWhite,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.borderWhite,
    height: 56,
    paddingHorizontal: 16,
    gap: 10,
  },
  inputIcon: { flexShrink: 0 },
  input: {
    flex: 1,
    fontSize: 16,
    color: T.text,
    paddingVertical: 0,
  },

  primaryBtn: {
    height: 56,
    borderRadius: 14,
    backgroundColor: T.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryLabel: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
  },
  btnDisabled: { opacity: 0.5 },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: T.borderWhite,
  },
  dividerText: {
    fontSize: 12,
    color: T.dim,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 56,
    borderRadius: 14,
    backgroundColor: T.surfaceWhite,
    borderWidth: 1,
    borderColor: T.borderWhite,
  },
  socialLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: T.text,
  },

  secondaryBtn: {
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 14,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  secondaryLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: T.muted,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  errorText: {
    fontSize: 13,
    color: T.error,
    textAlign: "center",
  },
  footer: { height: 32 },

  googleIconBox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  googleIconText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4285F4",
    lineHeight: 16,
  },
});

// ── Debug modal styles ────────────────────────────────────────────────────────

const dbStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    backgroundColor: "#180d24",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: T.border,
    maxHeight: "72%",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: T.border,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: T.text,
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  row: {
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    gap: 3,
  },
  rowLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: T.primary,
    textTransform: "uppercase",
    letterSpacing: 0.9,
  },
  rowValue: {
    fontSize: 13,
    color: T.muted,
    lineHeight: 18,
    fontVariant: ["tabular-nums"],
  },
});
