import { conGenero } from './genero';

/**
 * Cómo se nombra a un compañero en «Con …» (QA de la release, 14 oct): quien
 * se retiró sigue, dicho —«Bea (retirada)»—, con el femenino por su barra,
 * como NP y Retirada. Una sola pieza para la tarjeta de «Mis próximos
 * partidos», el banner del panel y «Mis partidas» (`/code-review`).
 *
 * @param {Function} t
 * @param {string} clave - La de «{{nombre}} (retirado)» del namespace de quien pinta
 * @param {{name: string, withdrawn?: boolean, teeGender?: string|null}} companero
 * @returns {string}
 */
export const nombreDeCompanero = (t, clave, { name, withdrawn, teeGender }) =>
  withdrawn ? t(clave, conGenero(teeGender, { nombre: name })) : name;

/**
 * Los de una partida próxima, en su orden. Lo guardado antes de `partners`
 * solo trae los nombres.
 */
export const nombresDeCompaneros = (t, clave, partido) =>
  partido.partners
    ? partido.partners.map((p) => nombreDeCompanero(t, clave, p))
    : (partido.partnerNames ?? []);
