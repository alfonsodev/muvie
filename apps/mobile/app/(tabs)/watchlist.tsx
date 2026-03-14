import { BEARER_KEY } from "@/lib/auth-client";
import { AppConfig } from "@/lib/config";
import { T } from "@/lib/theme";
import { Image } from "expo-image";
import { getLocales } from "expo-localization";
import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const C = {
  bg: T.bg,
  surface: T.surface,
  border: T.border,
  text: T.text,
  muted: T.muted,
  accent: T.primary,
  watched: "#22c55e",
  toWatch: T.primary,
};

const TMDB_IMAGE = "https://image.tmdb.org/t/p";
const country = getLocales()[0]?.regionCode ?? "US";

type Provider = { name: string; logo: string };
type WatchlistEntry = {
  id: number;
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  status: "want_to_watch" | "watched";
  addedAt: number;
  posterPath: string | null;
  runtime: string | null;
  providers: { link: string | null; flatrate: Provider[] };
};

type Filter = "all" | "want_to_watch" | "watched";

async function fetchWatchlist(token: string): Promise<WatchlistEntry[]> {
  const res = await fetch(
    `${AppConfig.apiBaseUrl}/api/watchlist?country=${country}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function removeFromWatchlist(
  token: string,
  tmdbId: number,
  mediaType: string
): Promise<void> {
  await fetch(`${AppConfig.apiBaseUrl}/api/watchlist`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ tmdbId, mediaType }),
  });
}

export default function WatchlistScreen() {
  const [items, setItems] = useState<WatchlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [token, setToken] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const t = (await SecureStore.getItemAsync(BEARER_KEY)) ?? "";
      setToken(t);
      const data = await fetchWatchlist(t);
      setItems(data);
    } catch (e) {
      console.error("[watchlist] load error", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(load);

  const handleRemove = async (entry: WatchlistEntry) => {
    setItems((prev) => prev.filter((i) => i.id !== entry.id));
    await removeFromWatchlist(token, entry.tmdbId, entry.mediaType);
  };

  const filtered =
    filter === "all" ? items : items.filter((i) => i.status === filter);

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My List</Text>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {(["all", "want_to_watch", "watched"] as Filter[]).map((f) => (
          <Pressable
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                styles.filterLabel,
                filter === f && styles.filterLabelActive,
              ]}
            >
              {f === "all" ? "All" : f === "want_to_watch" ? "To Watch" : "Watched"}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={C.muted} />
        </View>
      ) : filtered.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {filtered.map((entry) => (
            <WatchlistCard
              key={entry.id}
              entry={entry}
              onRemove={() => handleRemove(entry)}
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function WatchlistCard({
  entry,
  onRemove,
}: {
  entry: WatchlistEntry;
  onRemove: () => void;
}) {
  const posterUri = entry.posterPath
    ? `${TMDB_IMAGE}/w185${entry.posterPath}`
    : null;

  const isWatched = entry.status === "watched";

  return (
    <View style={styles.card}>
      {/* Poster */}
      <View style={styles.posterWrap}>
        {posterUri ? (
          <Image
            source={{ uri: posterUri }}
            style={styles.poster}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[styles.poster, styles.posterPlaceholder]}>
            <Text style={styles.posterPlaceholderText}>🎬</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.badge,
              { backgroundColor: isWatched ? "#16532a" : "#312e7a" },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                { color: isWatched ? C.watched : C.toWatch },
              ]}
            >
              {isWatched ? "Watched" : "To Watch"}
            </Text>
          </View>
          <View style={styles.badge}>
            <Text style={[styles.badgeText, { color: C.muted }]}>
              {entry.mediaType === "movie" ? "Movie" : "Series"}
            </Text>
          </View>
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {entry.title}
        </Text>

        {entry.runtime ? (
          <Text style={styles.runtime}>{entry.runtime}</Text>
        ) : null}

        {/* Platform icons */}
        {entry.providers.flatrate.length > 0 && (
          <TouchableOpacity
            style={styles.providersRow}
            activeOpacity={entry.providers.link ? 0.6 : 1}
            onPress={() => {
              if (entry.providers.link) Linking.openURL(entry.providers.link);
            }}
          >
            {entry.providers.flatrate.map((p) => (
              <Image
                key={p.name}
                source={{ uri: `${TMDB_IMAGE}/w45${p.logo}` }}
                style={styles.providerLogo}
                contentFit="cover"
              />
            ))}
            {entry.providers.link && (
              <Text style={styles.whereToWatch}>Where to watch →</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Remove button */}
      <Pressable style={styles.removeBtn} onPress={onRemove} hitSlop={8}>
        <Text style={styles.removeBtnText}>✕</Text>
      </Pressable>
    </View>
  );
}

function EmptyState({ filter }: { filter: Filter }) {
  const label =
    filter === "watched"
      ? "You haven't marked anything as watched yet"
      : filter === "want_to_watch"
      ? "Your watchlist is empty"
      : "Your list is empty";
  return (
    <View style={styles.center}>
      <Text style={styles.emptyEmoji}>🍿</Text>
      <Text style={styles.emptyText}>{label}</Text>
      <Text style={styles.emptyHint}>
        Ask the chat for a recommendation and save it here
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: C.text,
    letterSpacing: -0.3,
    textAlign: "center",
  },

  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: C.surface,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  filterBtnActive: {
    backgroundColor: C.accent,
    borderColor: C.accent,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: C.muted,
  },
  filterLabelActive: {
    color: "#fff",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: {
    color: C.text,
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  emptyHint: {
    color: C.muted,
    fontSize: 14,
    textAlign: "center",
  },

  list: {
    padding: 16,
    gap: 12,
  },

  card: {
    flexDirection: "row",
    backgroundColor: C.surface,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.border,
  },

  posterWrap: {
    width: 90,
    height: 130,
  },
  poster: {
    width: 90,
    height: 130,
  },
  posterPlaceholder: {
    backgroundColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
  },
  posterPlaceholderText: { fontSize: 28 },

  info: {
    flex: 1,
    padding: 12,
    justifyContent: "space-between",
  },

  badgeRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 6,
  },
  badge: {
    backgroundColor: "#1a1a1a",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  title: {
    color: C.text,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
    marginBottom: 4,
  },

  runtime: {
    color: C.muted,
    fontSize: 13,
    marginBottom: 8,
  },

  providersRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  providerLogo: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  whereToWatch: {
    color: C.accent,
    fontSize: 12,
    fontWeight: "500",
  },

  removeBtn: {
    padding: 10,
    alignSelf: "flex-start",
  },
  removeBtnText: {
    color: C.muted,
    fontSize: 14,
  },
});
