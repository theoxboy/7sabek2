"use client";

import * as React from "react";

type AnimatedNumberProps = {
  value: number;
  format?: (value: number) => string;
  duration?: number;
  className?: string;
};

function prefersReducedMotion() {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function AnimatedNumber({
  value,
  format,
  duration = 700,
  className,
}: AnimatedNumberProps) {
  const [display, setDisplay] = React.useState(value);
  const [flash, setFlash] = React.useState(false);
  const previous = React.useRef(value);
  const frame = React.useRef<number | null>(null);
  const flashTimeout = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (prefersReducedMotion()) {
      setDisplay(value);
      previous.current = value;
      return;
    }

    const startValue = previous.current;
    const delta = value - startValue;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(startValue + delta * eased);
      if (progress < 1) {
        frame.current = requestAnimationFrame(tick);
      } else {
        previous.current = value;
      }
    };

    frame.current = requestAnimationFrame(tick);
    setFlash(true);
    if (flashTimeout.current) {
      window.clearTimeout(flashTimeout.current);
    }
    flashTimeout.current = window.setTimeout(() => setFlash(false), 350);

    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
      if (flashTimeout.current) window.clearTimeout(flashTimeout.current);
    };
  }, [value, duration]);

  const formatted = format ? format(display) : display.toFixed(2);

  return (
    <span
      className={`inline-flex items-center transition-colors duration-200 motion-reduce:transition-none ${flash ? "text-[var(--accent-strong)]" : ""} ${className ?? ""}`}
    >
      {formatted}
    </span>
  );
}
