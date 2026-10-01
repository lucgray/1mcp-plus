import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';

import { en } from './locales/en';
import { zh } from './locales/zh';

export type Locale = 'en' | 'zh';

const STORAGE_KEY = '1mcp-admin-locale';
const messages: Record<Locale, Record<string, string>> = { en, zh };

export interface I18n {
  locale: Locale;
  setLocale(locale: Locale): void;
  t(key: string, params?: Record<string, string | number>): string;
}

const I18nContext = createContext<I18n | null>(null);

function detectLocale(): Locale {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'zh') {
      return saved;
    }
  } catch {
    // localStorage may be unavailable (private mode); fall through to detection
  }
  return navigator.language?.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);

  const value = useMemo<I18n>(
    () => ({
      locale,
      setLocale(next: Locale) {
        try {
          window.localStorage.setItem(STORAGE_KEY, next);
        } catch {
          // best effort — locale still applies for the session
        }
        setLocaleState(next);
      },
      t(key: string, params?: Record<string, string | number>) {
        let template = messages[locale][key] ?? messages.en[key] ?? key;
        if (params) {
          for (const [name, value] of Object.entries(params)) {
            template = template.replaceAll(`{${name}}`, String(value));
          }
        }
        return template;
      },
    }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used inside I18nProvider');
  }
  return context;
}
