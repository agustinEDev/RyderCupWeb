import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import authEn from './locales/en/auth.json';
import authEs from './locales/es/auth.json';
import commonEn from './locales/en/common.json';
import commonEs from './locales/es/common.json';

const resources = {
  en: {
    auth: authEn,
    common: commonEn,
  },
  es: {
    auth: authEs,
    common: commonEs,
  },
};

i18n
  .use(LanguageDetector) // Detecta idioma del navegador
  .use(initReactI18next) // Pasa i18n a react-i18next
  .init({
    resources,
    fallbackLng: 'en', // Idioma por defecto si no se detecta
    defaultNS: 'common', // Namespace por defecto
    ns: ['common', 'auth'], // Namespaces disponibles

    detection: {
      // Orden de detección: localStorage -> navigator
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'], // Guardar selección en localStorage
    },

    interpolation: {
      escapeValue: false, // React ya escapa por defecto
    },

    react: {
      useSuspense: false, // Evita problemas con SSR
    },
  });

export default i18n;
