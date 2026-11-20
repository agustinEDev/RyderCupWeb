/**
 * Los textos de la casilla del hoyo: a quién se anota y, en un desacuerdo,
 * qué puso el otro. Funciones puras de `t` y los datos del hoyo.
 */

import { ValidationStatus } from '../../domain/value_objects/ValidationStatus';

/**
 * @param {(clave: string, opciones?: object) => string} t
 * @param {{ enParejas: boolean, markedName?: string | null, markerName?: string | null, nombreDelSegundo?: string | null }} datos
 */
export const etiquetasDeLaCasilla = (
  t,
  { enParejas, markedName, markerName, nombreDelSegundo },
) => {
  // En foursomes hay una bola por pareja (#710): «Tu anotación» y «Anotación
  // marcador» hablaban como si cada uno jugara la suya
  const propia = t(enParejas ? 'input.pairBall' : 'input.yourScore');
  // Con la pareja detrás (16 oct): al quitar «Info del Partido», era el único
  // sitio que decía a quién se marca
  const marcado = enParejas
    ? markedName
      ? t('input.rivalBallOf', { nombre: markedName })
      : t('input.rivalBall')
    : markedName
      ? t('input.youMark', { nombre: markedName })
      : t('input.markerScore');
  const delMarcador = enParejas
    ? t('input.rivalCount')
    : markerName
      ? t('input.scoredForYou', { nombre: markerName })
      : t('input.markerScore');
  // Sin su nombre, las palabras de siempre, como el primero
  const segundo = nombreDelSegundo
    ? t('input.youMark', { nombre: nombreDelSegundo })
    : t('input.markerScore');
  return { propia, marcado, delMarcador, segundo };
};

/**
 * «X puso N» cuando hay desacuerdo y el otro ya mandó su número; si no, `null`.
 * En foursomes la bola es de la pareja: «La pareja rival puso…» (/code-review).
 */
const loQuePusoUno = (
  t,
  { enParejas, hayDesacuerdo, enviado, nombre, porDefecto, golpes },
) =>
  hayDesacuerdo && enviado
    ? t('input.otherPut', {
        nombre: enParejas ? t('input.rivalPair') : nombre || t(porDefecto),
        golpes: golpes === null ? t('input.pickedUp') : golpes,
      })
    : null;

/**
 * @param {(clave: string, opciones?: object) => string} t
 * @param {{
 *   enParejas: boolean,
 *   validationStatus?: string,
 *   markedValidationStatus?: string,
 *   playerScore?: { markerScore?: number | null, markerSubmitted?: boolean } | null,
 *   markedPlayerScore?: { ownScore?: number | null, ownSubmitted?: boolean } | null,
 *   markerName?: string | null,
 *   markedName?: string | null,
 *   secondMarked?: { name?: string | null, validationStatus?: string | null, playerScore?: { ownScore?: number | null, ownSubmitted?: boolean } | null } | null,
 * }} datos
 * @returns {{ own: string | null, marked: string | null, second: string | null }}
 */
export const loQuePusoElOtro = (
  t,
  {
    enParejas,
    validationStatus,
    markedValidationStatus,
    playerScore,
    markedPlayerScore,
    markerName,
    markedName,
    secondMarked,
  },
) => ({
  own: loQuePusoUno(t, {
    enParejas,
    hayDesacuerdo: validationStatus === ValidationStatus.MISMATCH,
    enviado: playerScore?.markerSubmitted,
    nombre: markerName,
    porDefecto: 'input.yourMarker',
    golpes: playerScore?.markerScore,
  }),
  marked: loQuePusoUno(t, {
    enParejas,
    hayDesacuerdo: markedValidationStatus === ValidationStatus.MISMATCH,
    enviado: markedPlayerScore?.ownSubmitted,
    nombre: markedName,
    porDefecto: 'input.theMarkedPlayer',
    golpes: markedPlayerScore?.ownScore,
  }),
  second: loQuePusoUno(t, {
    enParejas,
    hayDesacuerdo: secondMarked?.validationStatus === ValidationStatus.MISMATCH,
    enviado: secondMarked?.playerScore?.ownSubmitted,
    nombre: secondMarked?.name,
    porDefecto: 'input.theMarkedPlayer',
    golpes: secondMarked?.playerScore?.ownScore,
  }),
});
