"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { HelpCircle, Home, LayoutDashboard, Wallet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import BrandLogo from "@/components/BrandLogo";
import { readLocaleCookie, FloussyLocale, getLocaleDirection } from "@/lib/localePreference";
import { useForceArabicDocumentFont } from "@/lib/appLocale";

const COPY = {
  fr: {
    title: "Page introuvable",
    subtitle: "Oups ! La page que vous cherchez n'existe pas ou a été déplacée.",
    homeBtn: "Retour à l'accueil",
    dashboardBtn: "Mon tableau de bord",
    code: "Erreur 404",
    helpText: "Besoin d'aide ? Contactez-nous",
  },
  en: {
    title: "Page Not Found",
    subtitle: "Oops! The page you are looking for doesn't exist or has been moved.",
    homeBtn: "Back to Home",
    dashboardBtn: "Go to Dashboard",
    code: "Error 404",
    helpText: "Need help? Contact support",
  },
  ar: {
    title: "الصفحة غير موجودة",
    subtitle: "أوبس! الصفحة لي كاتقلب عليها ما كايناش ولا تبدلات بلاصتها.",
    homeBtn: "الرجوع للرئيسية",
    dashboardBtn: "لوحة التحكم ديالي",
    code: "خطأ 404",
    helpText: "محتاج مساعدة؟ اتصل بنا",
  },
};

export default function NotFound() {
  const [locale, setLocale] = useState<FloussyLocale>("fr");

  useEffect(() => {
    if (typeof window !== "undefined") {
      let activeLocale: FloussyLocale = "fr";

      // 1. Check locale preference cookie
      const cookieLocale = readLocaleCookie(document.cookie);
      if (cookieLocale) {
        activeLocale = cookieLocale;
      } else {
        // 2. Check local storage preference
        const storedLocale = window.localStorage.getItem("floussy_locale_pref");
        if (storedLocale && (storedLocale === "ar" || storedLocale === "en" || storedLocale === "fr")) {
          activeLocale = storedLocale as FloussyLocale;
        } else {
          // 3. Fallback to document language attribute
          const htmlLang = document.documentElement.lang;
          if (htmlLang === "ar" || htmlLang === "en" || htmlLang === "fr") {
            activeLocale = htmlLang as FloussyLocale;
          }
        }
      }

      setLocale(activeLocale);

      // Force HTML document lang and dir properties to align with user choice
      document.documentElement.lang = activeLocale;
      document.documentElement.dir = getLocaleDirection(activeLocale);
    }
  }, []);

  const copy = COPY[locale];
  const dir = getLocaleDirection(locale);
  const isArabic = locale === "ar";
  useForceArabicDocumentFont(isArabic, "not-found-page-arabic-font");

  return (
    <div
      dir={dir}
      lang={locale}
      className="app-shell-v2 min-h-screen w-full flex flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{ fontFamily: '"Cairo", var(--font-cairo), sans-serif' }}
    >
      {/* Background Orbs & Grid Pattern */}
      <div className="app-shell-v2__orb app-shell-v2__orb--one opacity-30 dark:opacity-20" />
      <div className="app-shell-v2__orb app-shell-v2__orb--two opacity-30 dark:opacity-20" />
      <div className="app-shell-v2__grid opacity-10 dark:opacity-20" />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10 text-center">
        {/* Brand Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <BrandLogo locale={locale} className="h-16 w-auto mb-8 mx-auto" priority />
        </motion.div>

        {/* Custom 404 Graphic / Animation */}
        <div className="relative w-44 h-44 mx-auto mb-8 flex items-center justify-center">
          <motion.div
            animate={{
              scale: [1, 1.08, 1],
              opacity: [0.25, 0.45, 0.25],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute w-36 h-36 rounded-full bg-[var(--accent)] filter blur-xl"
          />

          <motion.div
            animate={{
              y: [0, -10, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="relative z-10 flex flex-col items-center"
          >
            <div className="relative bg-[var(--surface)] p-6 rounded-[24px] border border-[var(--border)] shadow-[var(--shadow-soft)] flex items-center justify-center">
              <Wallet className="w-16 h-16 text-[var(--accent)]" />
              <motion.div
                animate={{
                  scale: [0.8, 1.1, 0.8],
                  rotate: [0, 360, 0],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute -top-2 -right-2 bg-amber-400 dark:bg-amber-500 text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center text-slate-900 shadow-md border border-[var(--surface)]"
              >
                ?
              </motion.div>
            </div>
            <span className="mt-4 text-xs font-bold tracking-widest text-[var(--muted)] uppercase">
              {copy.code}
            </span>
          </motion.div>
        </div>

        {/* Copy Text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="space-y-4 px-4"
        >
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--ink)] tracking-tight">
            {copy.title}
          </h1>
          <p className="text-sm sm:text-base text-[var(--muted)] max-w-sm mx-auto leading-relaxed">
            {copy.subtitle}
          </p>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="mt-8 flex flex-col sm:flex-row gap-3 justify-center px-4"
        >
          <Button asChild variant="primary">
            <Link href="/dashboard" className="flex items-center justify-center gap-2">
              <LayoutDashboard className="w-4 h-4" />
              <span>{copy.dashboardBtn}</span>
            </Link>
          </Button>

          <Button asChild variant="secondary">
            <Link href="/" className="flex items-center justify-center gap-2">
              <Home className="w-4 h-4" />
              <span>{copy.homeBtn}</span>
            </Link>
          </Button>
        </motion.div>

        {/* Footer Support Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-12 text-xs text-[var(--muted)] hover:text-[var(--accent)] transition-colors inline-flex items-center gap-1.5"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <Link href="/contact">{copy.helpText}</Link>
        </motion.div>
      </div>
    </div>
  );
}
