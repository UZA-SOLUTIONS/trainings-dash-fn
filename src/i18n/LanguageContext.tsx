import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { en, type MessageKey } from "@/i18n/en";
import { rw } from "@/i18n/rw";
import { interpolate, loadLang, saveLang, type Lang } from "@/i18n/config";

const DICTS: Record<Lang, Record<MessageKey, string>> = { en, rw };

type I18nValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  locale: string;
  label: (value: string | null | undefined) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => loadLang());

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    saveLang(next);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === "rw" ? "rw" : "en";
  }, [lang]);

  const value = useMemo<I18nValue>(() => {
    const dict = DICTS[lang];
    const t = (key: MessageKey, vars?: Record<string, string | number>) =>
      interpolate(dict[key] ?? en[key] ?? key, vars);
    const label = (value: string | null | undefined) => {
      if (!value) return "—";
      for (const prefix of ["status", "role", "session", "type", "category", "day"] as const) {
        const key = `${prefix}.${value}` as MessageKey;
        if (key in dict) return t(key);
      }
      return value.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
    };
    return {
      lang,
      setLang,
      t,
      locale: lang === "rw" ? "rw-RW" : "en-GB",
      label,
    };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within LanguageProvider");
  return ctx;
}
