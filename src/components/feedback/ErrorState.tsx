import { m } from "framer-motion";
import { pageEase, riseVariants } from "@/lib/motion";

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <m.div
      role="alert"
      className="rounded-none border border-border/40 bg-card p-6 text-center"
      variants={riseVariants}
      initial="initial"
      animate="animate"
      transition={pageEase}
    >
      <h2 className="text-lg">{title}</h2>
      {message && <p className="mt-2 text-sm text-muted-foreground">{message}</p>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center justify-center border border-border/40 bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          Try again
        </button>
      )}
    </m.div>
  );
}
