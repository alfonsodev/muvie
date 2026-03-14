import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { bearer, magicLink } from "better-auth/plugins";
import { Resend } from "resend";
import { db } from "./db";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

function normalizeOriginCandidate(value: string | null): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.origin;
    }
    return value;
  } catch {
    return value;
  }
}

const staticTrustedOrigins = [
  "muvie://",
  "muvie://callback",
  "muvie://**",
  "https://muvie.org",
  ...(process.env.NODE_ENV === "development"
    ? [
        "https://dev.muvie.org:*",
        "https://dev.muvie.org:*/**",
        "exp://",
        "exp://**",
        "exp://192.168.*.*:*/**",
        "http://192.168.*.*:*/**",
        "http://localhost:*",
        "http://localhost:*/**",
      ]
    : []),
];

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  advanced: {
    // Expo native dev requests can carry non-standard origins that fail strict checks.
    // Keep origin validation enabled in production.
    disableOriginCheck: process.env.NODE_ENV === "development",
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  database: db,
  trustedOrigins: async (request) => {
    if (process.env.NODE_ENV !== "development" || !request?.headers) {
      return staticTrustedOrigins;
    }

    const dynamic = new Set<string>(staticTrustedOrigins);
    const incoming = [
      normalizeOriginCandidate(request.headers.get("origin")),
      normalizeOriginCandidate(request.headers.get("referer")),
      normalizeOriginCandidate(request.headers.get("expo-origin")),
    ].filter((v): v is string => !!v);

    for (const origin of incoming) dynamic.add(origin);
    return Array.from(dynamic);
  },
  plugins: [
    expo(),
    bearer(),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        if (resend) {
          await resend.emails.send({
            from: "Muvi <noreply@notify.muvie.org>",
            to: email,
            subject: "Your Muvi sign-in link",
            html: `
              <div style="font-family:sans-serif;max-width:400px;margin:0 auto">
                <h2 style="color:#6c63ff">Sign in to Muvi 🎬</h2>
                <p>Tap the button below to sign in. The link expires in 5 minutes.</p>
                <a href="${url}" style="display:inline-block;background:#6c63ff;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
                  Sign in to Muvi
                </a>
                <p style="color:#888;font-size:12px;margin-top:24px">
                  If you didn't request this, you can safely ignore this email.
                </p>
              </div>
            `,
          });
        } else {
          // Development fallback — log the link to the server console
          console.log("\n🔗 Magic link for", email, "\n", url, "\n");
        }
      },
    }),
  ],
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      username: {
        type: "string",
        required: false,
        defaultValue: null,
      },
      avatarSeed: {
        type: "string",
        required: false,
        defaultValue: null,
      },
    },
  },
});
