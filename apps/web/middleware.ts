import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ORIGINS = [
  "https://muvie.chat",
  "http://localhost:3000",
  "http://localhost:8081",
];

const ORIGIN_PATTERN = /^(exp:\/\/|http:\/\/192\.168\.|http:\/\/10\.)/;

function getAllowOrigin(origin: string | null): string | null {
  if (!origin) return null;
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  if (ORIGIN_PATTERN.test(origin)) return origin;
  return null;
}

export function middleware(req: NextRequest) {
  const origin = req.headers.get("origin");
  const allowOrigin = getAllowOrigin(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders(allowOrigin),
    });
  }

  const res = NextResponse.next();
  if (allowOrigin) {
    Object.entries(corsHeaders(allowOrigin)).forEach(([k, v]) => res.headers.set(k, v));
  }
  return res;
}

function corsHeaders(allowOrigin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": allowOrigin ?? "",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,HEAD,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,Cookie",
    "Access-Control-Expose-Headers": "X-User-Count,Set-Cookie",
  };
}

export const config = {
  matcher: "/api/:path*",
};
