/**
 * Countries presentation helpers: the name in the viewer's language and the
 * order by that name.
 *
 * The API calls and the offline fallback that used to live here are gone
 * (FE #244): countries come from `ICountryRepository` via `src/composition`.
 */

/**
 * Reduce a language tag to its base code: 'es-ES', 'es_ES' y 'ES' dan 'es'.
 *
 * El guion bajo importa: quien decide el idioma es el detector de i18next, que
 * lee `i18nextLng` de localStorage sin lista de valores permitidos. Si el
 * nombre que se pinta y el idioma con el que se ordena no normalizan igual, se
 * acaba ordenando nombres en inglés con las reglas del español.
 *
 * @param {string} language
 * @returns {string} El codigo base en minusculas, o '' si no hay etiqueta
 */
const toBaseLanguage = (language) =>
  typeof language === 'string' ? language.toLowerCase().split(/[-_]/)[0] : '';

/**
 * Format country name based on user's language preference
 * @param {object} country - Country object with name_en and name_es
 * @param {string} language - 'en', 'es', 'en-US', 'es-ES', 'es_ES', etc.
 * @returns {string}
 */
export const formatCountryName = (country, language = 'en') => {
  if (!country) return '';

  // Normalize language to base code (es-ES -> es, en-US -> en)
  const baseLang = toBaseLanguage(language) || 'en';

  // Se aceptan las dos grafías que conviven en el código: la del backend
  // (`name_es`) y la que arma `CompetitionAssembler` (`nameEs`). Sin esto, un
  // país que llegara con la segunda caía al `name` de reserva, que el assembler
  // rellena con el inglés fijo, y en español se leía «Spain»
  const enEspanol = country.name_es || country.nameEs;
  const enIngles = country.name_en || country.nameEn;

  // Always prefer the requested language, fallback to the other language
  if (baseLang === 'es') {
    return enEspanol || enIngles || country.name || '';
  }

  return enIngles || enEspanol || country.name || '';
};

/**
 * Reduce a language tag to something Intl accepts as a locale.
 *
 * `Intl` es mucho más estricto que formatCountryName, que se limita a mirar el
 * código base: una etiqueta vacía o con guion bajo ("es_ES") hace que
 * localeCompare lance RangeError. Y como el idioma sale del detector de
 * i18next, que lee `i18nextLng` de localStorage sin lista de valores
 * permitidos, ahí puede llegar cualquier cosa. Ordenar corre dentro de un
 * useMemo en pleno render, así que un RangeError no degradaría el orden: se
 * llevaría por delante toda pantalla con selector de país.
 *
 * Cuando la etiqueta no tiene pinta de código de idioma se devuelve undefined,
 * que para Intl significa "usa el del navegador".
 *
 * @param {string} language
 * @returns {string|undefined}
 */
const toCollatorLocale = (language) => {
  const base = toBaseLanguage(language);
  return /^[a-z]{2,3}$/.test(base) ? base : undefined;
};

/**
 * Sort countries by the name actually shown to the user.
 *
 * El backend devuelve la lista ordenada por el nombre en inglés, pero se pinta
 * el del idioma activo: en español eso deja "Corea del Sur" entre "Sudáfrica" y
 * "Sudán del Sur". Se ordena por lo que se ve, que es la única razón por la que
 * se ordena una lista de 200. `localeCompare` con el idioma activo es lo que
 * coloca "España" bajo la E y no tras "Sudán".
 *
 * No muta la lista recibida.
 *
 * @param {object[]} countries - Countries with name_en / name_es
 * @param {string} language - Active language ('es', 'en-US'...)
 * @returns {object[]} - A new, sorted array
 */
export const sortCountriesByName = (countries, language = 'en') => {
  if (!Array.isArray(countries)) return [];

  const locale = toCollatorLocale(language);

  return [...countries].sort((a, b) =>
    formatCountryName(a, language).localeCompare(formatCountryName(b, language), locale)
  );
};
