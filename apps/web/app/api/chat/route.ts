import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, stepCountIs, streamText, tool, UIMessage } from "ai";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { deleteWatchlistItem, listWatchlist, upsertWatchlistItem } from "@/lib/watchlist";
import { getUserProfile, upsertUserProfile } from "@/lib/user-profile";

const TMDB_BASE = "https://api.themoviedb.org/3";

async function tmdbFetch(path: string) {
  const token = process.env.TMDB_API_READ_TOKEN;
  if (!token) throw new Error("TMDB_API_READ_TOKEN is not set");
  const res = await fetch(`${TMDB_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`TMDB ${res.status}: ${body}`);
  }
  return res.json();
}

// TMDB provider IDs for common platforms
const PROVIDER_IDS: Record<string, number> = {
  netflix: 8,
  "apple tv": 350,
  "apple tv+": 350,
  "apple tv plus": 350,
  "disney+": 337,
  disney: 337,
  "amazon prime": 119,
  "prime video": 119,
  amazon: 119,
  "hbo max": 29,
  max: 29,
  hbo: 29,
  movistar: 149,
  filmin: 64,
  "paramount+": 531,
};

// All major providers joined for "any platform" queries
const ALL_MAJOR_PROVIDERS = Object.values(PROVIDER_IDS)
  .filter((v, i, a) => a.indexOf(v) === i) // deduplicate
  .join("|");

const discoverByPlatform = tool({
  description:
    "Find popular movies or TV shows available on streaming platforms in a given country. Omit platforms to search across all major services. Pass one or more platform names to filter by specific services.",
  inputSchema: z.object({
    platforms: z
      .array(z.string())
      .optional()
      .describe("List of streaming platform names to filter by, e.g. ['Netflix'], ['Apple TV+', 'Disney+']. Omit or pass empty array to include all major platforms."),
    mediaType: z.enum(["movie", "tv"]).describe("Whether to search movies or TV shows"),
    countryCode: z.string().describe("ISO 3166-1 alpha-2 country code. Default to ES if not specified."),
  }),
  execute: async ({ platforms, mediaType, countryCode }) => {
    const platformLabel = platforms?.length ? platforms.join(", ") : "any";
    console.log(`[tool:discoverByPlatform] platforms="${platformLabel}" mediaType=${mediaType} countryCode=${countryCode}`);

    let providerFilter = ALL_MAJOR_PROVIDERS;
    if (platforms?.length) {
      const ids = platforms.map((p) => PROVIDER_IDS[p.toLowerCase()]).filter(Boolean);
      if (ids.length === 0) {
        console.log(`[tool:discoverByPlatform] unknown platforms: ${platforms.join(", ")}`);
        return { error: `Unknown platforms: ${platforms.join(", ")}. Try Netflix, Apple TV+, Disney+, Amazon Prime, HBO Max.` };
      }
      providerFilter = ids.join("|");
    }
    try {
      const data = await tmdbFetch(
        `/discover/${mediaType}?watch_region=${countryCode}&with_watch_providers=${providerFilter}&sort_by=popularity.desc&language=en-US&page=1`
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results = data.results.slice(0, 8).map((item: any) => ({
        id: item.id,
        title: item.title ?? item.name,
        mediaType,
        overview: item.overview,
        voteAverage: item.vote_average,
        releaseDate: item.release_date ?? item.first_air_date,
        popularity: item.popularity,
      }));
      console.log(`[tool:discoverByPlatform] → ${results.length} results for "${platformLabel}" in ${countryCode}`);
      return results;
    } catch (err) {
      console.error(`[tool:discoverByPlatform] ERROR:`, err);
      return { error: (err as Error).message };
    }
  },
});

const searchContent = tool({
  description:
    "Search TMDB for movies or TV shows by title or keywords. Use this to find the TMDB ID and details of a specific title before calling getWatchProviders.",
  inputSchema: z.object({
    query: z.string().describe("The movie or TV show title to search for"),
    mediaType: z
      .enum(["movie", "tv", "multi"])
      .describe("Type of content to search. Use 'multi' when unsure."),
  }),
  execute: async ({ query, mediaType }) => {
    console.log(`[tool:searchContent] query="${query}" mediaType=${mediaType}`);
    try {
      const data = await tmdbFetch(
        `/search/${mediaType}?query=${encodeURIComponent(query)}&language=en-US&page=1`
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results = data.results.slice(0, 5).map((item: any) => ({
        id: item.id,
        title: item.title ?? item.name,
        mediaType: item.media_type ?? mediaType,
        overview: item.overview,
        voteAverage: item.vote_average,
        releaseDate: item.release_date ?? item.first_air_date,
      }));
      console.log(`[tool:searchContent] → ${results.length} results`, results.map((r: { id: number; title: string }) => `${r.title} (id=${r.id})`));
      return results;
    } catch (err) {
      console.error(`[tool:searchContent] ERROR:`, err);
      return { error: (err as Error).message };
    }
  },
});

const getTrending = tool({
  description:
    "Get trending movies or TV shows from TMDB. Use this when the user asks for trendy, popular, or what's hot right now.",
  inputSchema: z.object({
    mediaType: z
      .enum(["movie", "tv", "all"])
      .describe("Type of content: movie, tv, or all"),
    timeWindow: z
      .enum(["day", "week"])
      .describe("Trending over the last day or week"),
  }),
  execute: async ({ mediaType, timeWindow }) => {
    console.log(`[tool:getTrending] mediaType=${mediaType} timeWindow=${timeWindow}`);
    try {
      const data = await tmdbFetch(`/trending/${mediaType}/${timeWindow}?language=en-US`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results = data.results.slice(0, 10).map((item: any) => ({
        id: item.id,
        title: item.title ?? item.name,
        mediaType: item.media_type,
        overview: item.overview,
        voteAverage: item.vote_average,
        releaseDate: item.release_date ?? item.first_air_date,
        popularity: item.popularity,
      }));
      console.log(`[tool:getTrending] → ${results.length} results`);
      return results;
    } catch (err) {
      console.error(`[tool:getTrending] ERROR:`, err);
      return { error: (err as Error).message };
    }
  },
});

function createGetWatchProviders(checked = new Map<string, unknown>()) {
  return tool({
    description:
      "Get streaming platforms for a specific title in a country. Only call this when the user explicitly asks where to watch a title. Do NOT call it after discoverByPlatform — those results are already confirmed available. Call it at most once per tmdbId.",
    inputSchema: z.object({
      tmdbId: z.number().describe("TMDB ID of the movie or TV show"),
      mediaType: z.enum(["movie", "tv"]).describe("Whether it's a movie or TV show"),
      countryCode: z.string().describe("ISO 3166-1 alpha-2 country code (e.g. ES, US, MX)"),
    }),
    execute: async ({ tmdbId, mediaType, countryCode }) => {
      const cacheKey = `${tmdbId}-${mediaType}-${countryCode}`;
      if (checked.has(cacheKey)) {
        console.log(`[tool:getWatchProviders] duplicate call for ${cacheKey} — returning cached result`);
        return { ...checked.get(cacheKey) as object, cached: true };
      }
      console.log(`[tool:getWatchProviders] tmdbId=${tmdbId} mediaType=${mediaType} countryCode=${countryCode}`);
      try {
        const data = await tmdbFetch(`/${mediaType}/${tmdbId}/watch/providers`);
        const countryData = data.results?.[countryCode];
        if (!countryData) {
          console.log(`[tool:getWatchProviders] → not available in ${countryCode}`);
          const result = { available: false, country: countryCode };
          checked.set(cacheKey, result);
          return result;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const flatrate = countryData.flatrate?.map((p: any) => p.provider_name) ?? [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rent = countryData.rent?.map((p: any) => p.provider_name) ?? [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const buy = countryData.buy?.map((p: any) => p.provider_name) ?? [];
        console.log(`[tool:getWatchProviders] → flatrate=[${flatrate}] rent=[${rent}] buy=[${buy}]`);
        const result = { available: true, country: countryCode, link: countryData.link, flatrate, rent, buy };
        checked.set(cacheKey, result);
        return result;
      } catch (err) {
        console.error(`[tool:getWatchProviders] ERROR:`, err);
        return { error: (err as Error).message };
      }
    },
  });
}

function createWatchlistTools(userId: string) {
  const addToWatchlist = tool({
    description:
      "Add a movie or TV show to the user's personal watchlist. Use status='want_to_watch' when the user wants to save something to watch later. Use status='watched' when the user says they have already seen it. Always use searchContent first to get the correct TMDB ID if you don't already have it.",
    inputSchema: z.object({
      tmdbId: z.number().describe("TMDB ID of the movie or TV show"),
      mediaType: z.enum(["movie", "tv"]),
      title: z.string().describe("Title of the movie or TV show"),
      status: z
        .enum(["want_to_watch", "watched"])
        .describe("'want_to_watch' to save for later, 'watched' if they've already seen it"),
    }),
    execute: async ({ tmdbId, mediaType, title, status }) => {
      console.log(`[tool:addToWatchlist] userId=${userId} tmdbId=${tmdbId} title="${title}" status=${status}`);
      upsertWatchlistItem(userId, tmdbId, mediaType, title, status);
      const label = status === "watched" ? "watched list" : "watchlist";
      return { success: true, message: `"${title}" added to your ${label} ✓` };
    },
  });

  const removeFromWatchlist = tool({
    description:
      "Remove a movie or TV show from the user's watchlist. Use searchContent first to get the TMDB ID if you don't already have it.",
    inputSchema: z.object({
      tmdbId: z.number().describe("TMDB ID of the movie or TV show"),
      mediaType: z.enum(["movie", "tv"]),
      title: z.string().describe("Title for the confirmation message"),
    }),
    execute: async ({ tmdbId, mediaType, title }) => {
      console.log(`[tool:removeFromWatchlist] userId=${userId} tmdbId=${tmdbId} title="${title}"`);
      const removed = deleteWatchlistItem(userId, tmdbId, mediaType);
      return removed
        ? { success: true, message: `"${title}" removed from your list ✓` }
        : { success: false, message: `"${title}" was not in your list` };
    },
  });

  const getWatchlist = tool({
    description:
      "Get the user's personal watchlist. Can filter by status: 'all' for everything, 'want_to_watch' for titles saved to watch, 'watched' for titles already seen.",
    inputSchema: z.object({
      filter: z
        .enum(["all", "want_to_watch", "watched"])
        .describe("Filter by status. Use 'all' to show the full list."),
    }),
    execute: async ({ filter }) => {
      console.log(`[tool:getWatchlist] userId=${userId} filter=${filter}`);
      const items = listWatchlist(userId, filter === "all" ? undefined : filter);
      if (items.length === 0) {
        const label =
          filter === "watched" ? "watched list" : filter === "want_to_watch" ? "watchlist" : "list";
        return { items: [], message: `Your ${label} is empty.` };
      }
      return {
        items: items.map((item) => ({
          tmdbId: item.tmdb_id,
          mediaType: item.media_type,
          title: item.title,
          status: item.status,
        })),
      };
    },
  });

  return { addToWatchlist, removeFromWatchlist, getWatchlist };
}

function createProfileTools(userId: string) {
  const getProfile = tool({
    description:
      "Get the user's preference profile (name, age, country, language, streaming platforms, favorite movie). Call this at the start of every conversation to personalize recommendations. If the profile is empty or incomplete, collect the missing info conversationally and call updateProfile to save it.",
    inputSchema: z.object({}),
    execute: async () => {
      console.log(`[tool:getProfile] userId=${userId}`);
      const profile = getUserProfile(userId);
      if (!profile) return { empty: true };
      return { empty: false, ...profile };
    },
  });

  const updateProfile = tool({
    description:
      "Save or update the user's preference profile. Call this whenever the user provides or corrects any profile info (name, age, country, language, platforms, favorite movie). Only pass the fields that changed — existing fields are preserved.",
    inputSchema: z.object({
      display_name: z.string().optional().describe("User's name or nickname"),
      age: z.number().optional().describe("User's age"),
      country: z.string().optional().describe("ISO 3166-1 alpha-2 country code, e.g. ES, US, MX"),
      language: z.string().optional().describe("Preferred language code, e.g. 'es', 'en'"),
      platforms: z.array(z.string()).optional().describe("Streaming platforms the user subscribes to, e.g. ['Netflix', 'Apple TV+']"),
      favorite_movie: z.string().optional().describe("User's all-time favorite movie or TV show"),
    }),
    execute: async (fields) => {
      console.log(`[tool:updateProfile] userId=${userId}`, fields);
      upsertUserProfile(userId, fields);
      return { success: true };
    },
  });

  return { getProfile, updateProfile };
}

const BASE_PROMPT = `You are Muvi, an enthusiastic and knowledgeable movie and TV series recommendation assistant.

Your personality:
- Warm, friendly, and excited about cinema and storytelling
- Knowledgeable about movies and series across all genres, decades, and countries
- Great at understanding mood, preferences, and group dynamics

Your capabilities:
- Recommend movies and TV series tailored to the user's mood, taste, and context
- Help groups of friends decide what to watch together by finding common ground
- Provide brief, engaging descriptions without spoilers
- For general recommendations, use discoverByPlatform — results are already confirmed streamable in that country, **do NOT call getWatchProviders on them**
- When the user mentions specific platforms (e.g. "on Netflix or Apple TV+"), pass them as the platforms array to discoverByPlatform
- Use getTrending only when the user explicitly asks what's trending globally (no country filter — results may not be locally available)
- Use searchContent to look up a specific title by name and get its TMDB ID
- Only call getWatchProviders when the user explicitly asks WHERE to watch a specific title they already know — never call it in a loop on the same movie
- **Never loop calling getWatchProviders on the same tmdbId more than once — if you already have the result, use it**
- A movie is "available" even if it's only on rent/buy — flatrate (subscription) is not the only way to watch
- Offer alternatives if something doesn't appeal

User profile:
- **Always call getProfile at the start of every conversation** to load the user's preferences
- If the profile is empty, ask conversationally for: their name, country, streaming platforms they subscribe to, and favorite movie (age and language are optional). Ask in a friendly, natural way — not like a form. Collect answers and call updateProfile to save them.
- If the profile is partial, use what you have and fill in gaps over time
- Once you have the profile, use it automatically: use profile.country as the country code (overrides the default), use profile.platforms as the default filter for discoverByPlatform, use profile.favorite_movie to understand their taste when making recommendations
- When the user provides profile info (name, age, country, platforms, favorite movie) — even as part of a normal conversation — **immediately call updateProfile as the very next tool call**. Do NOT call getWatchProviders or any other tool before saving the profile data.

Personal watchlist:
- When the user confirms they want to add a title (e.g. "sí", "añádela", "add it", "save it", "apúntala"): **immediately call addToWatchlist — this must be the very next tool call, before anything else**. Use the tmdbId you already have from earlier in the conversation; only call searchContent first if you truly don't have it yet. Do NOT call getWatchProviders before addToWatchlist.
- After adding, confirm it was saved and mention where to watch it if you know
- If the user says "I've already seen it" / "ya la vi", call addToWatchlist with status='watched'
- When the user asks to see their list, call getWatchlist and present it grouped by status

Response style:
- **Always lead with a bold recommendation — never open with filtering questions.** Make your best guess based on whatever context you have and commit to it.
- End every recommendation with a light, natural opening for the user to refine — e.g. "let me know if you're in the mood for something different" or "want something lighter / more action-packed?"
- Keep responses concise and conversational, like a friend who really knows movies
- Include one sentence on why you're recommending it (mood match, similar to X, great for groups, etc.)
- Always mention streaming availability when relevant — use the getWatchProviders tool for accurate info
- Use emojis sparingly to add personality (e.g. 🎬 🍿 ⭐)

Always be helpful, never spoil plots, and make the experience of choosing what to watch fun.`;

function buildSystemPrompt(locale: string, country: string): string {
  const language = locale === "en" ? "English" : "Spanish";
  return `${BASE_PROMPT}\n\nLanguage: Always respond in ${language}.\nUser's country: ${country} — use this code when calling getWatchProviders. If the user hasn't specified their country, assume Spain (ES).`;
}

export async function POST(req: Request) {
  // Clone request so we can read both the body and headers (getSession may consume headers)
  const body = await req.json();
  const {
    messages,
    locale,
    country,
  }: { messages: UIMessage[]; locale?: string; country?: string } = body;

  // Log the latest user message
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  if (lastUserMsg) {
    const text = lastUserMsg.parts
      ?.filter((p: { type: string }) => p.type === "text")
      .map((p: { type: string; text?: string }) => p.text ?? "")
      .join("") ?? "";
    console.log(`[user] ${text.slice(0, 200)}`);
  }

  // Resolve the authenticated user (optional — watchlist tools are skipped if not signed in)
  const session = await auth.api.getSession({ headers: req.headers });
  const userId = session?.user?.id ?? null;
  const watchlistTools = userId ? createWatchlistTools(userId) : {};
  const profileTools = userId ? createProfileTools(userId) : {};
  const getWatchProviders = createGetWatchProviders();

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: buildSystemPrompt(locale ?? "es", country ?? "US"),
    messages: await convertToModelMessages(messages),
    tools: { discoverByPlatform, searchContent, getTrending, getWatchProviders, ...watchlistTools, ...profileTools },
    stopWhen: stepCountIs(10),
    onStepFinish: ({ text, toolCalls, toolResults, stepType }) => {
      if (text?.trim()) {
        console.log(`[assistant] ${text.trim().slice(0, 300)}`);
      }
      if (toolCalls?.length) {
        console.log(`[chat] step=${stepType} tools=[${toolCalls.map((c) => c.toolName).join(", ")}]`);
      }
      if (toolResults?.length) {
        for (const r of toolResults) {
          console.log(`[chat] toolResult=${r.toolName} ok=${!("error" in r)}`);
        }
      }
    },
  });

  return result.toUIMessageStreamResponse({
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "none",
    },
  });
}
