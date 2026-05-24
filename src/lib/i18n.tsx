"use client";

/**
 * i18n — minimal EN / TH switcher.
 *
 *   const { loc } = useLocale();
 *   <h1>{translate(loc, { en: "Company Pulse", th: "ชีพจรบริษัท" })}</h1>
 *
 * Thai strings in this codebase MUST render in a non-looped Thai face
 * (IBM Plex Sans Thai, Noto Sans Thai, Prompt, Kanit). Looped faces
 * like Sarabun are banned per CLAUDE.md §0 — they read as foreigner-
 * drawn "learner material" to Thai readers. The default face stack
 * is already set in `src/app/layout.tsx`.
 *
 * Persisted in localStorage under `tkc.locale`. Default is `en` —
 * v8.2 will flip default to `th` once tab bodies ship Thai.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Locale = "en" | "th";
export interface Dict {
  en: string;
  th: string;
}

export function translate(loc: Locale, d: Dict): string {
  return d[loc];
}

interface LocaleContextValue {
  loc: Locale;
  setLoc: (l: Locale) => void;
}

const STORAGE_KEY = "tkc.locale";
const DEFAULT_LOCALE: Locale = "en";

const LocaleContext = createContext<LocaleContextValue>({
  loc: DEFAULT_LOCALE,
  setLoc: () => {},
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [loc, setLocState] = useState<Locale>(DEFAULT_LOCALE);

  // Hydrate from localStorage after mount — useEffect runs after hydration,
  // so this never causes a server/client mismatch.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "en" || stored === "th") {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Locale hydration must read client storage after mount.
        setLocState(stored);
      }
    } catch {
      // localStorage disabled — stay on default.
    }
  }, []);

  const setLoc = useCallback((next: Locale) => {
    setLocState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // noop
    }
  }, []);

  const value = useMemo(() => ({ loc, setLoc }), [loc, setLoc]);

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}

/** Convenience for non-component code that needs a translator bound to current loc. */
export function useT() {
  const { loc } = useLocale();
  return useCallback((d: Dict) => translate(loc, d), [loc]);
}
