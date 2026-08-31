"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  getOnboardingEnter,
  getOnboardingExit,
  getOnboardingTransition,
  ONBOARDING_ANIMATE,
} from "@/components/onboarding/onboardingMotion";

export const MESSAGE_INTERVAL_MS = 2000;
export const FADE_MS = 300;
const PRIVACY_NOTE =
  "معلوماتك المالية خاصة وآمنة. كنستعملوها غير باش نعطيوك خطة تناسب وضعيتك، وتقدر تبدلها فـ أي وقت.";

export type IntroSequenceUser = {
  firstName: string;
  fullName?: string | null;
  dateOfBirth?: string | null;
  profilePhoto?: string | null;
};

type IntroSequenceProps = {
  user: IntroSequenceUser;
  onStart: () => void;
  startLabel?: "يلا نبدأو";
  messageIntervalMs?: number;
  showSkip?: boolean;
};

export function IntroSequence({
  user,
  onStart,
  startLabel = "يلا نبدأو",
  messageIntervalMs = MESSAGE_INTERVAL_MS,
  showSkip = true,
}: IntroSequenceProps) {
  const reduceMotion = useReducedMotion();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const nextStepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionDirection: 1 | -1 = 1;

  const firstName = user.firstName.trim();
  const messages = useMemo(
    () => [
      `مرحبا بك ${firstName} فـ 7سابك`,
      "أنا المساعد المالي الذكي ديالك",
      "وغادي نعاونك تنظّم فلوسك خطوة بخطوة",
      "قبل ما نبدأو…",
      "غادي نطرح عليك شوية ديال الأسئلة باش نفهم وضعيتك المالية.",
    ],
    [firstName]
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
              setCurrentStepIndex(startStepIndex);
            }}
            className="absolute right-6 top-8 text-[14px] font-medium text-[var(--muted)] transition hover:text-[var(--ink)] sm:right-10"
          >
            ديرها من بعد
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
                  {startLabel}
                </motion.button>
              ) : (
                <motion.p
                  key={`intro-message-${currentStepIndex}`}
                  initial={getOnboardingEnter(reduceMotion, transitionDirection)}
                  animate={ONBOARDING_ANIMATE}
                  exit={getOnboardingExit(reduceMotion, transitionDirection)}
                  transition={onboardingTransition}
                  className="text-[31px] font-semibold leading-[1.22] tracking-[-0.02em] sm:text-[38px]"
                  dir="rtl"
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
            dir="rtl"
          >
            {PRIVACY_NOTE}
          </motion.p>
        ) : null}
      </div>
    </div>
  );
}
