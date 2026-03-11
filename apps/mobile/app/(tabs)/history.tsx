import { T } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type HistoryEntry = {
  id: number;
  title: string;
  subtitle: string;
  quality: "4K" | "HD" | null;
  rating: number; // 0–5
  liked: boolean | null; // true=liked, false=disliked, null=no vote
  poster: string;
};

type Filter = "All" | "Movies" | "Series" | "Docs";

const PLACEHOLDER = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

const HISTORY: { section: string; entries: HistoryEntry[] }[] = [
  {
    section: "Today",
    entries: [
      { id: 1, title: "Cyber Nexus", subtitle: "Movie • 2h 14m", quality: "4K", rating: 4, liked: true, poster: PLACEHOLDER },
      { id: 2, title: "Wild Horizon", subtitle: "Series • S02 E04", quality: "HD", rating: 5, liked: null, poster: PLACEHOLDER },
    ],
  },
  {
    section: "Yesterday",
    entries: [
      { id: 3, title: "The Last Echo", subtitle: "Movie • 1h 45m", quality: "4K", rating: 3, liked: false, poster: PLACEHOLDER },
      { id: 4, title: "Century of Art", subtitle: "Documentary • 52m", quality: "4K", rating: 4, liked: null, poster: PLACEHOLDER },
    ],
  },
];

const FILTERS: Filter[] = ["All", "Movies", "Series", "Docs"];

export default function HistoryScreen() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<Filter>("All");

  const filtered = HISTORY.map(({ section, entries }) => ({
    section,
    entries: entries.filter((e) => {
      if (search && !e.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (activeFilter === "Movies" && !e.subtitle.startsWith("Movie")) return false;
      if (activeFilter === "Series" && !e.subtitle.startsWith("Series")) return false;
      if (activeFilter === "Docs" && !e.subtitle.startsWith("Documentary")) return false;
      return true;
    }),
  })).filter((g) => g.entries.length > 0);

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Watching History</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerBtn}>
            <Ionicons name="trash-outline" size={20} color={T.muted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn}>
            <Ionicons name="ellipsis-vertical" size={20} color={T.muted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search + Filters */}
      <View style={styles.controls}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color={T.primary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search watched titles"
            placeholderTextColor={T.dim}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
              onPress={() => setActiveFilter(f)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterLabel, activeFilter === f && styles.filterLabelActive]}>{f}</Text>
              {f !== "All" && <Ionicons name="chevron-down" size={13} color={activeFilter === f ? "#fff" : T.muted} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="time-outline" size={48} color={T.dim} />
            <Text style={styles.emptyText}>No history found</Text>
          </View>
        ) : (
          filtered.map(({ section, entries }) => (
            <View key={section}>
              <Text style={styles.sectionLabel}>{section.toUpperCase()}</Text>
              {entries.map((entry) => (
                <HistoryRow key={entry.id} entry={entry} />
              ))}
            </View>
          ))
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= rating ? "star" : "star-outline"}
          size={15}
          color={i <= rating ? T.primary : T.dim}
        />
      ))}
    </View>
  );
}

function HistoryRow({ entry }: { entry: HistoryEntry }) {
  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.8}>
      {/* Thumbnail */}
      <View style={styles.thumb}>
        <Image source={entry.poster} style={styles.thumbImg} contentFit="cover" tintColor="#2d1640" />
        {entry.quality && (
          <View style={[styles.qualityBadge, entry.quality === "4K" ? styles.qualityPrimary : styles.qualityGray]}>
            <Text style={styles.qualityText}>{entry.quality}</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{entry.title}</Text>
        <Text style={styles.subtitle}>{entry.subtitle}</Text>
        <StarRating rating={entry.rating} />
      </View>

      {/* Like button */}
      <TouchableOpacity style={[styles.likeBtn, entry.liked === false && styles.dislikeBtn]} hitSlop={8}>
        {entry.liked === false ? (
          <Ionicons name="thumbs-down" size={20} color="#ef4444" />
        ) : (
          <Ionicons
            name={entry.liked === true ? "thumbs-up" : "thumbs-up-outline"}
            size={20}
            color={entry.liked === true ? T.primary : T.dim}
          />
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  flex: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: T.text,
    letterSpacing: -0.3,
  },
  headerActions: { flexDirection: "row", gap: 4 },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },

  controls: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    height: 46,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchIcon: { flexShrink: 0 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: T.text,
    paddingVertical: 0,
  },
  filterScroll: { gap: 8, paddingVertical: 2, paddingRight: 4 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
  },
  filterChipActive: {
    backgroundColor: T.primary,
    borderColor: T.primary,
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  filterLabel: { fontSize: 14, fontWeight: "500", color: T.muted },
  filterLabelActive: { color: "#fff", fontWeight: "600" },

  listContent: { paddingHorizontal: 16, paddingTop: 20 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: T.dim,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 10,
    marginTop: 8,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: T.surfaceWhite,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    padding: 12,
    marginBottom: 10,
  },

  thumb: {
    width: 112,
    height: 72,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: T.surface,
    flexShrink: 0,
  },
  thumbImg: { width: "100%", height: "100%" },
  qualityBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  qualityPrimary: { backgroundColor: T.primary },
  qualityGray: { backgroundColor: "rgba(0,0,0,0.7)" },
  qualityText: { fontSize: 9, fontWeight: "700", color: "#fff" },

  info: { flex: 1, gap: 3 },
  title: { fontSize: 15, fontWeight: "700", color: T.text },
  subtitle: { fontSize: 13, color: T.muted },
  stars: { flexDirection: "row", gap: 2, marginTop: 2 },

  likeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  dislikeBtn: {},

  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyText: { fontSize: 16, color: T.muted },
});
