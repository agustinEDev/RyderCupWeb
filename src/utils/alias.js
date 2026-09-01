/**
 * El alias público del perfil (FE #435, backend en BE #239).
 *
 * Vive aquí y no dentro del formulario porque hay DOS sitios que lo piden:
 * Editar perfil y el lápiz del saludo del panel. Las reglas son espejo de las
 * del servidor —`AliasValidator`—, y esto NO sustituye a aquella validación:
 * solo evita el viaje a la API para decir algo que ya se sabe aquí.
 */

export const ALIAS_MIN_LENGTH = 2;
export const ALIAS_MAX_LENGTH = 20;

// Letras (con acentos), dígitos, espacio y `. _ -`. Se saltan a propósito los
// signos de multiplicar (U+00D7) y dividir (U+00F7), que caen dentro del rango
// `À-ÿ` sin ser letras — igual que hace el validador del servidor
const ALIAS_REGEX = /^[a-zA-Z0-9À-ÖØ-öø-ÿ._\- ]+$/;

/**
 * Deja el alias como se va a guardar: sin espacios en los bordes y sin
 * espacios internos repetidos.
 *
 * Importa que sea igual que en el servidor: si aquí no se colapsaran,
 * «Chu  chi» y «Chu chi» parecerían aliases distintos y el índice único de la
 * base de datos no los vería como el mismo.
 */
export const normalizaElAlias = (valor) => (valor || '').split(/\s+/).filter(Boolean).join(' ');

/**
 * Qué tiene de malo este alias, o null si no tiene nada.
 *
 * Devuelve la CLAVE de traducción, no el texto: quien lo llama decide dónde
 * pintarlo y con qué idioma.
 */
export const queLePasaAlAlias = (valor) => {
  const alias = normalizaElAlias(valor);

  // Vacío no es un error: es «no quiero alias», y eso lo resuelve quien llama
  if (!alias) return null;

  if (alias.length < ALIAS_MIN_LENGTH) return 'alias.errors.tooShort';
  if (alias.length > ALIAS_MAX_LENGTH) return 'alias.errors.tooLong';
  if (!ALIAS_REGEX.test(alias)) return 'alias.errors.invalidChars';
  // Un alias de solo signos —«...», «-_-»— no identifica a nadie ni se puede
  // buscar por él
  if (!/[a-zA-Z0-9À-ÖØ-öø-ÿ]/.test(alias)) return 'alias.errors.needsLetterOrDigit';

  return null;
};

/**
 * Qué hay que mandar a la API, sabiendo lo que había antes.
 *
 * Devuelve `undefined` cuando el campo no debe viajar en la petición, que NO
 * es lo mismo que mandar vacío: la cadena vacía borra el alias, y quien nunca
 * tuvo uno no debe pedir que le borren nada.
 */
export const loQueHayQueMandar = (valorDelCampo, aliasActual) => {
  const alias = normalizaElAlias(valorDelCampo);
  const actual = aliasActual || '';

  if (alias === actual) return undefined;
  return alias;
};
