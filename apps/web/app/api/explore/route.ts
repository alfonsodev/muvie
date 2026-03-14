import { NextRequest, NextResponse } from "next/server";

const TMDB_BASE = "https://api.themoviedb.org/3";

const GENRE_MAP: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
  99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
  27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Sci-Fi",
  53: "Thriller", 10752: "War", 37: "Western",
  // TV
  10759: "Action & Adventure", 10762: "Kids", 10763: "News", 10764: "Reality",
  10765: "Sci-Fi & Fantasy", 10766: "Soap", 10767: "Talk", 10768: "War & Politics",
};

async function tmdbFetch(path: string) {
  const token = process.env.TMDB_API_READ_TOKEN;
  if (!token) throw new Error("TMDB_API_READ_TOKEN is not set");
  const res = await fetch(`${TMDB_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 3600 }, // cache 1 hour
  });
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  return res.json();
}

function genreLabel(genreIds: number[]): string {
  return genreIds
    .slice(0, 2)
    .map((id) => GENRE_MAP[id] ?? "")
    .filter(Boolean)
    .join(" • ");
}

function yearFrom(date: string | undefined): string {
  return date ? date.slice(0, 4) : "";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMovie(item: any, badge?: string) {
  const year = yearFrom(item.release_date ?? item.first_air_date);
  const genre = genreLabel(item.genre_ids ?? []);
  return {
    id: item.id,
    title: item.title ?? item.name,
    mediaType: item.media_type ?? (item.title ? "movie" : "tv"),
    posterPath: item.poster_path ?? null,
    rating: item.vote_average ? Math.round(item.vote_average * 10) / 10 : null,
    genre: [genre, year].filter(Boolean).join(" • "),
    year,
    overview: item.overview ?? null,
    badge: badge ?? null,
  };
}

export async function GET(req: NextRequest) {
  const country = req.nextUrl.searchParams.get("country") ?? "US";
  const language = req.nextUrl.searchParams.get("language") ?? "en-US";

  try {
    const [topRated, trendingWeek, popular] = await Promise.all([
      tmdbFetch(`/movie/top_rated?language=${language}&page=1`),
      tmdbFetch(`/trending/all/week?language=${language}`),
      tmdbFetch(
        `/discover/movie?language=${language}&sort_by=popularity.desc&watch_region=${country}&with_watch_monetization_types=flatrate&page=1`
      ),
    ]);

    const top10 = (topRated.results as unknown[])
      .slice(0, 10)
      .map((item) => mapMovie(item));

    const trending = (trendingWeek.results as unknown[])
      .slice(0, 10)
      .map((item) => mapMovie(item));

    const popularList = (popular.results as unknown[])
      .slice(0, 6)
      .map((item, i) => mapMovie(item, i === 0 ? "Featured" : i < 3 ? "Trending" : undefined));

    return NextResponse.json({ top10, trending, popular: popularList });
  } catch (err) {
    console.error("[explore] ERROR:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
