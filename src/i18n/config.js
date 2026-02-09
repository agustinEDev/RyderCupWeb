import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Custom backend para lazy loading de traducciones
// Reduce bundle inicial de ~313 KB a ~40 KB (solo carga common en idioma detectado)
const LazyBackend = {
  type: 'backend',

  init() {
    // No-op - required by i18next backend interface
  },

  read(language, namespace, callback) {
    // Dynamic import solo del archivo necesario
    import(`./locales/${language}/${namespace}.json`)
      .then((module) => {
        callback(null, module.default);
      })
      .catch((error) => {
        console.warn(`Failed to load ${language}/${namespace}:`, error);
        callback(error, null);
      });
  }
};

i18n
  .use(LazyBackend) // Custom backend para lazy loading
  .use(LanguageDetector) // Detecta idioma del navegador
  .use(initReactI18next) // Pasa i18n a react-i18next
  .init({
    fallbackLng: 'en', // Idioma por defecto si no se detecta
    defaultNS: 'common', // Namespace por defecto
    ns: ['common', 'auth', 'landing', 'dashboard', 'profile', 'competitions', 'devices', 'golfCourses', 'schedule', 'pricing', 'contact', 'legal'], // Namespaces disponibles

    // Lazy loading configuration
    partialBundledLanguages: true, // Permite cargar parcialmente los idiomas

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
