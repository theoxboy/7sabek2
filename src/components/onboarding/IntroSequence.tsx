"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  getOnboardingEnter,
  getOnboardingExit,
  getOnboardingTransition,
  ONBOARDING_ANIMATE,
} from "@/components/onboarding/onboardingMotion";
import { getOnboardingLocale, t } from "@/lib/onboardingI18n";

export const MESSAGE_INTERVAL_MS = 2000;
export const FADE_MS = 300;

export type IntroSequenceUser = {
  firstName: string;
  fullName?: string | null;
  dateOfBirth?: string | null;
  profilePhoto?: string | null;
};

type IntroSequenceProps = {
  user: IntroSequenceUser;
  onStart: () => void;
  startLabel?: string;
  messageIntervalMs?: number;
  showSkip?: boolean;
};

export function IntroSequence({
  user,
  onStart,
  startLabel,
  messageIntervalMs = MESSAGE_INTERVAL_MS,
  showSkip = true,
}: IntroSequenceProps) {
  const reduceMotion = useReducedMotion();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const nextStepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionDirection: 1 | -1 = 1;

  const firstName = user.firstName.trim();
  // The page sets the language chosen at sign-up before rendering this screen.
  const locale = getOnboardingLocale();
  const textDir = locale === "ar" ? "rtl" : "ltr";
  const messages = useMemo(
    () => [
      firstName
        ? t(`مرحبا بك ${firstName} فـ 7سابك`, `Bienvenue ${firstName} sur 7sabek`, `Welcome to 7sabek, ${firstName}`)
        : t("مرحبا بك فـ 7سابك", "Bienvenue sur 7sabek", "Welcome to 7sabek"),
      t(
        "شي أسئلة قصيرة على الدخل والمصاريف، ومن بعد نوجدو ليك خطة الأظرفة.",
        "Quelques questions courtes sur tes revenus et dépenses, puis on prépare ton plan d'enveloppes.",
        "A few short questions about your income and spending, then we prepare your envelope plan."
      ),
    ],
    // locale: the messages follow the chosen language.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [firstName, locale]
  );
  const privacyNote = t(
    "معلوماتك المالية خاصة وآمنة. كنستعملوها غير باش نعطيوك خطة تناسب وضعيتك، وتقدر تبدلها فـ أي وقت.",
    "Tes informations financières restent privées et sécurisées. Elles servent uniquement à te proposer un plan adapté, modifiable à tout moment.",
    "Your financial information stays private and secure. It's only used to suggest a plan that fits you, and you can change it anytime."
  );

  const lastMessageIndex = messages.length - 1;
  const startStepIndex = messages.length;
  const showStartButton = currentStepIndex >= startStepIndex;
  const showFooter = currentStepIndex >= lastMessageIndex;
  const onboardingTransition = getOnboardingTransition(reduceMotion);

  const clearTimers = () => {
    if (nextStepTimerRef.current) clearTimeout(nextStepTimerRef.current);
    nextStepTimerRef.current = null;
  };

  useEffect(() => {
    if (showStartButton) return;
    nextStepTimerRef.current = setTimeout(() => {
      setCurrentStepIndex((prev) => Math.min(prev + 1, startStepIndex));
    }, messageIntervalMs);
    return () => {
      if (nextStepTimerRef.current) {
        clearTimeout(nextStepTimerRef.current);
        nextStepTimerRef.current = null;
      }
    };
  }, [currentStepIndex, showStartButton, messageIntervalMs, startStepIndex]);

  useEffect(() => {
    return () => clearTimers();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--surface)] text-[var(--ink)]">
      <div className="relative mx-auto flex min-h-screen w-full max-w-[920px] flex-col px-6 pb-10 pt-8 sm:px-10">
        {showSkip && !showStartButton ? (
          <button
            type="button"
            onClick={() => {
              clearTimers();
              onStart();
            }}
            className="absolute right-6 top-8 inline-flex min-h-11 items-center rounded-full border border-[var(--border)] px-4 text-[14px] font-semibold text-[var(--ink)] transition hover:bg-[var(--bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:right-10"
          >
            {t("دوز", "Passer", "Skip")}
          </button>
        ) : null}

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-2xl text-center">
            <AnimatePresence mode="wait" initial={false}>
              {showStartButton ? (
                <motion.button
                  key="intro-start"
                  type="button"
                  onClick={onStart}
                  initial={getOnboardingEnter(reduceMotion, transitionDirection)}
                  animate={ONBOARDING_ANIMATE}
                  exit={getOnboardingExit(reduceMotion, transitionDirection)}
                  transition={onboardingTransition}
                  className="inline-flex h-14 items-center justify-center rounded-2xl bg-[var(--ink)] px-8 text-[18px] font-semibold text-[var(--bg)] shadow-[0_16px_30px_-18px_rgba(0,0,0,0.5)] transition hover:opacity-90"
                >
                  {startLabel ?? t("يلا نبدأو", "C'est parti", "Let's go")}
                </motion.button>
              ) : (
                <motion.p
                  key={`intro-message-${currentStepIndex}`}
                  initial={getOnboardingEnter(reduceMotion, transitionDirection)}
                  animate={ONBOARDING_ANIMATE}
                  exit={getOnboardingExit(reduceMotion, transitionDirection)}
                  transition={onboardingTransition}
                  className="text-[31px] font-semibold leading-[1.22] tracking-[-0.02em] sm:text-[38px]"
                  dir={textDir}
                >
                  {messages[currentStepIndex]}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>

        {showFooter ? (
          <motion.p
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0.05 : 0.25 }}
            className="mx-auto max-w-2xl text-center text-[13px] leading-6 text-[var(--muted)]"
            dir={textDir}
          >
            {privacyNote}
          </motion.p>
        ) : null}
      </div>
    </div>
  );
}
