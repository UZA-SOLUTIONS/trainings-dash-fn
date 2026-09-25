export const LANGS = ["en", "rw"] as const;
export type Lang = (typeof LANGS)[number];

export const LANG_LABEL: Record<Lang, string> = {
  en: "English",
  rw: "Ikinyarwanda",
};

const LANG_KEY = "training_dash_lang";

export function loadLang(): Lang {
  try {
    const raw = localStorage.getItem(LANG_KEY);
    if (raw === "rw" || raw === "en") return raw;
  } catch {
    /* ignore */
  }
  return "en";
}

export function saveLang(lang: Lang) {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* ignore */
  }
}

export function interpolate(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    vars[key] == null ? "" : String(vars[key]),
  );
}
