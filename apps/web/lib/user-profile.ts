import { db } from "./db";

db.exec(`
  CREATE TABLE IF NOT EXISTS user_profile (
    user_id   TEXT PRIMARY KEY,
    display_name    TEXT,
    age       INTEGER,
    country   TEXT,
    language  TEXT,
    platforms TEXT,
    favorite_movie  TEXT,
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  )
`);

export type UserProfile = {
  user_id: string;
  display_name: string | null;
  age: number | null;
  country: string | null;
  language: string | null;
  platforms: string[] | null;
  favorite_movie: string | null;
};

type RawRow = Omit<UserProfile, "platforms"> & { platforms: string | null };

export function getUserProfile(userId: string): UserProfile | null {
  const row = db
    .prepare(`SELECT * FROM user_profile WHERE user_id = ?`)
    .get(userId) as RawRow | undefined;
  if (!row) return null;
  return {
    ...row,
    platforms: row.platforms ? (JSON.parse(row.platforms) as string[]) : null,
  };
}

export function upsertUserProfile(
  userId: string,
  fields: Partial<Omit<UserProfile, "user_id">>
): void {
  const current = getUserProfile(userId);
  const merged = {
    display_name: fields.display_name ?? current?.display_name ?? null,
    age: fields.age ?? current?.age ?? null,
    country: fields.country ?? current?.country ?? null,
    language: fields.language ?? current?.language ?? null,
    platforms:
      fields.platforms !== undefined
        ? JSON.stringify(fields.platforms)
        : current?.platforms
          ? JSON.stringify(current.platforms)
          : null,
    favorite_movie: fields.favorite_movie ?? current?.favorite_movie ?? null,
  };
  db.prepare(`
    INSERT INTO user_profile (user_id, display_name, age, country, language, platforms, favorite_movie, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, unixepoch())
    ON CONFLICT(user_id) DO UPDATE SET
      display_name   = excluded.display_name,
      age            = excluded.age,
      country        = excluded.country,
      language       = excluded.language,
      platforms      = excluded.platforms,
      favorite_movie = excluded.favorite_movie,
      updated_at     = excluded.updated_at
  `).run(
    userId,
    merged.display_name,
    merged.age,
    merged.country,
    merged.language,
    merged.platforms,
    merged.favorite_movie
  );
}
