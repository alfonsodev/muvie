import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, stepCountIs, streamText, tool, UIMessage } from "ai";
import { z } from "zod";

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

const discoverByPlatform = tool({
  description:
    "Find popular movies or TV shows available on a specific streaming platform (e.g. Netflix, Apple TV+, Disney+) in a given country. Use this when the user asks what's on a specific service.",
  inputSchema: z.object({
    platform: z.string().describe("Streaming platform name, e.g. 'Netflix', 'Apple TV+', 'Disney+'"),
    mediaType: z.enum(["movie", "tv"]).describe("Whether to search movies or TV shows"),
    countryCode: z.string().describe("ISO 3166-1 alpha-2 country code. Default to ES if not specified."),
  }),
  execute: async ({ platform, mediaType, countryCode }) => {
    console.log(`[tool:discoverByPlatform] platform="${platform}" mediaType=${mediaType} countryCode=${countryCode}`);
    const providerId = PROVIDER_IDS[platform.toLowerCase()];
    if (!providerId) {
      console.log(`[tool:discoverByPlatform] unknown platform "${platform}"`);
      return { error: `Unknown platform "${platform}". Try Netflix, Apple TV+, Disney+, Amazon Prime, HBO Max.` };
    }
    try {
      const data = await tmdbFetch(
        `/discover/${mediaType}?watch_region=${countryCode}&with_watch_providers=${providerId}&sort_by=popularity.desc&language=en-US&page=1`
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
      console.log(`[tool:discoverByPlatform] → ${results.length} results for ${platform} in ${countryCode}`);
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

const getWatchProviders = tool({
  description:
    "Get streaming platforms where a movie or TV show is available in a specific country. Always call searchContent first to get the TMDB ID if you don't already have it.",
  inputSchema: z.object({
    tmdbId: z.number().describe("TMDB ID of the movie or TV show"),
    mediaType: z
      .enum(["movie", "tv"])
      .describe("Whether it's a movie or TV show"),
    countryCode: z
      .string()
      .describe(
        "ISO 3166-1 alpha-2 country code (e.g. AR, MX, US, ES). Use the country passed in the system prompt."
      ),
  }),
  execute: async ({ tmdbId, mediaType, countryCode }) => {
    console.log(`[tool:getWatchProviders] tmdbId=${tmdbId} mediaType=${mediaType} countryCode=${countryCode}`);
    try {
      const data = await tmdbFetch(`/${mediaType}/${tmdbId}/watch/providers`);
      const countryData = data.results?.[countryCode];
      if (!countryData) {
        console.log(`[tool:getWatchProviders] → not available in ${countryCode}`);
        return { available: false, country: countryCode };
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const flatrate = countryData.flatrate?.map((p: any) => p.provider_name) ?? [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rent = countryData.rent?.map((p: any) => p.provider_name) ?? [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const buy = countryData.buy?.map((p: any) => p.provider_name) ?? [];
      console.log(`[tool:getWatchProviders] → flatrate=[${flatrate}] rent=[${rent}] buy=[${buy}]`);
      return { available: true, country: countryCode, link: countryData.link, flatrate, rent, buy };
    } catch (err) {
      console.error(`[tool:getWatchProviders] ERROR:`, err);
      return { error: (err as Error).message };
    }
  },
});

const BASE_PROMPT = `You are Muvi, an enthusiastic and knowledgeable movie and TV series recommendation assistant.

Your personality:
- Warm, friendly, and excited about cinema and storytelling
- Knowledgeable about movies and series across all genres, decades, and countries
- Great at understanding mood, preferences, and group dynamics

Your capabilities:
- Recommend movies and TV series tailored to the user's mood, taste, and context
- Help groups of friends decide what to watch together by finding common ground
- Provide brief, engaging descriptions without spoilers
- Use the discoverByPlatform tool when the user asks what's available on a specific streaming service (Netflix, Apple TV+, Disney+, etc.) — this returns movies/shows actually available on that platform
- Use the searchContent tool to look up any specific movie or TV show by title — this gives you the TMDB ID needed for other tools
- Use the getTrending tool to fetch real-time trending titles when the user asks what's popular or trending
- Use the getWatchProviders tool to check which platforms carry a specific title — always call searchContent first to get the TMDB ID
- Offer alternatives if something isn't available or doesn't appeal

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
  const {
    messages,
    locale,
    country,
  }: { messages: UIMessage[]; locale?: string; country?: string } =
    await req.json();

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: buildSystemPrompt(locale ?? "es", country ?? "US"),
    messages: await convertToModelMessages(messages),
    tools: { discoverByPlatform, searchContent, getTrending, getWatchProviders },
    stopWhen: stepCountIs(5),
    onStepFinish: ({ toolCalls, toolResults, stepType }) => {
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
