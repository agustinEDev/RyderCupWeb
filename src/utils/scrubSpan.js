/**
 * Redacción de URLs dentro de un span antes de mandarlo a Sentry (FE #385).
 *
 * Un solo filtro para las dos inicializaciones de Sentry (`main.jsx` y
 * `infrastructure/sentry.ts`) y para las dos formas de span que conviven:
 *
 * - la antigua, la de los spans de una transacción: `description` y `data`;
 * - la de Sentry 11 en `beforeSendSpan`: `name` y `attributes`, con la URL en
 *   `url.full` (antes `http.url`) y cada atributo como texto o como `{ value }`.
 *
 * Con Sentry 11, un filtro que solo mirase la forma antigua dejaba pasar los
 * tokens sin avisar (medido el 30 sep 2026 con estos mismos tests).
 *
 * Sin dependencias pesadas a propósito: lo usa código del primer chunk.
 */
import { scrubUrl } from './scrubUrl';

/** Atributos que llevan una URL o una ruta con su query. */
const URL_KEYS = ['url', 'http.url', 'url.full', 'http.target'];

/** Atributos que llevan solo la query, sin `?` delante. */
const QUERY_KEYS = ['url.query', 'http.query'];

const scrubQuery = (query) => scrubUrl(`?${query}`).slice(1);

const scrubValue = (bag, key, scrub) => {
  const value = bag[key];
  if (typeof value === 'string') {
    bag[key] = scrub(value);
  } else if (value && typeof value === 'object' && typeof value.value === 'string') {
    value.value = scrub(value.value);
  }
};

/**
 * @param {object | undefined} span Span de Sentry, en cualquiera de las dos formas
 * @returns {object | undefined} El mismo span, redactado en su sitio
 */
export const scrubSpan = (span) => {
  if (!span) return span;

  if (typeof span.description === 'string') span.description = scrubUrl(span.description);
  if (typeof span.name === 'string') span.name = scrubUrl(span.name);

  for (const bag of [span.data, span.attributes]) {
    if (!bag || typeof bag !== 'object') continue;
    for (const key of URL_KEYS) scrubValue(bag, key, scrubUrl);
    for (const key of QUERY_KEYS) scrubValue(bag, key, scrubQuery);
  }

  return span;
};
