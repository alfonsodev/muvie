import { auth } from "@/lib/auth";
import { listWatchlist, WatchlistItem } from "@/lib/watchlist";

const TMDB_BASE = "https://api.themoviedb.org/3";

async function tmdbFetch(path: string) {
  const token = process.env.TMDB_API_READ_TOKEN;
  if (!token) throw new Error("TMDB_API_READ_TOKEN is not set");
  const res = await fetch(`${TMDB_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

function formatRuntime(minutes: number): string {
  if (!minutes) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

async function enrichItem(item: WatchlistItem, countryCode: string) {
  const [details, providersData] = await Promise.all([
    tmdbFetch(`/${item.media_type}/${item.tmdb_id}?language=en-US`),
    tmdbFetch(`/${item.media_type}/${item.tmdb_id}/watch/providers`),
  ]);

  const countryProviders = providersData?.results?.[countryCode];

  let runtime: string | null = null;
  if (details) {
    if (item.media_type === "movie" && details.runtime) {
      runtime = formatRuntime(details.runtime);
    } else if (item.media_type === "tv") {
      const mins = details.episode_run_time?.[0];
      if (mins) runtime = `${mins} min/ep`;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const flatrate = (countryProviders?.flatrate ?? []).slice(0, 4).map((p: any) => ({
    name: p.provider_name as string,
    logo: p.logo_path as string,
  }));

  return {
    id: item.id,
    tmdbId: item.tmdb_id,
    mediaType: item.media_type,
    title: item.title,
    status: item.status,
    addedAt: item.added_at,
    posterPath: (details?.poster_path ?? null) as string | null,
    runtime,
    providers: {
      link: (countryProviders?.link ?? null) as string | null,
      flatrate,
    },
  };
}

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const country = url.searchParams.get("country") ?? "ES";

  const items = listWatchlist(session.user.id);
  const enriched = await Promise.all(items.map((item) => enrichItem(item, country)));

  return Response.json(enriched);
}

export async function DELETE(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tmdbId, mediaType } = (await req.json()) as {
    tmdbId: number;
    mediaType: "movie" | "tv";
  };

  const { deleteWatchlistItem } = await import("@/lib/watchlist");
  const removed = deleteWatchlistItem(session.user.id, tmdbId, mediaType);
  return Response.json({ ok: removed });
}
