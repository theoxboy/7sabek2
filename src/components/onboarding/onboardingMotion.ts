export function getOnboardingTransition(reduceMotion: boolean | null | undefined) {
  return reduceMotion
    ? { duration: 0.24, ease: [0.4, 0, 0.2, 1] }
    : { duration: 0.62, ease: [0.16, 1, 0.3, 1] };
}

export function getOnboardingEnter(
  reduceMotion: boolean | null | undefined,
  direction: 1 | -1
) {
  if (reduceMotion) return { opacity: 0 };
  return {
    opacity: 0,
    y: direction === 1 ? 48 : -28,
    filter: "blur(6px)",
  };
}

export function getOnboardingExit(
  reduceMotion: boolean | null | undefined,
  direction: 1 | -1
) {
  if (reduceMotion) return { opacity: 0 };
  return {
    opacity: 0,
    y: direction === 1 ? -24 : 48,
    filter: "blur(4px)",
  };
}

export const ONBOARDING_ANIMATE = {
  opacity: 1,
  y: 0,
  filter: "blur(0px)",
};
