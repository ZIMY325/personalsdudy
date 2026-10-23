import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { LOCALE_STORAGE_KEY, readLocale, translate, type Locale, type TranslationValues } from '@/lib/translations';

const LanguageContext = createContext<{
  locale: Locale; setLocale: (locale: Locale) => void;
  t: (key: string, values?: TranslationValues) => string;
} | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const parent = useContext(LanguageContext);
  return parent ? <>{children}</> : <StandaloneLanguageProvider>{children}</StandaloneLanguageProvider>;
}

function StandaloneLanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    try { return readLocale(window.localStorage); } catch { return 'en'; }
  });
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = translate(locale, 'Learning Path Engine');
    try { window.localStorage.setItem(LOCALE_STORAGE_KEY, locale); } catch { /* In-memory switching still works. */ }
  }, [locale]);
  const value = useMemo(() => ({ locale, setLocale,
    t: (key: string, values?: TranslationValues) => translate(locale, key, values),
  }), [locale]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext) ?? {
    locale: 'en' as Locale, setLocale: () => {},
    t: (key: string, values?: TranslationValues) => translate('en', key, values),
  };
}

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLanguage();
  const options: Array<[Locale, string]> = [['zh-CN', '简体中文'], ['en', 'English'], ['ms', 'Bahasa Melayu']];
  return (
    <div role="group" aria-label={t('Language')} className="flex w-fit flex-wrap gap-1 rounded-lg border border-border bg-card p-1">
      {options.map(([value, label]) => (
        <button key={value} type="button" lang={value} aria-pressed={locale === value}
          data-testid={`language-${value}`} onClick={() => setLocale(value)}
          className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${locale === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>
          {label}
        </button>
      ))}
    </div>
  );
}
