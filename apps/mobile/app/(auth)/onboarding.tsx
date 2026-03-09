import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { generateUsername, generateAvatarSeed, avatarColorFromSeed } from "@/lib/username";
import { authClient, BASE_URL, BEARER_KEY } from "@/lib/auth-client";
import { registerPasskey, isPasskeySupported } from "@/lib/passkey";

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

export default function OnboardingScreen() {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);

  const [seed] = useState(generateAvatarSeed);
  const [username, setUsername] = useState(generateUsername);
  const [focused, setFocused] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const avatarColor = avatarColorFromSeed(seed);
  const avatarLetter = username.charAt(0).toUpperCase();

  function validateUsername(value: string): string | null {
    if (value.length < 3) return "At least 3 characters";
    if (value.length > 30) return "At most 30 characters";
    if (!/^[a-zA-Z0-9_]+$/.test(value)) return "Letters, numbers and _ only";
    return null;
  }

  function handleChange(value: string) {
    setUsername(value);
    setValidationError(validateUsername(value));
  }

  async function handleSave() {
    const error = validateUsername(username);
    if (error) {
      setValidationError(error);
      return;
    }

    setSaving(true);
    try {
      const authHeaders: Record<string, string> = {};
      if (Platform.OS !== "web") {
        const SecureStore = await import("expo-secure-store");
        const token = await SecureStore.getItemAsync(BEARER_KEY);
        if (token) authHeaders["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(`${BASE_URL}/api/profile`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ username, avatarSeed: seed }),
      });

      if (res.status === 409) {
        setValidationError("Username already taken — try another");
        return;
      }
      if (!res.ok) {
        const { error: msg } = await res.json();
        Alert.alert("Error", msg ?? "Failed to save profile");
        return;
      }

      if (isPasskeySupported()) {
        Alert.alert(
          "Enable Face ID sign-in?",
          "Sign in instantly next time with Face ID — no email needed.",
          [
            {
              text: "Skip",
              style: "cancel",
              onPress: () => router.replace("/(tabs)"),
            },
            {
              text: "Enable",
              onPress: async () => {
                try {
                  const { data } = await authClient.getSession();
                  const token = data?.session?.token;
                  if (token) {
                    const SS = await import("expo-secure-store");
                    await SS.setItemAsync(BEARER_KEY, token);
                    await registerPasskey(token);
                  }
                } catch {
                  // passkey registration failed or was cancelled — not critical
                } finally {
                  router.replace("/(tabs)");
                }
              },
            },
          ]
        );
      } else {
        router.replace("/(tabs)");
      }
    } catch {
      Alert.alert("Error", "Could not save profile. Check your connection.");
    } finally {
      setSaving(false);
    }
  }

  function handleShuffle() {
    const next = generateUsername();
    setUsername(next);
    setValidationError(null);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.inner}>
        <View style={styles.header}>
          <Text style={styles.title}>Choose your name</Text>
          <Text style={styles.subtitle}>
            This is how other Muvi users will see you
          </Text>
        </View>

        {/* Avatar */}
        <TouchableOpacity style={styles.avatarWrap} onPress={handleShuffle} activeOpacity={0.8}>
          <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarLetter}>{avatarLetter}</Text>
          </View>
          <Text style={styles.shuffleHint}>Tap to shuffle</Text>
        </TouchableOpacity>

        {/* Username input */}
        <View style={styles.inputSection}>
          <View style={[styles.inputWrap, focused && styles.inputWrapFocused]}>
            <Text style={styles.at}>@</Text>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={username}
              onChangeText={handleChange}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={30}
              returnKeyType="done"
              onSubmitEditing={handleSave}
              placeholderTextColor={C.muted}
            />
          </View>
          {validationError ? (
            <Text style={styles.errorText}>{validationError}</Text>
          ) : (
            <Text style={styles.hintText}>
              {username.length}/30 characters
            </Text>
          )}
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveButton, (saving || !!validationError) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving || !!validationError}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color={C.text} />
          ) : (
            <Text style={styles.saveLabel}>Let's go</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: "center",
    gap: 32,
  },
  header: {
    gap: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: C.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: C.muted,
    lineHeight: 22,
  },
  avatarWrap: {
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    fontSize: 42,
    fontWeight: "700",
    color: "#fff",
  },
  shuffleHint: {
    fontSize: 13,
    color: C.muted,
  },
  inputSection: {
    gap: 8,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: 16,
    height: 52,
  },
  inputWrapFocused: {
    borderColor: C.borderFocus,
  },
  at: {
    fontSize: 17,
    color: C.muted,
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontSize: 17,
    color: C.text,
    paddingVertical: 0,
  },
  hintText: {
    fontSize: 12,
    color: C.muted,
    paddingHorizontal: 4,
  },
  errorText: {
    fontSize: 12,
    color: C.error,
    paddingHorizontal: 4,
  },
  saveButton: {
    backgroundColor: C.accent,
    borderRadius: 14,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveLabel: {
    fontSize: 17,
    fontWeight: "600",
    color: C.text,
  },
});
