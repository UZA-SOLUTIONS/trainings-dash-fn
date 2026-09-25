import type { Transition, Variants } from "framer-motion";

export const pageEase: Transition = {
  duration: 0.28,
  ease: [0.22, 1, 0.36, 1],
};

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

export const fadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const riseVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export const listVariants: Variants = {
  animate: {
    transition: { staggerChildren: 0.04, delayChildren: 0.04 },
  },
};

export const listItemVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
};
