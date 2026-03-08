import { google } from "@ai-sdk/google";
import { convertToModelMessages, stepCountIs, streamText, tool, UIMessage } from "ai";
import { z } from "zod";

const TMDB_BASE = "https://api.themoviedb.org/3";

async function tmdbFetch(path: string) {
  const res = await fetch(`${TMDB_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${process.env.TMDB_API_READ_TOKEN}`,
    },
  });
  if (!res.ok) throw new Error(`TMDB error: ${res.status}`);
  return res.json();
}

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
    const data = await tmdbFetch(
      `/trending/${mediaType}/${timeWindow}?language=en-US`
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.results.slice(0, 10).map((item: any) => ({
      id: item.id,
      title: item.title ?? item.name,
      mediaType: item.media_type,
      overview: item.overview,
      voteAverage: item.vote_average,
      releaseDate: item.release_date ?? item.first_air_date,
      popularity: item.popularity,
    }));
  },
});

const getWatchProviders = tool({
  description:
    "Get streaming platforms where a movie or TV show is available in a specific country. Use this to tell the user where they can watch a title.",
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
    const data = await tmdbFetch(`/${mediaType}/${tmdbId}/watch/providers`);
    const countryData = data.results?.[countryCode];
    if (!countryData) {
      return { available: false, country: countryCode };
    }
    return {
      available: true,
      country: countryCode,
      link: countryData.link,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      flatrate: countryData.flatrate?.map((p: any) => p.provider_name) ?? [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rent: countryData.rent?.map((p: any) => p.provider_name) ?? [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      buy: countryData.buy?.map((p: any) => p.provider_name) ?? [],
    };
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
- Use the getTrending tool to fetch real-time trending titles when the user asks what's popular or trending
- Use the getWatchProviders tool to tell the user exactly which streaming platforms have a title in their country
- Offer alternatives if something isn't available or doesn't appeal

Response style:
- Keep responses concise and scannable — use short descriptions and bullet points when listing multiple titles
- Lead with the most relevant recommendation
- Include why you're recommending something (mood match, similar to X, great for groups, etc.)
- Always mention streaming availability when relevant — use the getWatchProviders tool for accurate info
- Use emojis sparingly to add personality (e.g. 🎬 🍿 ⭐)

Always be helpful, never spoil plots, and make the experience of choosing what to watch fun.`;

function buildSystemPrompt(locale: string, country: string): string {
  const language = locale === "en" ? "English" : "Spanish";
  return `${BASE_PROMPT}\n\nLanguage: Always respond in ${language}.\nUser's country: ${country} — use this code when calling getWatchProviders.`;
}

export async function POST(req: Request) {
  const {
    messages,
    locale,
    country,
  }: { messages: UIMessage[]; locale?: string; country?: string } =
    await req.json();

  const result = streamText({
    model: google("gemini-2.5-flash-lite"),
    system: buildSystemPrompt(locale ?? "es", country ?? "US"),
    messages: await convertToModelMessages(messages),
    tools: { getTrending, getWatchProviders },
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse({
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "none",
    },
  });
}
