"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { apiFetch } from "@/lib/api";
import { useAppLocale, useForceArabicDocumentFont } from "@/lib/appLocale";

const COPY = {
  fr: {
    loading: "Connexion en cours...",
    missingToken: "Token manquant.",
    blockedIp:
      "Connexion impossible : cette connexion est suspecte. Le système l'a bloquée automatiquement après détection d'une utilisation suspecte. Contacte le support.",
    geoRequired:
      "Connexion impossible : l'accès à la localisation GPS est obligatoire pour ce compte superadmin.",
    geoUnavailable: "Géolocalisation indisponible.",
    failed: "Échec de connexion.",
    connected: "Connecté. Redirection...",
    title: "Connexion mobile",
    reports: "Aller aux rapports",
    login: "Se connecter",
  },
  en: {
    loading: "Signing you in...",
    missingToken: "Missing token.",
    blockedIp:
      "Sign-in blocked: this connection looks suspicious. The system blocked it automatically after suspicious activity detection. Contact support.",
    geoRequired:
      "Sign-in blocked: GPS location access is required for this superadmin account.",
    geoUnavailable: "Geolocation unavailable.",
    failed: "Sign-in failed.",
    connected: "Connected. Redirecting...",
    title: "Mobile login",
    reports: "Open reports",
    login: "Sign in",
  },
  ar: {
    loading: "جاري تسجيل الدخول...",
    missingToken: "التوكن ما كاينش.",
    blockedIp:
      "تعذر الدخول: هاد الاتصال باين مشبوه. السيستيم حبسو أوتوماتيكياً من بعد ما بان استعمال غير عادي. تواصل مع الدعم.",
    geoRequired:
      "تعذر الدخول: خاص تفعّل الولوج للـ GPS فهاد حساب superadmin.",
    geoUnavailable: "الولوج للموقع الجغرافي ما متوفرش.",
    failed: "وقع مشكل فالدخول.",
    connected: "تسجل الدخول. جاري التحويل...",
    title: "الدخول من الهاتف",
    reports: "دخل للتقارير",
    login: "دخل للحساب",
  },
} as const;

type GeoPayload = {
  geo_lat: number;
  geo_lng: number;
  geo_accuracy_m: number;
  geo_label: string;
};

export default function MobileLoginPage() {
  return (
    <Suspense fallback={null}>
      <MobileLoginContent />
    </Suspense>
  );
}

function MobileLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale, dir } = useAppLocale();
  const copy = COPY[locale];
  useForceArabicDocumentFont(locale === "ar", "mobile-login-page-ar-body");
  const token = searchParams.get("token");
  const redirectParam = searchParams.get("redirect");
  const [status, setStatus] = useState<string>(copy.loading);

  useEffect(() => {
    setStatus(copy.loading);
  }, [copy.loading]);

  const getMobileLoginErrorMessage = (message: string) => {
    const lower = message.toLowerCase();
    if (lower.includes("ip_address_blocked")) {
      return copy.blockedIp;
    }
    if (lower.includes("superadmin_geo_required")) {
      return copy.geoRequired;
    }
    return message;
  };

  const inferBrowser = (userAgent: string) => {
    const ua = userAgent.toLowerCase();
    if (ua.includes("edg/")) return "Microsoft Edge";
    if (ua.includes("opr/") || ua.includes("opera")) return "Opera";
    if (ua.includes("chrome/") && !ua.includes("edg/")) return "Google Chrome";
    if (ua.includes("safari/") && !ua.includes("chrome/")) return "Safari";
    if (ua.includes("firefox/")) return "Mozilla Firefox";
    return "Unknown";
  };

  const inferOs = (userAgent: string) => {
    const ua = userAgent.toLowerCase();
    if (ua.includes("windows")) return "Windows";
    if (ua.includes("mac os x") || ua.includes("macintosh")) return "macOS";
    if (ua.includes("android")) return "Android";
    if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ios")) return "iOS";
    if (ua.includes("linux")) return "Linux";
    return "Unknown";
  };

  const inferDevice = (userAgent: string) => {
    const ua = userAgent.toLowerCase();
    if (ua.includes("ipad") || ua.includes("tablet")) return "Tablet";
    if (ua.includes("mobile") || ua.includes("iphone") || ua.includes("android")) {
      return "Mobile";
    }
    return "Desktop";
  };

  const requestGeolocation = async (): Promise<GeoPayload> => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      throw new Error(copy.geoUnavailable);
    }
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      });
    }).catch((error: unknown) => {
      const geoError = error as GeolocationPositionError | undefined;
      if (geoError?.code === 1) {
        throw new Error(
          copy.geoRequired
        );
      }
      if (geoError?.code === 2) {
        throw new Error(
          copy.geoRequired
        );
      }
      if (geoError?.code === 3) {
        throw new Error(
          copy.geoRequired
        );
      }
      throw new Error(
        copy.geoRequired
      );
    });
    return {
      geo_lat: position.coords.latitude,
      geo_lng: position.coords.longitude,
      geo_accuracy_m: Math.max(0, position.coords.accuracy ?? 0),
      geo_label: `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`,
    };
  };

  useEffect(() => {
    if (!token) {
      setStatus(copy.missingToken);
      return;
    }

    const redirectPath =
      redirectParam && redirectParam.startsWith("/")
        ? redirectParam
        : "/reports";

    let cancelled = false;
    (async () => {
      try {
        const userAgent =
          typeof navigator !== "undefined" ? navigator.userAgent ?? "" : "";
        const bodyBase = {
          token,
          browser: inferBrowser(userAgent),
          os: inferOs(userAgent),
          device: inferDevice(userAgent),
        };

        try {
          await apiFetch("/auth/web-login-exchange", {
            method: "POST",
            body: bodyBase,
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : copy.failed;
          if (!message.toLowerCase().includes("superadmin_geo_required")) {
            throw error;
          }
          const geo = await requestGeolocation();
          await apiFetch("/auth/web-login-exchange", {
            method: "POST",
            body: { ...bodyBase, ...geo },
          });
        }
        if (cancelled) return;
        setStatus(copy.connected);
        router.replace(redirectPath);
      } catch (error) {
        if (cancelled) return;
        const message =
          error instanceof Error ? error.message : copy.failed;
        setStatus(getMobileLoginErrorMessage(message));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, redirectParam, router, copy]);

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center"
      dir={dir}
    >
      <h1 className="text-2xl font-semibold">{copy.title}</h1>
      <p className="max-w-md text-sm text-[var(--muted)]">{status}</p>
      <div className="flex gap-3">
        <Link href="/reports" className="rounded bg-black px-4 py-2 text-white">
          {copy.reports}
        </Link>
        <Link href="/login" className="rounded border px-4 py-2">
          {copy.login}
        </Link>
      </div>
    </div>
  );
}
