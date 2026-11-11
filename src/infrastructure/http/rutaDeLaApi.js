/**
 * Las rutas de la API, sin que un id pueda cambiarlas (FE-03, fase 4 del plan a 9).
 *
 * Muchos ids salen de la dirección (`useParams`). Interpolados a pelo, un enlace
 * preparado podía colar `/`, `..` o `%2e%2e` y hacer que el navegador llamara a otra
 * ruta de la API con las cookies y el token CSRF (client-side path traversal). Dos
 * defensas, las dos aquí:
 *
 * - `segmento(valor)`: cada valor que va en la ruta se codifica, y uno vacío, `.` o
 *   `..` no vale, porque el navegador los resuelve como «aquí» y «arriba» aunque estén
 *   codificados. Lo exige un test sobre los repositorios (`rutasConSegmento.test.js`).
 * - `esRutaDeLaApiSegura(ruta)`: el guardián de `apiRequest`, para cualquier ruta que
 *   se haya colado sin `segmento`: solo rutas propias de la API, sin segmentos `.` o `..`
 *   (tampoco con `%2e`), sin otro servidor ni fragmento.
 */

import { hayInterfazDelTransporte, interfaz } from './interfazDelTransporte';

/** Una ruta de la API que no se pide: la lanza `segmento` y la lanza `apiRequest`. */
export class RutaDeLaApiNoValida extends Error {
  constructor() {
    super('Ruta de la API no válida');
    this.name = 'RutaDeLaApiNoValida';
  }
}

// «Aquí» y «arriba» en una ruta ya montada, también con los puntos codificados (%2e): el
// navegador los resuelve igual
const PUNTOS = /^(?:\.|%2e){1,2}$/i;
// En un valor antes de codificarlo, solo los literales: `%2e` se codifica a `%252e`, que
// ya no es un punto para el navegador
const PUNTOS_LITERALES = /^\.{1,2}$/;

/**
 * Un valor para un tramo de la ruta, codificado. Vacío, `.` o `..` no vale.
 * @param {string|number} valor
 * @returns {string}
 */
export const segmento = (valor) => {
  const texto = valor == null ? '' : String(valor);
  if (texto === '' || PUNTOS_LITERALES.test(texto)) rechazaLaRuta('segmento');
  return encodeURIComponent(texto);
};

/**
 * Avisa a Sentry de una ruta rechazada, sin la ruta (puede llevar ids, y la de un ataque
 * no interesa entera), y lanza. Sin interfaz registrada (tests de piezas sueltas), solo lanza.
 * @param {string} donde - `segmento` o el método de la petición
 */
export const rechazaLaRuta = (donde) => {
  const error = new RutaDeLaApiNoValida();
  if (hayInterfazDelTransporte()) {
    try {
      interfaz().informaDelError(error, {
        level: 'warning',
        tags: { 'api.ruta_rechazada': String(donde) },
        fingerprint: ['ruta-de-la-api-no-valida'],
      });
    } catch {
      // Sin Sentry no hay aviso; la ruta se rechaza igual
    }
  }
  throw error;
};

/**
 * Si una ruta se puede pedir: empieza por `/api/`, no lleva otro servidor (`//`, `\`,
 * `https://`), ni fragmento, ni tramos `.` o `..` en la parte de la ruta. La búsqueda
 * (`?…`) va aparte: ahí un `..` es solo texto.
 * @param {unknown} ruta
 * @returns {boolean}
 */
export const esRutaDeLaApiSegura = (ruta) => {
  if (typeof ruta !== 'string' || !ruta.startsWith('/api/') || ruta.includes('#')) return false;
  const camino = ruta.split('?')[0];
  if (camino.includes('\\')) return false;
  return camino.split('/').every((tramo) => !PUNTOS.test(tramo));
};
