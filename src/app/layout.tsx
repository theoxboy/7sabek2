import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { Cairo, Geist, Geist_Mono, Manrope } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/Toaster";
import { GlobalMessageLayer } from "@/components/announcements/GlobalMessageLayer";
import LanguagePreferenceGate from "@/components/i18n/LanguagePreferenceGate";
import { MicrosoftClarity } from "@/components/analytics/MicrosoftClarity";
import AddToHomeScreenPrompt from "@/components/pwa/AddToHomeScreenPrompt";
import { CookieConsentManager } from "@/components/privacy/CookieConsentManager";
import { getLocaleDirection, readLocaleCookie } from "@/lib/localePreference";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "7sabek",
  description: "Personal finance envelopes made simple.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "7sabek",
    statusBarStyle: "black-translucent",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const serverLocale = readLocaleCookie(cookieStore.toString()) ?? "fr";
  const serverDir = serverLocale === "en" ? "ltr" : getLocaleDirection(serverLocale);

  return (
    <html lang={serverLocale} dir={serverDir} className={cairo.className}>
      <head>
        {/*
          Applies the saved theme before the first paint, on every route.
          The toggle used to be applied only inside a useEffect on the
          Settings page itself, so a user who chose dark mode and then landed
          on any other route directly - a bookmark, a refresh, a fresh tab -
          got the light theme back until they reopened Settings. A blocking
          inline script is the only way to set the attribute before React
          hydrates and before the browser paints, which is also what avoids a
          light-then-dark flash on every load.
        */}
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(window.localStorage.getItem("floussy_theme")==="dark"){document.documentElement.setAttribute("data-theme","dark");}}catch(e){}})();`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${cairo.className} ${cairo.variable} antialiased`}
        style={{ fontFamily: '"Cairo", var(--font-cairo), sans-serif' }}
      >
        <MicrosoftClarity />
        <LanguagePreferenceGate />
        <GlobalMessageLayer />
        <AddToHomeScreenPrompt />
        <CookieConsentManager locale={serverLocale} />
        <Toaster>{children}</Toaster>
      </body>
    </html>
  );
}
