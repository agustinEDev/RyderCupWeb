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
 * Sustituir un <select> obliga a reponer a mano todo lo que traía de fábrica:
 * flechas, Home/End, el nombre accesible y devolver el foco al cerrar. Sin eso
 * el cambio mejora la búsqueda a costa de quien no usa ratón.
 *
 * Props:
 * - countries: array - Countries to choose from ({ code, name_es, name_en })
 * - value: string - Selected country code
 * - onChange: function - Receives the selected code, or '' when cleared
 * - id: string - Ties the label to the control
 * - label / placeholder / emptyMessage: string - Default to translated text
 * - disabled / error / required: boolean
 */

// Cuántas opciones se pintan a la vez. Cada una monta un <img> de flagcdn, así
// que sin tope abrir el desplegable dispara ~200 peticiones a un CDN externo de
// golpe. `loading="lazy"` no basta: dentro de un contenedor con scroll los
// navegadores lo respetan de forma desigual. Quien busque algo fuera de los 50
// primeros tiene la casilla de búsqueda justo encima, que es para lo que está.
const MAX_VISIBLE_OPTIONS = 50;

const CountryAutocomplete = ({
  countries = [],
  value = '',
  onChange,
  id,
  placeholder,
  disabled = false,
  error = false,
  label,
  // Cada formulario pinta sus etiquetas a su manera (unos font-semibold mb-2,
  // otros font-medium mb-1). Se deja elegir para que mover la etiqueta dentro
  // del componente no cambie el aspecto de la pantalla que lo monta.
  labelClassName = 'block text-sm font-medium text-gray-700 mb-1',
  required = false,
  emptyMessage
}) => {
  const { t, i18n } = useTranslation('common');
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // Opción resaltada por teclado. -1 es "ninguna": al abrir no se presume nada,
  // igual que el <select>, que tampoco preselecciona al desplegar.
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const triggerRef = useRef(null);
  const generatedId = useId();
  const controlId = id || generatedId;
  const listboxId = `${controlId}-listbox`;
  const optionId = (index) => `${controlId}-option-${index}`;

  const selectedCountry = countries.find(c => c.code === value);

  // Se busca contra los dos idiomas y el código a la vez, no contra lo que se
  // esté mostrando: quien tiene la aplicación en español puede teclear "Spain",
  // y "ES" también encuentra España.
  const matchingCountries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return countries;

    return countries.filter(country =>
      (country.name_en || '').toLowerCase().includes(query) ||
      (country.name_es || '').toLowerCase().includes(query) ||
      (country.code || '').toLowerCase().includes(query)
    );
  }, [searchQuery, countries]);

  const visibleCountries = matchingCountries.slice(0, MAX_VISIBLE_OPTIONS);
  const hiddenCount = matchingCountries.length - visibleCountries.length;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery('');
        setActiveIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // El <select> nativo abría posicionado en la opción elegida. Sin esto, la
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

  // Moverse con las flechas no sirve de nada si la opción resaltada queda fuera
  // de la caja con scroll
  useEffect(() => {
    if (activeIndex < 0) return;
    // Los botones son los hijos directos del listbox, así que el índice basta
    // y no hace falta buscar por id ni escapar el selector
    listRef.current?.children[activeIndex]?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex]);

  const close = ({ returnFocus = false } = {}) => {
    setIsOpen(false);
    setSearchQuery('');
    setActiveIndex(-1);
    // Cerrar desmonta la casilla de búsqueda, que es donde estaba el foco: sin
    // devolverlo al disparador, el siguiente Tab reempieza arriba de la página
    if (returnFocus) triggerRef.current?.focus();
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
    close({ returnFocus: true });
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
      close({ returnFocus: true });
    }
  };

  const moveActive = (delta) => {
    if (visibleCountries.length === 0) return;
    setActiveIndex((prev) => {
      const next = prev + delta;
      if (next < 0) return visibleCountries.length - 1;
      if (next >= visibleCountries.length) return 0;
      return next;
    });
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveActive(1);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveActive(-1);
      return;
    }
    if (e.key === 'Home') {
      e.preventDefault();
      if (visibleCountries.length > 0) setActiveIndex(0);
      return;
    }
    if (e.key === 'End') {
      e.preventDefault();
      if (visibleCountries.length > 0) setActiveIndex(visibleCountries.length - 1);
      return;
    }
    if (e.key === 'Enter') {
      // Esta casilla vive dentro del <form> de las cinco pantallas que montan
      // el componente, y todas tienen botón de envío: sin cortar el Enter, el
      // gesto natural de teclear "Portu" y confirmar no elige país y envía el
      // formulario. En Registro, con lo demás relleno, da de alta la cuenta.
      e.preventDefault();
      const active = activeIndex >= 0 ? visibleCountries[activeIndex] : null;
      // Sin nada resaltado, Enter sobre una búsqueda escrita elige el primer
      // resultado, que es lo que el gesto pretendía. Sin búsqueda no elige
      // nada: quedarse con el primero de los 200 sería elegir por el usuario.
      const choice = active || (searchQuery.trim() ? visibleCountries[0] : null);
      if (choice) handleSelect(choice);
    }
  };

  return (
    <div className="relative" ref={wrapperRef} onKeyDown={handleKeyDown}>
      {label && (
        <label htmlFor={controlId} className={labelClassName}>
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative">
        {/* Es un <button>, no un <div> con onClick: un div no recibe el foco con
            el tabulador ni responde a Enter, así que el control entero quedaba
            fuera del alcance de quien no usa ratón */}
        <button
          ref={triggerRef}
          type="button"
          id={controlId}
          onClick={handleToggle}
          disabled={disabled}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          data-testid="country-autocomplete-trigger"
          className={`w-full py-2 pl-3 pr-16 rounded-lg border text-left flex items-center gap-2 transition-all ${
            error
              ? 'border-red-300 focus:ring-2 focus:ring-red-200'
              : 'border-gray-300 focus:ring-2 focus:ring-primary'
          } ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'} focus:outline-none`}
        >
          {selectedCountry && (
            <CountryFlag countryCode={selectedCountry.code} style={{ width: '24px', height: 'auto' }} />
          )}
          {/* min-w-0 en el hijo flexible: sin él, truncate no recorta nada
              porque el ancho mínimo de la caja es el del texto entero */}
          <span className={`min-w-0 truncate ${selectedCountry ? 'text-gray-900' : 'text-gray-400'}`}>
            {selectedCountry
              ? formatCountryName(selectedCountry, i18n.language)
              : placeholder || t('countrySelect.placeholder', 'Select a country...')}
          </span>
        </button>

        {/* La flecha es decorativa y no debe robar el clic al disparador */}
        <ChevronDown
          aria-hidden="true"
          className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />

        {/* Hermano del disparador, no hijo suyo. Anidado era un <span
            role="button"> dentro de un <button>: contenido interactivo dentro
            de <button> es HTML inválido, y WebKit reasigna ese clic al botón
            padre, así que en iOS tocar la X abría la lista en vez de limpiar */}
        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            aria-label={t('countrySelect.clear', 'Clear selection')}
            data-testid="country-autocomplete-clear"
            className="absolute right-8 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary rounded"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                role="combobox"
                aria-expanded="true"
                aria-controls={listboxId}
                aria-autocomplete="list"
                // Lo que se anuncia al moverse con las flechas: sin esto el
                // lector de pantalla no dice nada al cambiar el resaltado
                aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setActiveIndex(-1);
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder={t('countrySelect.searchPlaceholder', 'Search countries...')}
                aria-label={t('countrySelect.searchPlaceholder', 'Search countries...')}
                data-testid="country-autocomplete-search"
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
              />
            </div>
          </div>

          {/* Los botones cuelgan directos del listbox. Con <ul>/<li> de por
              medio, los <li> quedaban entre el role="listbox" y las
              role="option", que es una estructura que ARIA no admite */}
          <div
            ref={listRef}
            role="listbox"
            id={listboxId}
            // La etiqueta admite nodos (un "(opcional)" en gris, por ejemplo),
            // y un nodo como aria-label se anunciaría como [object Object]
            aria-label={
              typeof label === 'string'
                ? label
                : placeholder || t('countrySelect.placeholder', 'Select a country...')
            }
            className="overflow-y-auto max-h-60 py-1"
          >
            {visibleCountries.length === 0 ? (
              <p className="px-4 py-3 text-center text-gray-500 text-sm">
                {searchQuery
                  ? t('countrySelect.noMatches', 'No countries match your search')
                  : emptyMessage || t('countrySelect.empty', 'No countries available')}
              </p>
            ) : (
              visibleCountries.map((country, index) => (
                <button
                  key={country.code}
                  id={optionId(index)}
                  type="button"
                  role="option"
                  aria-selected={country.code === value}
                  onClick={() => handleSelect(country)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`w-full px-3 py-2.5 text-left flex items-center gap-2 transition-colors ${
                    country.code === value
                      ? 'bg-primary/10 text-primary font-medium'
                      : index === activeIndex
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-900'
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
              ))
            )}
          </div>

          {hiddenCount > 0 && (
            <p
              // Es un aviso sobre la lista, no una opción: fuera del listbox
              className="px-3 py-2 border-t border-gray-100 text-xs text-gray-500 text-center"
              data-testid="country-autocomplete-more"
            >
              {t('countrySelect.moreResults', {
                defaultValue: '{{count}} more — keep typing to narrow it down',
                count: hiddenCount,
              })}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default CountryAutocomplete;
