import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/LanguageContext";
import type { Lang } from "@/i18n/config";

export function LanguageToggle({
  variant = "light",
  collapsed = false,
}: {
  variant?: "light" | "sidebar";
  collapsed?: boolean;
}) {
  const { lang, setLang, t } = useI18n();
  const btn =
    variant === "sidebar"
      ? "flex-1 py-2 text-xs font-medium text-primary-foreground"
      : "flex-1 py-2 text-xs font-medium text-foreground";
  const active =
    variant === "sidebar"
      ? "bg-volt text-volt-foreground"
      : "bg-primary text-primary-foreground";

  return (
    <div
      className={cn(
        "flex overflow-hidden border",
        variant === "sidebar" ? "border-primary-foreground/25" : "border-border/40",
        collapsed && "lg:flex-col",
      )}
      role="group"
      aria-label={t("nav.language")}
    >
      {(["en", "rw"] as Lang[]).map((id) => (
        <button
          key={id}
          type="button"
          className={cn(btn, lang === id && active)}
          aria-pressed={lang === id}
          onClick={() => setLang(id)}
        >
          {id === "en" ? "EN" : "RW"}
        </button>
      ))}
    </div>
  );
}
