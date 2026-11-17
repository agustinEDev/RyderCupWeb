/**
 * Si un texto que escribe un usuario lleva un enlace o una dirección web (SB-05).
 *
 * Espejo de `contiene_enlace` del servidor (`shared/domain/services/texto_sin_enlaces`),
 * con los mismos casos de prueba: el nombre de una competición, el alias y el mensaje
 * de una invitación salen en correos que firma la app, y un «entra en premio.com» ahí
 * era un enlace pulsable. Decidido por Agustín el 17 nov 2026: no se deja escribir.
 * Esto solo evita el viaje a la API para decir algo que ya se sabe aquí.
 *
 * Cuenta como enlace, siempre: un esquema («https://», «tel:»…), lo que empieza por
 * «www.», una dirección de correo y una IPv4. Y «algo.terminación» si la terminación
 * existe (la lista de la IANA). Escrita «Mayúscula+minúsculas» es como empieza una frase
 * o un nombre («Juan.Te invito», «Copa Pro.Am»), así que entonces solo cuenta si es de
 * las habituales («premio.Com») o le sigue una ruta («premio.Golf/x»). Decidido por
 * Agustín el 17 nov 2026.
 */
import { TERMINACIONES_DE_DOMINIO } from './terminacionesDeDominio';

// Puntos de otros alfabetos que los detectores de enlaces leen como un punto
const PUNTOS = /[。．｡]/g;
// Caracteres de formato (invisibles): de anchura cero, de dirección, guion blando…
const INVISIBLES = /\p{Cf}/gu;

const ESQUEMA = /[a-z][a-z0-9+.-]*:\/\//i;
const ESQUEMA_SIN_BARRAS =
  /(?<![a-z])(?:tel|sms|mailto|callto|whatsapp):(?!\/\/)/i;
const WWW = /(?<![a-z0-9])www\.[^\s.]/i;
const CORREO = /[^\s@]+@[^\s@.]+\.[^\s@]+/;
const IP = /(?<![0-9.])(?:[0-9]{1,3}\.){3}[0-9]{1,3}(?![0-9]|\.[0-9])/;

// Las letras van con sus marcas (\p{M}): el signo de la «ा» de «भारत» es una marca
const ETIQUETA = String.raw`[\p{L}\p{N}](?:[\p{L}\p{M}\p{N}_-]{0,61}[\p{L}\p{M}\p{N}])?`;
const DOMINIO = new RegExp(
  String.raw`(?<![\p{L}\p{M}\p{N}_-])(?:${ETIQUETA}\.)+(\p{L}[\p{L}\p{M}]{1,62}|xn--[a-z0-9-]{1,59})(?![\p{L}\p{M}\p{N}_-])`,
  'giu',
);

// Las que se escriben con mayúscula inicial sin dejar de ser una dirección: las
// habituales. Las demás, así escritas, se leen como palabra («Juan.Te», «Pro.Am»)
const HABITUALES = new Set(
  'com net org es eu info io app me biz co xyz online site shop club top link click live store uk de fr it pt us ai dev tv ly gg cat'.split(
    ' ',
  ),
);

/**
 * Si la última etiqueta es una terminación de dominio, escrita como dirección.
 * @param {string} final - La última etiqueta («com», «Te», «рф»)
 * @param {string} sigue - El carácter que va detrás («/» si sigue una ruta)
 */
const esTerminacion = (final, sigue) => {
  // «Te», «Am», «Golf»: una palabra que empieza frase o nombre, salvo que sea una
  // terminación habitual o le siga una ruta
  if (
    final.length > 1 &&
    final[0] === final[0].toUpperCase() &&
    final[0] !== final[0].toLowerCase() &&
    final.slice(1) === final.slice(1).toLowerCase() &&
    !HABITUALES.has(final.toLowerCase()) &&
    sigue !== '/'
  )
    return false;
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7f]*$/.test(final))
    return TERMINACIONES_DE_DOMINIO.has(final.toLowerCase());
  // Otro alfabeto («рф»): la IANA la lista en punycode
  try {
    const host = new globalThis.URL(`http://a.${final}`).hostname;
    return TERMINACIONES_DE_DOMINIO.has(host.split('.').pop());
  } catch {
    return false;
  }
};

/**
 * @param {string|null|undefined} texto - Lo que escribió un usuario
 * @returns {boolean} Si lleva un esquema, «www.», un correo, una IP o un dominio
 */
export const contieneEnlace = (texto) => {
  if (!texto) return false;
  // Primero fuera los invisibles: quitarlos después de normalizar podría dejar una
  // letra y su marca sin juntar
  const limpio = texto
    .replace(INVISIBLES, '')
    .normalize('NFC')
    .replace(PUNTOS, '.');
  if (
    [ESQUEMA, ESQUEMA_SIN_BARRAS, WWW, CORREO, IP].some((p) => p.test(limpio))
  )
    return true;
  return [...limpio.matchAll(DOMINIO)].some((m) =>
    esTerminacion(m[1], limpio.charAt(m.index + m[0].length)),
  );
};
