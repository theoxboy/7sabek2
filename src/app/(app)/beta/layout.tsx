"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { fetchMe } from "@/lib/auth";

export default function BetaLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const isOnboardingAlias = pathname?.startsWith("/beta/onboarding-v2");
  const isBypassedPage = isOnboardingAlias || pathname?.startsWith("/beta/notifications") || pathname?.startsWith("/beta/chat");

  useEffect(() => {
    if (isBypassedPage) {
      return;
    }
    let active = true;
    fetchMe()
      .then((user) => {
        if (!active) return;
        const canAccess = Boolean(user.is_beta_tester || user.role === "superadmin");
        if (!canAccess) {
          router.replace("/dashboard");
          return;
        }
        setChecking(false);
      })
      .catch(() => {
        if (!active) return;
        router.replace("/login");
      });
    return () => {
      active = false;
    };
  }, [isBypassedPage, router]);

  if (!isBypassedPage && checking) {
    return <p className="text-sm text-[var(--muted)]">Vérification de l’accès beta...</p>;
  }

  return <>{children}</>;
}
