import { authClient, BEARER_KEY } from "@/lib/auth-client";
import { AppConfig } from "@/lib/config";
import { T } from "@/lib/theme";
import { avatarColorFromSeed } from "@/lib/username";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type UserProfile = {
  empty?: boolean;
  display_name: string | null;
  age: number | null;
  country: string | null;
  language: string | null;
  platforms: string[] | null;
  favorite_movie: string | null;
};

async function fetchUserProfile(token: string): Promise<UserProfile | null> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${AppConfig.apiBaseUrl}/api/user-profile`, {
    credentials: "include",
    headers,
  });
  if (!res.ok) return null;
  return res.json();
}

export default function ProfileScreen() {
  const { data: session } = authClient.useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const user = session?.user as
    | (Record<string, unknown> & { username?: string | null; avatarSeed?: string | null })
    | undefined;

  const username = user?.username as string | null | undefined;
  const avatarSeed = (user?.avatarSeed as string | null | undefined) ?? username ?? "default";
  const avatarColor = avatarColorFromSeed(avatarSeed);
  const avatarLetter = (username ?? "?").charAt(0).toUpperCase();

  const load = useCallback(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const token = Platform.OS !== "web"
          ? (await SecureStore.getItemAsync(BEARER_KEY)) ?? ""
          : "";
        const data = await fetchUserProfile(token);
        setProfile(data);
      } catch (e) {
        console.error("[profile] load error", e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  useFocusEffect(load);

  async function handleSignOut() {
    await authClient.signOut();
    if (Platform.OS !== "web") {
      await SecureStore.deleteItemAsync(BEARER_KEY);
    }
  }

  const hasPrefs =
    profile &&
    !profile.empty &&
    (profile.display_name ||
      profile.country ||
      profile.platforms?.length ||
      profile.favorite_movie ||
      profile.age);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Avatar section */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarLetter}>{avatarLetter}</Text>
          </View>
          <Text style={styles.username}>@{username ?? "…"}</Text>
          <Text style={styles.email}>{user?.email as string | undefined}</Text>
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Movie preferences</Text>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={T.primary} />
            </View>
          ) : !hasPrefs ? (
            <View style={styles.emptyPrefs}>
              <Text style={styles.emptyPrefsText}>
                No preferences saved yet.{"\n"}Chat with Muvie and it will learn your taste automatically.
              </Text>
            </View>
          ) : (
            <View style={styles.prefsList}>
              {profile?.display_name && (
                <PrefRow icon="person-outline" label="Name" value={profile.display_name} />
              )}
              {profile?.age && (
                <PrefRow icon="calendar-outline" label="Age" value={String(profile.age)} />
              )}
              {profile?.country && (
                <PrefRow icon="location-outline" label="Country" value={profile.country} />
              )}
              {profile?.language && (
                <PrefRow icon="language-outline" label="Language" value={profile.language.toUpperCase()} />
              )}
              {profile?.platforms && profile.platforms.length > 0 && (
                <PrefRow icon="tv-outline" label="Platforms" value={profile.platforms.join(", ")} />
              )}
              {profile?.favorite_movie && (
                <PrefRow icon="film-outline" label="Favorite" value={profile.favorite_movie} />
              )}
            </View>
          )}
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={18} color={T.danger} />
          <Text style={styles.signOutLabel}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function PrefRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.prefRow}>
      <View style={styles.prefIconWrap}>
        <Ionicons name={icon} size={18} color={T.primary} />
      </View>
      <View style={styles.prefContent}>
        <Text style={styles.prefLabel}>{label}</Text>
        <Text style={styles.prefValue}>{value}</Text>
      </View>
    </View>
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

  scroll: { paddingBottom: 48 },

  avatarSection: {
    alignItems: "center",
    paddingTop: 36,
    paddingBottom: 32,
    gap: 8,
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    borderWidth: 3,
    borderColor: T.border,
  },
  avatarLetter: { fontSize: 40, fontWeight: "700", color: "#fff" },
  username: {
    fontSize: 22,
    fontWeight: "700",
    color: T.text,
    letterSpacing: -0.3,
  },
  email: { fontSize: 14, color: T.muted },

  section: {
    marginHorizontal: 16,
    backgroundColor: T.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    overflow: "hidden",
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: T.dim,
    textTransform: "uppercase",
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  loadingWrap: { paddingVertical: 24, alignItems: "center" },
  emptyPrefs: { paddingHorizontal: 16, paddingBottom: 20 },
  emptyPrefsText: { color: T.muted, fontSize: 14, lineHeight: 22 },
  prefsList: { paddingBottom: 8 },
  prefRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: T.border,
    gap: 12,
  },
  prefIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
  },
  prefContent: { flex: 1 },
  prefLabel: { fontSize: 12, color: T.dim, marginBottom: 2 },
  prefValue: { fontSize: 15, color: T.text, fontWeight: "500" },

  signOutBtn: {
    marginHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: `${T.danger}44`,
    borderRadius: 14,
    height: 54,
  },
  signOutLabel: { color: T.danger, fontSize: 15, fontWeight: "600" },
});
