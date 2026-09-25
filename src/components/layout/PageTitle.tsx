import { useEffect, type ReactNode } from "react";
import { m } from "framer-motion";
import { pageEase, riseVariants } from "@/lib/motion";

export function PageTitle({
  children,
  description,
  actions,
}: {
  children: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  useEffect(() => {
    const previous = document.title;
    document.title = children;
    return () => {
      document.title = previous;
    };
  }, [children]);

  return (
    <m.div
      className="mb-5 text-left"
      variants={riseVariants}
      initial="initial"
      animate="animate"
      transition={pageEase}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{children}</h1>
          {description ? (
            <p className="mt-1 text-sm font-normal text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
    </m.div>
  );
}
