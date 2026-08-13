import { useState, useRef, useEffect, useMemo, useId } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CountryFlag } from '../../utils/countryUtils';
import { formatCountryName } from '../../services/countries';

/**
 * CountryAutocomplete Component
 *
 * Country picker that narrows the list as you type. Replaces the native
 * <select>, which listed the 200 countries with no way to search: on a phone
 * that means scrolling the whole world to reach Portugal.
 *
 * Props:
 * - countries: array - Countries to choose from ({ code, name_es, name_en })
 * - value: string - Selected country code
 * - onChange: function - Receives the selected code, or '' when cleared
 * - id: string - Ties the label to the control
 * - label / placeholder / emptyMessage: string - Default to translated text
 * - disabled / error / required: boolean
 */
const CountryAutocomplete = ({
  countries = [],
  value = '',
  onChange,
  id,
  placeholder,
  disabled = false,
  error = false,
  label,
  required = false,
  emptyMessage
}) => {
  const { t, i18n } = useTranslation('common');
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const generatedId = useId();
  const controlId = id || generatedId;

  const selectedCountry = countries.find(c => c.code === value);

  // Se busca contra los dos idiomas y el código a la vez, no contra lo que se
  // esté mostrando: quien tiene la aplicación en español puede teclear "Spain",
  // y "ES" también encuentra España.
  const filteredCountries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return countries;

    return countries.filter(country =>
      (country.name_en || '').toLowerCase().includes(query) ||
      (country.name_es || '').toLowerCase().includes(query) ||
      (country.code || '').toLowerCase().includes(query)
    );
  }, [searchQuery, countries]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // El <select> nativo abría posicionado en la opción elegida. Sin esto la
  // lista arranca siempre por la A, de modo que quien tenga España guardada
  // abre y ve Afganistán: el país elegido queda fuera de la vista.
  // Solo al abrir, no al filtrar, donde lo que importa es el primer resultado.
  useEffect(() => {
    if (!isOpen) return;
    const selected = listRef.current?.querySelector('[aria-selected="true"]');
    // jsdom no implementa scrollIntoView, y tampoco lo tienen navegadores muy
    // viejos: la llamada es opcional para que su ausencia no rompa nada
    selected?.scrollIntoView?.({ block: 'nearest' });
  }, [isOpen]);

  const close = () => {
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleToggle = () => {
    if (disabled) return;
    if (isOpen) {
      close();
      return;
    }
    setIsOpen(true);
    // El foco va a la casilla de búsqueda al abrir: abrir esto es querer
    // escribir, y si no, hay que ir a buscarla con el tabulador
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSelect = (country) => {
    onChange(country.code);
    close();
  };

  const handleClear = (e) => {
    // Sin esto, el clic llega también al disparador y vuelve a abrir la lista
    e.stopPropagation();
    onChange('');
    setSearchQuery('');
  };

  // Escape cierra sin elegir, que es lo que espera cualquiera que abra esto por
  // error. Se escucha en el contenedor para que valga tanto desde el disparador
  // como desde la casilla de búsqueda.
  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && isOpen) {
      e.stopPropagation();
      close();
    }
  };

  return (
    <div className="relative" ref={wrapperRef} onKeyDown={handleKeyDown}>
      {label && (
        <label htmlFor={controlId} className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Es un <button>, no un <div> con onClick: un div no recibe el foco con
          el tabulador ni responde a Enter, así que el control entero quedaba
          fuera del alcance de quien no usa ratón */}
      <button
        type="button"
        id={controlId}
        onClick={handleToggle}
        disabled={disabled}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        data-testid="country-autocomplete-trigger"
        className={`w-full py-2 px-3 rounded-lg border text-left flex items-center justify-between gap-2 transition-all ${
          error
            ? 'border-red-300 focus:ring-2 focus:ring-red-200'
            : 'border-gray-300 focus:ring-2 focus:ring-primary'
        } ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'} focus:outline-none`}
      >
        <span className="flex items-center gap-2 min-w-0">
          {selectedCountry && (
            <CountryFlag countryCode={selectedCountry.code} style={{ width: '24px', height: 'auto' }} />
          )}
          {/* min-w-0 en el hijo flexible: sin él, truncate no recorta nada
              porque el ancho mínimo de la caja es el del texto entero */}
          <span className={`truncate ${selectedCountry ? 'text-gray-900' : 'text-gray-400'}`}>
            {selectedCountry
              ? formatCountryName(selectedCountry, i18n.language)
              : placeholder || t('countrySelect.placeholder', 'Select a country...')}
          </span>
        </span>

        <span className="flex items-center gap-1 flex-shrink-0">
          {value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleClear(e);
                }
              }}
              aria-label={t('countrySelect.clear', 'Clear selection')}
              data-testid="country-autocomplete-clear"
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('countrySelect.searchPlaceholder', 'Search countries...')}
                aria-label={t('countrySelect.searchPlaceholder', 'Search countries...')}
                data-testid="country-autocomplete-search"
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
              />
            </div>
          </div>

          <ul ref={listRef} role="listbox" className="overflow-y-auto max-h-60 py-1">
            {filteredCountries.length === 0 ? (
              <li className="px-4 py-3 text-center text-gray-500 text-sm">
                {searchQuery
                  ? t('countrySelect.noMatches', 'No countries match your search')
                  : emptyMessage || t('countrySelect.empty', 'No countries available')}
              </li>
            ) : (
              filteredCountries.map((country) => (
                <li key={country.code}>
                  {/* El rol va en el botón, que es lo que se pulsa. Puesto en
                      el <li>, el elemento anunciado como opción y el que
                      responde al clic eran distintos */}
                  <button
                    type="button"
                    role="option"
                    aria-selected={country.code === value}
                    onClick={() => handleSelect(country)}
                    className={`w-full px-3 py-2.5 text-left flex items-center gap-2 transition-colors ${
                      country.code === value
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'hover:bg-gray-50 text-gray-900'
                    }`}
                  >
                    <CountryFlag countryCode={country.code} style={{ width: '24px', height: 'auto' }} />
                    {/* El nombre va en el idioma activo, no siempre en inglés:
                        el resto de la aplicación ya usa formatCountryName */}
                    <span className="truncate text-sm">
                      {formatCountryName(country, i18n.language)}
                    </span>
                    <span className="ml-auto text-xs text-gray-400 flex-shrink-0">{country.code}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CountryAutocomplete;
