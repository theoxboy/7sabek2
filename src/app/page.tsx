import { cookies } from "next/headers";

import LandingPageClient from "@/app/LandingPageClient";
import { readLocaleCookie } from "@/lib/localePreference";

export default async function HomePage() {
  const cookieStore = await cookies();
  const initialLocale = readLocaleCookie(cookieStore.toString()) ?? "fr";

  return <LandingPageClient initialLocale={initialLocale} />;
}
