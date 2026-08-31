import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const isDev = process.env.NODE_ENV !== "production";

  // A fresh per-request nonce lets us drop 'unsafe-inline' from script-src in
  // production: only Next's own bundle (which picks up this nonce) and the
  // scripts it loads run, so an injected inline <script> no longer executes.
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  let devConnectSrc = "";
  if (isDev) {
    const hostHeader = request.headers.get("host") || "";
    const hostname = hostHeader.split(":")[0];
    devConnectSrc = " http://localhost:8000 http://127.0.0.1:8000";
    if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1") {
      devConnectSrc += ` http://${hostname}:8000`;
    }
  }

  // In dev the Next server needs 'unsafe-eval' (HMR) and can't reliably nonce
  // every injected script, so keep 'unsafe-inline' there. Production gets the
  // strict nonce + 'strict-dynamic' policy.
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com https://www.clarity.ms https://*.clarity.ms"
    : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https:`;

  const csp = [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://www.clarity.ms https://*.clarity.ms https://c.clarity.ms https://c.bing.com https://*.openstreetmap.org https://*.tile.openstreetmap.org",
    `connect-src 'self' https://api.7sabek.ma https://www.google.com https://*.floussy.online https://www.clarity.ms https://*.clarity.ms https://c.clarity.ms https://*.bing.com${devConnectSrc}`,
    "frame-src 'self' https://www.google.com https://www.gstatic.com https://www.openstreetmap.org https://*.openstreetmap.org",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "worker-src 'self' blob:",
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(self)",
  );
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains",
  );

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
