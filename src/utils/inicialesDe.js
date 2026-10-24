/**
 * «Maximiliano R.» -> «MR»: la primera letra de las dos primeras palabras.
 * Letra y no carácter: un emoji o un paréntesis delante no son una inicial.
 */
export const inicialesDe = (nombre) =>
  (nombre ?? '')
    .split(/\s+/)
    .map((palabra) => palabra.match(/\p{L}/u)?.[0])
    .filter(Boolean)
    .slice(0, 2)
    .map((letra) => letra.toUpperCase())
    .join('');
