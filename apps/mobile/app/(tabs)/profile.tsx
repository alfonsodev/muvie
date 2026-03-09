import { authClient, BASE_URL, BEARER_KEY } from "@/lib/auth-client";
import { avatarColorFromSeed } from "@/lib/username";
import { useFocusEffect } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const C = {
  bg: "#212121",
  surface: "#2f2f2f",
  border: "#3d3d3d",
  text: "#ececec",
  muted: "#8e8ea0",
  accent: "#6c63ff",
  danger: "#ff6b6b",
};

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
  const res = await fetch(`${BASE_URL}/api/user-profile`, {
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

  const load = useCallback(async () => {
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
        {/* Avatar + username */}
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
              <ActivityIndicator color={C.muted} />
            </View>
          ) : !hasPrefs ? (
            <View style={styles.emptyPrefs}>
              <Text style={styles.emptyPrefsText}>
                No preferences saved yet.{"\n"}Chat with Muvi and it will learn your taste automatically.
              </Text>
            </View>
          ) : (
            <View style={styles.prefsList}>
              {profile?.display_name && (
                <PrefRow icon="👤" label="Name" value={profile.display_name} />
              )}
              {profile?.age && (
                <PrefRow icon="🎂" label="Age" value={String(profile.age)} />
              )}
              {profile?.country && (
                <PrefRow icon="📍" label="Country" value={profile.country} />
              )}
              {profile?.language && (
                <PrefRow icon="🗣️" label="Language" value={profile.language.toUpperCase()} />
              )}
              {profile?.platforms && profile.platforms.length > 0 && (
                <PrefRow
                  icon="📺"
                  label="Platforms"
                  value={profile.platforms.join(", ")}
                />
              )}
              {profile?.favorite_movie && (
                <PrefRow icon="🎬" label="Favorite" value={profile.favorite_movie} />
              )}
            </View>
          )}
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.7}>
          <Text style={styles.signOutLabel}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function PrefRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.prefRow}>
      <Text style={styles.prefIcon}>{icon}</Text>
      <View style={styles.prefContent}>
        <Text style={styles.prefLabel}>{label}</Text>
        <Text style={styles.prefValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  header: {
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
    textAlign: "center",
  },

  scroll: {
    paddingBottom: 48,
  },

  // Avatar section
  avatarSection: {
    alignItems: "center",
    paddingTop: 36,
    paddingBottom: 32,
    gap: 8,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  avatarLetter: {
    fontSize: 38,
    fontWeight: "700",
    color: "#fff",
  },
  username: {
    fontSize: 20,
    fontWeight: "700",
    color: C.text,
    letterSpacing: -0.3,
  },
  email: {
    fontSize: 14,
    color: C.muted,
  },

  // Preferences section
  section: {
    marginHorizontal: 16,
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  loadingWrap: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyPrefs: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  emptyPrefsText: {
    color: C.muted,
    fontSize: 14,
    lineHeight: 22,
  },
  prefsList: {
    paddingBottom: 8,
  },
  prefRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
    gap: 12,
  },
  prefIcon: {
    fontSize: 20,
    width: 28,
    textAlign: "center",
  },
  prefContent: {
    flex: 1,
  },
  prefLabel: {
    fontSize: 12,
    color: C.muted,
    marginBottom: 2,
  },
  prefValue: {
    fontSize: 15,
    color: C.text,
    fontWeight: "500",
  },

  // Sign out
  signOutBtn: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: C.danger + "55",
    borderRadius: 14,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  signOutLabel: {
    color: C.danger,
    fontSize: 15,
    fontWeight: "600",
  },
});
