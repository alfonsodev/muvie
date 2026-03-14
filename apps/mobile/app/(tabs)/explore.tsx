import { BASE_URL } from "@/lib/auth-client";
import { T } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { getLocales } from "expo-localization";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const TMDB_IMG = "https://image.tmdb.org/t/p/w342";

type ExploreItem = {
  id: number;
  title: string;
  mediaType: string;
  posterPath: string | null;
  rating: number | null;
  genre: string;
  year: string;
  overview: string | null;
  badge: string | null;
};

type ExploreData = {
  top10: ExploreItem[];
  trending: ExploreItem[];
  popular: ExploreItem[];
};

function posterUrl(path: string | null): string | null {
  return path ? `${TMDB_IMG}${path}` : null;
}

export default function ExploreScreen() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<ExploreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const locale = getLocales()[0];
    const country = locale?.regionCode ?? "US";
    const language = `${locale?.languageCode ?? "en"}-${locale?.regionCode ?? "US"}`;

    fetch(`${BASE_URL}/api/explore?country=${country}&language=${language}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setData(json);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const top10 = data?.top10 ?? [];
  const trending = data?.trending ?? [];
  const popular = data?.popular ?? [];

  return (
    <SafeAreaView style={styles.root}>
      {/* Sticky header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.screenTitle}>Explore</Text>
          <View style={styles.bellBtn}>
            <Ionicons name="notifications-outline" size={22} color={T.primary} />
          </View>
        </View>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color={T.dim} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Movies, shows and more"
            placeholderTextColor={T.dim}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={T.primary} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Top 10 */}
          {top10.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Top 10 Movies</Text>
                <TouchableOpacity>
                  <Text style={styles.seeAll}>See All</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
                {top10.map((movie, i) => (
                  <View key={movie.id} style={styles.rankCard}>
                    <View style={styles.rankPoster}>
                      <Image
                        source={posterUrl(movie.posterPath)}
                        style={styles.rankPosterImg}
                        contentFit="cover"
                      />
                      {movie.rating != null && (
                        <View style={styles.ratingBadge}>
                          <Ionicons name="star" size={9} color={T.star} />
                          <Text style={styles.ratingBadgeText}>{movie.rating}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.rankNumber}>{i + 1}</Text>
                    <Text style={styles.rankTitle} numberOfLines={1}>{movie.title}</Text>
                    <Text style={styles.rankGenre} numberOfLines={1}>{movie.genre}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Trending */}
          {trending.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Trending This Week</Text>
                <TouchableOpacity>
                  <Text style={styles.seeAll}>See All</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
                {trending.map((movie) => (
                  <View key={movie.id} style={styles.trendCard}>
                    <View style={styles.trendPoster}>
                      <Image
                        source={posterUrl(movie.posterPath)}
                        style={styles.trendPosterImg}
                        contentFit="cover"
                      />
                    </View>
                    <Text style={styles.trendTitle} numberOfLines={1}>{movie.title}</Text>
                    <Text style={styles.trendGenre} numberOfLines={1}>{movie.genre}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Popular this week */}
          {popular.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Popular This Week</Text>
              </View>
              <View style={styles.popularList}>
                {popular.map((movie) => (
                  <TouchableOpacity key={movie.id} style={styles.popularCard} activeOpacity={0.8}>
                    <View style={styles.popularPoster}>
                      <Image
                        source={posterUrl(movie.posterPath)}
                        style={styles.popularPosterImg}
                        contentFit="cover"
                      />
                    </View>
                    <View style={styles.popularInfo}>
                      <View style={styles.popularMeta}>
                        {movie.badge && (
                          <View style={styles.featuredBadge}>
                            <Text style={styles.featuredBadgeText}>{movie.badge}</Text>
                          </View>
                        )}
                        {movie.rating != null && (
                          <View style={styles.starRow}>
                            <Ionicons name="star" size={11} color={T.star} />
                            <Text style={styles.starText}>{movie.rating}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.popularTitle}>{movie.title}</Text>
                      {movie.overview && (
                        <Text style={styles.popularDesc} numberOfLines={2}>{movie.overview}</Text>
                      )}
                      <View style={styles.tagRow}>
                        {movie.genre && <View style={styles.tag}><Text style={styles.tagText}>{movie.genre}</Text></View>}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  flex: { flex: 1 },
  content: { paddingBottom: 24 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { color: T.error, fontSize: 14, textAlign: "center", paddingHorizontal: 24 },

  // Header
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: T.text,
    letterSpacing: -0.3,
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    height: 46,
    paddingHorizontal: 14,
    gap: 8,
  },
  searchIcon: { flexShrink: 0 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: T.text,
    paddingVertical: 0,
  },

  // Sections
  section: { marginTop: 28, paddingHorizontal: 16 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: T.text,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: "600",
    color: T.primary,
  },
  hScroll: { gap: 14, paddingRight: 4 },

  // Top 10 cards
  rankCard: { width: 160 },
  rankPoster: {
    aspectRatio: 2 / 3,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    marginBottom: 20,
  },
  rankPosterImg: { width: "100%", height: "100%" },
  ratingBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  ratingBadgeText: { fontSize: 11, fontWeight: "700", color: "#fff" },
  rankNumber: {
    position: "absolute",
    bottom: 4,
    left: -6,
    fontSize: 72,
    fontWeight: "900",
    color: T.primary,
    opacity: 0.85,
    lineHeight: 72,
  },
  rankTitle: { fontSize: 13, fontWeight: "600", color: T.text, marginTop: 2 },
  rankGenre: { fontSize: 11, color: T.muted, marginTop: 2 },

  // Trending cards
  trendCard: { width: 140 },
  trendPoster: {
    aspectRatio: 2 / 3,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    marginBottom: 8,
  },
  trendPosterImg: { width: "100%", height: "100%" },
  trendTitle: { fontSize: 13, fontWeight: "600", color: T.text },
  trendGenre: { fontSize: 11, color: T.muted, marginTop: 2 },

  // Popular list
  popularList: { gap: 12 },
  popularCard: {
    flexDirection: "row",
    gap: 14,
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    padding: 12,
  },
  popularPoster: {
    width: 90,
    height: 120,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "rgba(175,37,244,0.12)",
    flexShrink: 0,
  },
  popularPosterImg: { width: "100%", height: "100%" },
  popularInfo: { flex: 1, justifyContent: "center", gap: 6 },
  popularMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  featuredBadge: {
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  featuredBadgeText: { fontSize: 10, fontWeight: "700", color: T.primary, textTransform: "uppercase" },
  starRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  starText: { fontSize: 12, color: T.star, fontWeight: "600" },
  popularTitle: { fontSize: 16, fontWeight: "700", color: T.text, lineHeight: 20 },
  popularDesc: { fontSize: 13, color: T.muted, lineHeight: 18 },
  tagRow: { flexDirection: "row", gap: 6, marginTop: 2 },
  tag: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: { fontSize: 11, color: T.muted },
});
