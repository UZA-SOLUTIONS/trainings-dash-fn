import type { ReactNode } from "react";
import { AnimatePresence, m } from "framer-motion";
import { useLocation } from "react-router-dom";
import { pageEase, pageVariants } from "@/lib/motion";

export function PageMotion({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <AnimatePresence mode="sync" initial={false}>
      <m.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={pageEase}
        className="flex min-h-0 flex-1 flex-col"
      >
        {children}
      </m.div>
    </AnimatePresence>
  );
}
