import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import enCommon from './locales/en/common.json';
import arCommon from './locales/ar/common.json';

export const SUPPORTED_LOCALES = ['en', 'ar'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const RTL_LOCALES = new Set<SupportedLocale>(['ar']);

export function directionFor(locale: string): 'ltr' | 'rtl' {
  return RTL_LOCALES.has(locale as SupportedLocale) ? 'rtl' : 'ltr';
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: enCommon },
      ar: { common: arCommon },
    },
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LOCALES,
    defaultNS: 'common',
    ns: ['common'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['querystring', 'cookie', 'localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage', 'cookie'],
      lookupQuerystring: 'lng',
    },
  });

function applyHtmlAttributes(lng: string): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.lang = lng;
  root.dir = directionFor(lng);
}

applyHtmlAttributes(i18n.resolvedLanguage ?? i18n.language ?? 'en');
i18n.on('languageChanged', applyHtmlAttributes);

export default i18n;
