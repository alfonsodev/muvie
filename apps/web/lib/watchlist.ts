import { db } from "./db";

// Create table on module load
db.exec(`
  CREATE TABLE IF NOT EXISTS watchlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    tmdb_id INTEGER NOT NULL,
    media_type TEXT NOT NULL CHECK(media_type IN ('movie', 'tv')),
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'want_to_watch' CHECK(status IN ('want_to_watch', 'watched')),
    added_at INTEGER NOT NULL DEFAULT (unixepoch()),
    UNIQUE(user_id, tmdb_id, media_type)
  )
`);

export type WatchlistItem = {
  id: number;
  tmdb_id: number;
  media_type: string;
  title: string;
  status: "want_to_watch" | "watched";
  added_at: number;
};

export function upsertWatchlistItem(
  userId: string,
  tmdbId: number,
  mediaType: "movie" | "tv",
  title: string,
  status: "want_to_watch" | "watched"
): void {
  db.prepare(`
    INSERT INTO watchlist (user_id, tmdb_id, media_type, title, status)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, tmdb_id, media_type)
    DO UPDATE SET status = excluded.status, title = excluded.title
  `).run(userId, tmdbId, mediaType, title, status);
}

export function deleteWatchlistItem(
  userId: string,
  tmdbId: number,
  mediaType: "movie" | "tv"
): boolean {
  const result = db
    .prepare(
      `DELETE FROM watchlist WHERE user_id = ? AND tmdb_id = ? AND media_type = ?`
    )
    .run(userId, tmdbId, mediaType);
  return result.changes > 0;
}

export function listWatchlist(
  userId: string,
  filter?: "want_to_watch" | "watched"
): WatchlistItem[] {
  if (filter) {
    return db
      .prepare(
        `SELECT id, tmdb_id, media_type, title, status, added_at
         FROM watchlist WHERE user_id = ? AND status = ?
         ORDER BY added_at DESC`
      )
      .all(userId, filter) as WatchlistItem[];
  }
  return db
    .prepare(
      `SELECT id, tmdb_id, media_type, title, status, added_at
       FROM watchlist WHERE user_id = ?
       ORDER BY added_at DESC`
    )
    .all(userId) as WatchlistItem[];
}
