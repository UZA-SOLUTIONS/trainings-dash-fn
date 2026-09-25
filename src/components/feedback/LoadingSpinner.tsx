import { cn } from "@/lib/utils";
import { m } from "framer-motion";
import { useI18n } from "@/i18n/LanguageContext";

export function LoadingSpinner({
  label,
  className,
}: {
  label?: string;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <m.div
      className={cn("flex flex-col items-center justify-center gap-3 py-16", className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div className="size-16 overflow-hidden rounded-full">
        <img
          src="/image.png"
          alt=""
          className="size-full animate-spin [animation-duration:0.75s]"
        />
      </div>
      {label ? <p className="text-sm text-muted-foreground">{label}</p> : null}
      <span className="sr-only">{label ?? t("auth.loading")}</span>
    </m.div>
  );
}
