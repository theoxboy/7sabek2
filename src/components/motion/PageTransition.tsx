"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const variants = {
  initial: { opacity: 0, y: 10, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -8, filter: "blur(6px)" },
};

export function PageTransition({
  routeKey,
  children,
}: {
  routeKey: string;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  return (
    <AnimatePresence mode="wait">
      <motion.main
        key={routeKey}
        initial={reduced ? false : "initial"}
        animate={reduced ? false : "animate"}
        exit={reduced ? undefined : "exit"}
        variants={variants}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="motion-reduce:transition-none"
      >
        {children}
      </motion.main>
    </AnimatePresence>
  );
}
