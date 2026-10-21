import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

/**
 * Language Switcher Component
 *
 * Permite al usuario cambiar entre inglés y español.
 * Usa un dropdown/select para cambiar el idioma.
 * La selección se guarda en localStorage automáticamente.
 *
 * @param {boolean} [props.compacto=false] Solo un globo, sin texto: para la
 *   barra de escritorio con sesion, donde entre md y xl no cabe mas (QA, 20 oct)
 */
const LanguageSwitcher = ({ compacto = false }) => {
  const { t, i18n } = useTranslation();

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

  // El select nativo, invisible, cubre el globo: se ve el icono y al pulsar se
  // abre el selector del sistema, con teclado y lector de pantalla de serie.
  // Como no se ve, el anillo de foco lo pinta la caja
  if (compacto) {
    return (
      <div
        data-testid="idioma-compacto"
        className="relative flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 hover:text-primary focus-within:ring-2 focus-within:ring-primary/40"
      >
        <Globe className="h-5 w-5" aria-hidden="true" />
        <select
          value={currentLanguage}
          onChange={changeLanguage}
          aria-label={t('header.changeLanguage')}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        >
          {languages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="relative">
      <select
        value={currentLanguage}
        onChange={changeLanguage}
        className="appearance-none bg-white border-2 border-gray-200 rounded-lg px-3 py-2 pr-8 min-h-[44px] md:min-h-0 text-sm font-medium text-gray-700 hover:border-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
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
