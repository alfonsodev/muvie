import { BASE_URL } from "@/lib/auth-client";
import { T } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { getLocales } from "expo-localization";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
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

function AskMuvieFab({ onPress }: { onPress: () => void }) {
  const scale = useSharedValue(1);
  const glow = useSharedValue(0.5);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 1200, easing: Easing.inOut(Easing.sine) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sine) })
      ),
      -1,
      false
    );
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sine) }),
        withTiming(0.5, { duration: 1200, easing: Easing.inOut(Easing.sine) })
      ),
      -1,
      false
    );
  }, []);

  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: glow.value * 0.6,
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(400).springify().damping(14)}
      style={[styles.fab, fabStyle]}
    >
      <TouchableOpacity
        style={styles.fabInner}
        activeOpacity={0.85}
        onPress={onPress}
      >
        <Ionicons name="sparkles" size={18} color="#fff" />
        <Text style={styles.fabText}>Ask Muvie</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
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
      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoIcon}>
            <Ionicons name="film-outline" size={20} color={T.primary} />
          </View>
          <Text style={styles.headerTitle}>Muvie</Text>
        </View>
        <View style={styles.bellBtn}>
          <Ionicons name="notifications-outline" size={22} color={T.primary} />
        </View>
      </Animated.View>

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
            <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Top 10 Movies</Text>
                <TouchableOpacity>
                  <Text style={styles.seeAll}>See All</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
                {top10.map((movie, i) => (
                  <Animated.View
                    key={movie.id}
                    entering={FadeInDown.delay(120 + i * 60).duration(400)}
                    style={styles.rankCard}
                  >
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
                  </Animated.View>
                ))}
              </ScrollView>
            </Animated.View>
          )}

          {/* Trending */}
          {trending.length > 0 && (
            <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Trending This Week</Text>
                <TouchableOpacity>
                  <Text style={styles.seeAll}>See All</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
                {trending.map((movie, i) => (
                  <Animated.View
                    key={movie.id}
                    entering={FadeInDown.delay(220 + i * 60).duration(400)}
                    style={styles.trendCard}
                  >
                    <View style={styles.trendPoster}>
                      <Image
                        source={posterUrl(movie.posterPath)}
                        style={styles.trendPosterImg}
                        contentFit="cover"
                      />
                    </View>
                    <Text style={styles.trendTitle} numberOfLines={1}>{movie.title}</Text>
                    <Text style={styles.trendGenre} numberOfLines={1}>{movie.genre}</Text>
                  </Animated.View>
                ))}
              </ScrollView>
            </Animated.View>
          )}

          {/* Popular this week */}
          {popular.length > 0 && (
            <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Popular This Week</Text>
              </View>
              <View style={styles.popularList}>
                {popular.map((movie, i) => (
                  <Animated.View
                    key={movie.id}
                    entering={FadeInDown.delay(320 + i * 80).duration(400)}
                  >
                    <TouchableOpacity style={styles.popularCard} activeOpacity={0.8}>
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
                  </Animated.View>
                ))}
              </View>
            </Animated.View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      <AskMuvieFab onPress={() => router.push("/chat")} />
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
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

  // Sections
  section: { marginTop: 28, paddingHorizontal: 16 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 19, fontWeight: "700", color: T.text },
  seeAll: { fontSize: 14, fontWeight: "600", color: T.primary },
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

  // FAB
  fab: {
    position: "absolute",
    bottom: 28,
    alignSelf: "center",
    borderRadius: 30,
    backgroundColor: T.primary,
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
    elevation: 8,
  },
  fabInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
  },
  fabText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.2,
  },
});
