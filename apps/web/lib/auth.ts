import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { bearer, magicLink } from "better-auth/plugins";
import Database from "better-sqlite3";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const db = new Database("./muvi.db");

export const auth = betterAuth({
  database: db,
  trustedOrigins: [
    "muvi://",
    "https://muvie.chat",
    ...(process.env.NODE_ENV === "development"
      ? [
          "exp://",
          "exp://**",
          "exp://192.168.*.*:*/**",
          "http://localhost:3000",
          "http://localhost:8081",
        ]
      : []),
  ],
  plugins: [
    expo(),
    bearer(),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        if (resend) {
          await resend.emails.send({
            from: "Muvi <noreply@updates.muvie.chat>",
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
