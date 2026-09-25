import { m } from "framer-motion";
import { pageEase, riseVariants } from "@/lib/motion";

export function EmptyState({ message }: { message: string }) {
  return (
    <m.p
      className="text-sm text-muted-foreground"
      variants={riseVariants}
      initial="initial"
      animate="animate"
      transition={pageEase}
    >
      {message}
    </m.p>
  );
}
