import { useTranslation } from 'react-i18next';

/**
 * Language Switcher Component
 *
 * Permite al usuario cambiar entre inglés y español.
 * Usa un dropdown/select para cambiar el idioma.
 * La selección se guarda en localStorage automáticamente.
 */
const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (event) => {
    i18n.changeLanguage(event.target.value);
  };

  const languages = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
  ];

  // Normalizar idioma: extraer solo los primeros 2 caracteres (ej. "es-ES" → "es")
  // Defensive fallback: si i18n.language es null/undefined, usar fallback seguro
  const safeLanguage = i18n.language || i18n.options?.fallbackLng?.[0] || languages[0].code;
  const currentLanguage = safeLanguage.split('-')[0];

  return (
    <div className="relative">
      <select
        value={currentLanguage}
        onChange={changeLanguage}
        className="appearance-none bg-white border-2 border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm font-medium text-gray-700 hover:border-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
        aria-label="Select language"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.flag}
          </option>
        ))}
      </select>
      {/* Icono de dropdown personalizado */}
      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
};

export default LanguageSwitcher;
