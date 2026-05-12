"use client";

import { motion } from "framer-motion";

import { useInViewOnce } from "@/lib/hooks/useInViewOnce";

export function ChartReveal({
  children,
  className,
}: {
  children: (inView: boolean) => React.ReactNode;
  className?: string;
}) {
  const { ref, inView } = useInViewOnce<HTMLDivElement>();
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={reduced ? false : { opacity: 0, y: 12, filter: "blur(6px)" }}
      animate={inView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {children(inView)}
    </motion.div>
  );
}
