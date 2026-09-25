import type { ReactNode } from "react";
import { m } from "framer-motion";
import { pageEase, riseVariants } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function FadeIn({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <m.div
      className={cn(className)}
      variants={riseVariants}
      initial="initial"
      animate="animate"
      transition={{ ...pageEase, delay }}
    >
      {children}
    </m.div>
  );
}
