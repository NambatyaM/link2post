import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co https://api.openai.com https://generativelanguage.googleapis.com https://api.groq.com https://openrouter.ai https://api.cerebras.ai https://api.mistral.ai https://api.thorbase.com",
  "frame-src 'self'",
].join("; ");

export function middleware(request: NextRequest) {
  const requestId = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const requestStart = Date.now();

  const response = NextResponse.next();

  response.headers.set("X-Request-Id", requestId);

  if (request.nextUrl.pathname.startsWith("/api/") && !request.nextUrl.pathname.startsWith("/api/health")) {
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("Content-Security-Policy", CSP_DIRECTIVES);
  }

  response.headers.set("X-Response-Time", `${Date.now() - requestStart}ms`);

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
