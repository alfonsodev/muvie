import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";

/**
 * After Better Auth verifies a magic link it redirects here.
 * We read the established session, grab the raw token, and
 * hand it back to the native app via the muvie:// custom scheme.
 */
export async function GET(request: NextRequest) {
  // @better-auth/expo server plugin appends ?token=<session_token> to the callbackURL
  // when redirecting back from magic-link verification on native apps.
  const url = new URL(request.url);
  let token = url.searchParams.get("token") ?? undefined;

  // Fallback: try to read from the session cookie (web flow)
  if (!token) {
    const session = await auth.api.getSession({ headers: request.headers });
    token = (session as unknown as { session?: { token?: string } })?.session?.token;
  }

  if (!token) {
    return new Response(
      `<!DOCTYPE html><html><body>
        <p style="font-family:sans-serif;padding:32px">
          Sign-in link has expired or already been used.
          Please request a new one in the app.
        </p>
      </body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  // Use JS redirect — HTTP 302 to custom schemes is blocked by some browsers
  const deepLink = `muvie://callback?token=${encodeURIComponent(token)}`;
  return new Response(
    `<!DOCTYPE html><html><head><title>Opening Muvi…</title></head>
    <body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#121212;color:#ececec">
      <div style="text-align:center">
        <p style="font-size:48px;margin:0">🎬</p>
        <p style="font-size:20px;font-weight:600;margin:16px 0 8px">Opening Muvi…</p>
        <p style="color:#8e8ea0;font-size:14px">You can close this tab once the app opens.</p>
      </div>
      <script>window.location.href = ${JSON.stringify(deepLink)};</script>
    </body></html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}
