import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const isDev = process.env.NODE_ENV !== "production";
  
  let devConnectSrc = "";
  if (isDev) {
    const hostHeader = request.headers.get("host") || "";
    const hostname = hostHeader.split(":")[0];
    devConnectSrc = " http://localhost:8000 http://127.0.0.1:8000";
    if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1") {
      devConnectSrc += ` http://${hostname}:8000`;
    }
  }

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
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      // 'unsafe-eval' is a development-only allowance: the Next dev server
      // needs it for hot reload, a production bundle does not, and leaving it
      // on in production widens every injection into arbitrary execution.
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://www.google.com https://www.gstatic.com https://www.clarity.ms https://*.clarity.ms`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://www.clarity.ms https://*.clarity.ms https://c.clarity.ms https://c.bing.com https://*.openstreetmap.org https://*.tile.openstreetmap.org",
      `connect-src 'self' https://api.7sabek.ma https://www.google.com https://*.floussy.online https://www.clarity.ms https://*.clarity.ms https://c.clarity.ms https://*.bing.com${devConnectSrc}`,
      "frame-src https://www.google.com https://www.gstatic.com https://www.openstreetmap.org https://*.openstreetmap.org",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "worker-src blob:",
    ].join("; "),
  );

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
