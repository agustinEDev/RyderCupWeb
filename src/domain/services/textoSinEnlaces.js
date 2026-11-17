/**
 * Si un texto que escribe un usuario lleva un enlace o una dirección web (SB-05).
 *
 * Espejo de `contiene_enlace` del servidor (`shared/domain/services/texto_sin_enlaces`):
 * el nombre de una competición, el alias y el mensaje de una invitación salen en
 * correos que firma la app, y un «entra en premio.com» ahí era un enlace pulsable.
 * Decidido por Agustín el 17 nov 2026: no se deja escribir. Esto solo evita el viaje
 * a la API para decir algo que ya se sabe aquí; quien manda es el servidor.
 */

// Puntos de otros alfabetos que los detectores de enlaces leen como un punto
const PUNTOS = /[\u3002\uff0e\uff61]/g;
// Invisibles: de anchura cero, unión de palabras, marca de orden, guion blando
const INVISIBLES = /[\u200b-\u200d\u2060\ufeff\u00ad]/g;

// Las terminaciones que un cliente de correo convierte en enlace (las mismas que el
// servidor): dos letras, las genéricas de siempre y las que más usa el spam
const TERMINACIONES =
  'com|net|org|info|biz|edu|gov|mil|int|name|pro|mobi|app|dev|page|io|ai|co|me|tv|' +
  'xyz|top|site|online|shop|store|club|link|click|live|life|world|today|news|blog|' +
  'cloud|tech|fun|icu|vip|win|bid|loan|work|space|website|email|support|help|' +
  'login|secure|bank|money|pay|wallet|crypto|golf|gift|deals|sale|promo';
const ETIQUETA = String.raw`[\p{L}\p{N}](?:[\p{L}\p{N}_-]{0,61}[\p{L}\p{N}])?`;
const DOMINIO = new RegExp(
  String.raw`(?<![\p{L}\p{N}_-])(?:${ETIQUETA}\.)+` +
    String.raw`(?:${TERMINACIONES}|[a-z]{2}|[^\P{L}a-z]{2,63}|xn--[a-z0-9-]{1,59})` +
    String.raw`(?![\p{L}\p{N}_-])`,
  'iu',
);
const IP = /(?<![\d.])(?:\d{1,3}\.){3}\d{1,3}(?!\d|\.\d)/;
const ESQUEMA = /\b[a-z][a-z0-9+.-]*:\/\//i;
const ESQUEMA_SIN_BARRAS = /\b(?:tel|sms|mailto|callto|whatsapp):(?!\/\/)/i;

/**
 * @param {string|null|undefined} texto - Lo que escribió un usuario
 * @returns {boolean} Si lleva un esquema, una IP o un dominio
 */
export const contieneEnlace = (texto) => {
  if (!texto) return false;
  const limpio = texto
    .normalize('NFC')
    .replace(PUNTOS, '.')
    .replace(INVISIBLES, '');
  return [ESQUEMA, ESQUEMA_SIN_BARRAS, IP, DOMINIO].some((patron) =>
    patron.test(limpio),
  );
};
