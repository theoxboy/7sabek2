import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Cairo, Geist, Geist_Mono, Manrope } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/Toaster";
import { GlobalMessageLayer } from "@/components/announcements/GlobalMessageLayer";
import LanguagePreferenceGate from "@/components/i18n/LanguagePreferenceGate";
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
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const serverLocale = readLocaleCookie(cookieStore.toString()) ?? "fr";
  const serverDir = serverLocale === "en" ? "ltr" : getLocaleDirection(serverLocale);

  return (
    <html lang={serverLocale} dir={serverDir}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${manrope.variable} ${cairo.variable} antialiased`}
      >
        <LanguagePreferenceGate />
        <GlobalMessageLayer />
        <Toaster>{children}</Toaster>
      </body>
    </html>
  );
}
