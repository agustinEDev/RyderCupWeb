/**
 * Las rutas de la API, sin que un id pueda cambiarlas (FE-03, fase 4 del plan a 9).
 *
 * Muchos ids salen de la dirección (`useParams`). Interpolados a pelo, un enlace
 * preparado podía colar `/`, `..` o `%2e%2e` y hacer que el navegador llamara a otra
 * ruta de la API con las cookies y el token CSRF (client-side path traversal). Dos
 * defensas, las dos aquí:
 *
 * - `segmento(valor)`: cada valor que va en la ruta se codifica, y `.` o `..` no vale,
 *   porque el navegador los resuelve como «aquí» y «arriba» aunque estén codificados.
 *   Tampoco `/` ni `\`: el servidor (Uvicorn) decodifica `%2F` antes de enrutar, así que
 *   un id con `/` añadía tramos a la ruta (probador de la #1098, 11 nov 2026).
 *   Uno vacío, null o undefined sale como antes: el servidor contesta 404. Lo exige un test sobre los repositorios (`rutasConSegmento.test.js`).
 * - `esRutaDeLaApiSegura(ruta)`: el guardián de `apiRequest`, para cualquier ruta que
 *   se haya colado sin `segmento`: solo rutas propias de la API, sin segmentos `.` o `..`
 *   (tampoco con `%2e`), sin otro servidor ni fragmento.
 */

import { hayInterfazDelTransporte, interfaz } from './interfazDelTransporte';
import { getApiBaseUrl } from './urlDeLaApi';

/**
 * Una ruta de la API que no se pide: la lanza `segmento` y la lanza `apiRequest`. El
 * mensaje, traducido como los demás del transporte: hay pantallas que lo enseñan.
 */
export class RutaDeLaApiNoValida extends Error {
  constructor() {
    super(hayInterfazDelTransporte() ? interfaz().traduce('common:errors.generic') : 'Ruta de la API no válida');
    this.name = 'RutaDeLaApiNoValida';
  }
}

// En un valor antes de codificarlo, solo los literales: `%2e` se codifica a `%252e`, que
// ya no es un punto para el navegador
const PUNTOS_LITERALES = /^\.{1,2}$/;
// Caracteres de control (U+0000-U+001F y U+007F): el navegador borra algunos de la ruta
const tieneControl = (texto) => [...texto].some((c) => c.charCodeAt(0) < 0x20 || c.charCodeAt(0) === 0x7f);

// Las barras, aunque vayan codificadas: el servidor decodifica `%2F` antes de enrutar
const BARRAS = /[/\\]/;

/**
 * Si un valor vale para un tramo de la ruta (no es `.` ni `..` ni lleva `/` o `\`), sin
 * avisar a nadie: para decidir en un render sin efectos (el avatar).
 * @param {unknown} valor
 * @returns {boolean}
 */
export const valeComoSegmento = (valor) => {
  const texto = String(valor);
  return !PUNTOS_LITERALES.test(texto) && !BARRAS.test(texto);
};

/**
 * Un valor para un tramo de la ruta, codificado. `.`, `..`, `/` o `\` no vale; vacío, null o
 * undefined salen como salían interpolados a pelo (`''`, `'null'`, `'undefined'`).
 * @param {unknown} valor
 * @returns {string}
 */
export const segmento = (valor) => {
  if (!valeComoSegmento(valor)) rechazaLaRuta('segmento');
  return encodeURIComponent(String(valor));
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
 * Si una ruta se puede pedir: empieza por `/api/`, sin fragmento ni caracteres de control,
 * y el navegador la resolvería tal cual se escribió (ni `.`, ni `..`, ni `%2e`, ni `\`, ni
 * otro servidor). La búsqueda (`?…`) va aparte: ahí un `..` es solo texto.
 * @param {unknown} ruta
 * @returns {boolean}
 */
export const esRutaDeLaApiSegura = (ruta) => {
  if (typeof ruta !== 'string' || !ruta.startsWith('/api/') || ruta.includes('#')) return false;
  // Ningún carácter de control, tampoco en la búsqueda: el navegador borra tabuladores y
  // saltos de línea antes de resolver la ruta («.\t.» acabaría siendo «..»)
  if (tieneControl(ruta)) return false;
  // La ruta que resolvería el navegador tiene que ser la misma que se escribió: «.», «..»,
  // «%2e%2e», «\» y cualquier otra normalización la cambian (revisor, 11 nov 2026)
  const camino = ruta.split('?')[0];
  return new globalThis.URL(ruta, 'http://ruta.invalid').pathname === camino;
};

/**
 * La dirección de una imagen cuya ruta manda el servidor (el `image_url` de los avatares),
 * o `null` si no es una ruta de la propia API (FE-11, fase 4 del plan a 9): pegada a la
 * base sin comprobar, `@evil.example/x` se pedía a otro servidor, con credenciales en las
 * fotos subidas. Lo mismo que exige `apiRequest`: `/api/…`, sin `..` ni otro servidor.
 * @param {unknown} ruta
 * @returns {string|null}
 */
export const urlDeImagenDeLaApi = (ruta) => (esRutaDeLaApiSegura(ruta) ? `${getApiBaseUrl()}${ruta}` : null);
