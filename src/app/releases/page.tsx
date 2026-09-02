"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, Wand2, Wrench } from "lucide-react";

import BrandLogo from "@/components/BrandLogo";
import { useAppLocale } from "@/lib/appLocale";
import { APP_VERSION } from "@/lib/app-version";
import { CHANGELOG, type ChangeKind } from "@/lib/changelog";
import type { FloussyLocale } from "@/lib/localePreference";

const UI: Record<
  FloussyLocale,
  {
    locale: string;
    eyebrow: string;
    title: string;
    subtitle: string;
    back: string;
    latest: string;
    youAreOn: (v: string) => string;
    kinds: Record<ChangeKind, string>;
  }
> = {
  fr: {
    locale: "fr-FR",
    eyebrow: "Journal des versions",
    title: "Nouveautés de 7sabek",
    subtitle:
      "Ce qui change à chaque mise à jour — nouvelles fonctionnalités, améliorations et corrections.",
    back: "Retour",
    latest: "Nouveau",
    youAreOn: (v) => `Vous utilisez la version ${v}`,
    kinds: {
      added: "Nouveautés",
      improved: "Améliorations",
      fixed: "Corrections",
    },
  },
  en: {
    locale: "en-CA",
    eyebrow: "Release notes",
    title: "What’s new in 7sabek",
    subtitle:
      "What changes with every update — new features, improvements and fixes.",
    back: "Back",
    latest: "New",
    youAreOn: (v) => `You’re on version ${v}`,
    kinds: {
      added: "New features",
      improved: "Improvements",
      fixed: "Fixes",
    },
  },
  ar: {
    locale: "ar-MA",
    eyebrow: "سجل النسخ",
    title: "الجديد ف 7sabek",
    subtitle: "شنو كيتبدّل ف كل تحديث — مزايا جديدة، تحسينات وإصلاحات.",
    back: "رجوع",
    latest: "جديد",
    youAreOn: (v) => `راك كتستعمل النسخة ${v}`,
    kinds: {
      added: "مزايا جديدة",
      improved: "تحسينات",
      fixed: "إصلاحات",
    },
  },
};

const KIND_META: Record<
  ChangeKind,
  { icon: typeof Sparkles; dot: string; chipBg: string; chipText: string }
> = {
  added: {
    icon: Sparkles,
    dot: "var(--accent)",
    chipBg: "var(--accent-soft)",
    chipText: "var(--accent-strong)",
  },
  improved: {
    icon: Wand2,
    dot: "#4c7eff",
    chipBg: "rgba(76,126,255,0.12)",
    chipText: "#3355c8",
  },
  fixed: {
    icon: Wrench,
    dot: "var(--warning)",
    chipBg: "var(--warning-soft)",
    chipText: "var(--warning)",
  },
};

export default function ReleasesPage() {
  const { locale, dir } = useAppLocale("fr");
  const t = UI[locale];

  const releases = useMemo(
    () =>
      [...CHANGELOG].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    []
  );

  const fmtDate = (iso: string) => {
    // Parse as a local calendar date (no timezone shift from "yyyy-mm-dd").
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString(t.locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div dir={dir} className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <style jsx global>{`
        .rl-root,
        .rl-root * {
          font-family: "Cairo", var(--font-cairo), sans-serif !important;
        }
        .rl-root svg {
          font-family: initial !important;
        }
      `}</style>

      <div className="rl-root">
        {/* header */}
        <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/85 backdrop-blur">
          <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-3.5 sm:px-6">
            <Link href="/" aria-label="7sabek" className="transition hover:opacity-90">
              <BrandLogo locale={locale} className="h-11 w-auto sm:h-12" priority />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm font-semibold text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)]"
            >
              <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" />
              <span>{t.back}</span>
            </Link>
          </div>
        </header>

        {/* hero */}
        <section className="relative overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(155deg, #124636 0%, #0a241d 62%)",
            }}
          />
          <span
            className="pointer-events-none absolute -left-24 -top-28 h-72 w-72 rounded-full"
            style={{ background: "rgba(23,199,119,0.32)", filter: "blur(70px)" }}
          />
          <div className="relative mx-auto w-full max-w-3xl px-5 py-12 text-white sm:px-6 sm:py-16">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white/90 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-[#17C777]" />
              {t.eyebrow}
            </span>
            <h1 className="mt-3 text-[1.9rem] font-extrabold leading-tight sm:text-[2.4rem]">
              {t.title}
            </h1>
            <p className="mt-3 max-w-[46ch] text-sm text-white/70 sm:text-base">
              {t.subtitle}
            </p>
            <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/85 backdrop-blur">
              {t.youAreOn(`v${APP_VERSION}`)}
            </p>
          </div>
        </section>

        {/* timeline */}
        <main className="mx-auto w-full max-w-3xl px-5 pb-20 pt-10 sm:px-6">
          <ol className="relative space-y-10">
            <span
              className="absolute top-2 bottom-2 w-px bg-[var(--border)] ltr:left-[7px] rtl:right-[7px]"
              aria-hidden
            />
            {releases.map((release, index) => (
              <li key={release.version} className="relative ltr:pl-8 rtl:pr-8">
                <span
                  className="absolute top-1.5 h-4 w-4 rounded-full border-4 border-[var(--bg)] ltr:left-0 rtl:right-0"
                  style={{ background: index === 0 ? "var(--accent)" : "var(--muted)" }}
                  aria-hidden
                />

                <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_1px_2px_rgba(10,36,29,0.04),0_18px_40px_-24px_rgba(10,36,29,0.22)] sm:p-6">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-sm font-extrabold tabular-nums text-[var(--accent-strong)]">
                      v{release.version}
                    </span>
                    <span className="text-xs font-medium text-[var(--muted)]">
                      {fmtDate(release.date)}
                    </span>
                    {index === 0 ? (
                      <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-[11px] font-bold text-[#06301f]">
                        {t.latest}
                      </span>
                    ) : null}
                  </div>

                  {release.highlight ? (
                    <p className="mt-3 text-[15px] font-bold leading-snug text-[var(--ink)]">
                      {release.highlight[locale]}
                    </p>
                  ) : null}

                  <div className="mt-4 space-y-4">
                    {release.groups.map((group) => {
                      const meta = KIND_META[group.kind];
                      const Icon = meta.icon;
                      return (
                        <div key={group.kind}>
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide"
                            style={{ background: meta.chipBg, color: meta.chipText }}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {t.kinds[group.kind]}
                          </span>
                          <ul className="mt-2 space-y-1.5">
                            {group.items.map((item, i) => (
                              <li
                                key={i}
                                className="flex gap-2.5 text-sm leading-relaxed text-[var(--ink)]"
                              >
                                <span
                                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
                                  style={{ background: meta.dot }}
                                />
                                <span>{item[locale]}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </main>
      </div>
    </div>
  );
}
