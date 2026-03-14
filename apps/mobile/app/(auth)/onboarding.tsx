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
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { generateUsername, generateAvatarSeed, avatarColorFromSeed } from "@/lib/username";
import { authClient, BEARER_KEY } from "@/lib/auth-client";
import { AppConfig } from "@/lib/config";
import { registerPasskey, isPasskeySupported } from "@/lib/passkey";
import { T } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";

const GENRES = ["Sci-Fi", "Action", "Drama", "Horror", "Comedy", "Thriller", "Fantasy", "Romance"];

export default function OnboardingScreen() {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);

  const [seed] = useState(generateAvatarSeed);
  const [username, setUsername] = useState(generateUsername);
  const [focused, setFocused] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

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

  function toggleGenre(genre: string) {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
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
      const res = await fetch(`${AppConfig.apiBaseUrl}/api/profile`, {
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
            { text: "Skip", style: "cancel", onPress: () => router.replace("/(tabs)") },
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
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Complete Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarWrap} onPress={handleShuffle} activeOpacity={0.8}>
            <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
              <Text style={styles.avatarLetter}>{avatarLetter}</Text>
            </View>
            <View style={styles.editBadge}>
              <Ionicons name="pencil" size={14} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.uploadTitle}>Choose your username</Text>
          <Text style={styles.uploadSubtitle}>Tap avatar to shuffle color</Text>
        </View>

        {/* Username input */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Username</Text>
          <View style={[styles.inputWrap, focused && styles.inputWrapFocused]}>
            <Ionicons name="at" size={18} color={T.dim} style={styles.inputIcon} />
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
              placeholderTextColor={T.dim}
            />
          </View>
          {validationError ? (
            <Text style={styles.errorText}>{validationError}</Text>
          ) : (
            <Text style={styles.hintText}>{username.length}/30 characters</Text>
          )}
        </View>

        {/* Favorite Genres */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Favorite Genres</Text>
          <View style={styles.genreGrid}>
            {GENRES.map((genre) => {
              const selected = selectedGenres.includes(genre);
              return (
                <TouchableOpacity
                  key={genre}
                  style={[styles.genreChip, selected && styles.genreChipActive]}
                  onPress={() => toggleGenre(genre)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.genreLabel, selected && styles.genreLabelActive]}>
                    {genre}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.saveBtn, (saving || !!validationError) && styles.btnDisabled]}
            onPress={handleSave}
            disabled={saving || !!validationError}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnLabel}>Let us go</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => router.replace("/(tabs)")}
            activeOpacity={0.7}
          >
            <Text style={styles.skipLabel}>Skip for now</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },

  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: T.text,
    letterSpacing: -0.2,
  },

  scroll: { paddingHorizontal: 24, paddingTop: 32 },

  avatarSection: { alignItems: "center", marginBottom: 32, gap: 8 },
  avatarWrap: { position: "relative" },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: T.border,
  },
  avatarLetter: { fontSize: 44, fontWeight: "700", color: "#fff" },
  editBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: T.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: T.bg,
  },
  uploadTitle: { fontSize: 20, fontWeight: "700", color: T.text, marginTop: 4 },
  uploadSubtitle: { fontSize: 13, color: T.primary, opacity: 0.8 },

  field: { marginBottom: 24, gap: 8 },
  fieldLabel: { fontSize: 14, fontWeight: "600", color: T.muted, marginLeft: 4 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: T.border,
    height: 54,
    paddingHorizontal: 14,
    gap: 10,
  },
  inputWrapFocused: { borderColor: T.primary },
  inputIcon: { flexShrink: 0 },
  input: { flex: 1, fontSize: 17, color: T.text, paddingVertical: 0 },
  errorText: { fontSize: 12, color: T.error, paddingHorizontal: 4 },
  hintText: { fontSize: 12, color: T.dim, paddingHorizontal: 4 },

  genreGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  genreChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: T.surface,
    borderWidth: 1.5,
    borderColor: T.border,
  },
  genreChipActive: {
    backgroundColor: T.primary,
    borderColor: T.primary,
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  genreLabel: { fontSize: 14, fontWeight: "500", color: T.muted },
  genreLabelActive: { color: "#fff", fontWeight: "600" },

  actions: { gap: 12, marginTop: 8 },
  saveBtn: {
    height: 56,
    borderRadius: 14,
    backgroundColor: T.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  btnDisabled: { opacity: 0.5 },
  saveBtnLabel: { fontSize: 17, fontWeight: "700", color: "#fff" },
  skipBtn: {
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
  },
  skipLabel: { fontSize: 16, fontWeight: "500", color: T.primary },
});
