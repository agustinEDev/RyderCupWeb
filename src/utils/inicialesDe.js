/** «Maximiliano R.» -> «MR»: las dos primeras palabras. */
export const inicialesDe = (nombre) =>
  (nombre ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((palabra) => palabra[0].toUpperCase())
    .join('');
