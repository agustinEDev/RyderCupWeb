import { useTranslation } from 'react-i18next';

/**
 * Language Switcher Component
 *
 * Permite al usuario cambiar entre inglés y español.
 * Usa banderas como indicadores visuales.
 * La selección se guarda en localStorage automáticamente.
 */
const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  const languages = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
  ];

  return (
    <div className="flex items-center gap-2">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => changeLanguage(lang.code)}
          className={`
            flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium
            transition-all duration-200
            ${
              i18n.language === lang.code
                ? 'bg-primary/10 text-primary border-2 border-primary'
                : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
            }
          `}
          aria-label={`Change language to ${lang.label}`}
          title={lang.label}
        >
          <span className="text-lg" role="img" aria-label={lang.label}>
            {lang.flag}
          </span>
          <span className="hidden sm:inline">{lang.label}</span>
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;
