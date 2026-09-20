"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { LANGUAGES, TRANSLATIONS, type TranslationKey } from "./translations";

const STORAGE_KEY = "aws_lang";

interface I18nContextValue {
  lang: string;
  setLang: (code: string) => void;
  t: (key: TranslationKey | string) => string;
  languages: typeof LANGUAGES;
  showSplash: boolean;
  dismissSplash: () => void;
  openSplash: () => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function readStoredLang(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeLang(code: string) {
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    /* ignore — private browsing, blocked storage, etc. */
  }
}

/**
 * React port of reference-js/lang.js's vanilla-DOM i18n system. Same 12
 * languages, same translation keys (see lib/i18n/translations.ts, extracted
 * programmatically from the original), but delivered via Context instead of
 * manual DOM re-writes. `disableSplash` is used on pages (e.g. booking) that
 * never showed the language picker in the original site.
 */
export function I18nProvider({
  children,
  disableSplash = false,
}: {
  children: ReactNode;
  disableSplash?: boolean;
}) {
  const [lang, setLangState] = useState("en");
  const [showSplash, setShowSplash] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect --
     One-time read on mount: localStorage isn't available during SSR, so this
     can't be done during render. This runs once per mount, not in a loop —
     it's a legitimate hydration read from an external system (browser
     storage), which is exactly what effects are for. */
  useEffect(() => {
    const stored = readStoredLang();
    if (stored && TRANSLATIONS[stored]) {
      setLangState(stored);
      setHydrated(true);
    } else {
      if (!disableSplash) setShowSplash(true);
      setHydrated(true);
    }
  }, [disableSplash]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const setLang = useCallback((code: string) => {
    if (!TRANSLATIONS[code]) return;
    setLangState(code);
    storeLang(code);
    setShowSplash(false);
  }, []);

  const dismissSplash = useCallback(() => setShowSplash(false), []);
  const openSplash = useCallback(() => setShowSplash(true), []);

  const t = useCallback(
    (key: TranslationKey | string) => {
      const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
      return dict[key] ?? TRANSLATIONS.en[key] ?? key;
    },
    [lang]
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      lang,
      setLang,
      t,
      languages: LANGUAGES,
      // Avoid a flash of the splash before we've checked localStorage.
      showSplash: hydrated && showSplash,
      dismissSplash,
      openSplash,
    }),
    [lang, setLang, t, hydrated, showSplash, dismissSplash, openSplash]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n() must be used inside an <I18nProvider>");
  }
  return ctx;
}

/** Convenience hook when a component only needs the translate function. */
export function useTranslation() {
  return useI18n().t;
}
