/**
 * El nombre que trae una partida rápida nueva: «Campo · dd/mm», por ejemplo
 * «Abama · 04/11» (Agustín, 4 nov 2026). Igual en todos los idiomas, porque
 * se guarda y lo ven también los demás jugadores; sin año, que la fila de
 * cada lista ya lo da. Uno con la modalidad se descartó: la lista ya la dice
 * y desplazaba al rival del título.
 */
export const LARGO_MAXIMO_DEL_NOMBRE = 100; // el del servidor

const dosCifras = (n) => String(n).padStart(2, '0');

export const nombrePorDefecto = (campo, fecha) => {
  const cuando = ` · ${dosCifras(fecha.getDate())}/${dosCifras(fecha.getMonth() + 1)}`;
  return campo.slice(0, LARGO_MAXIMO_DEL_NOMBRE - cuando.length) + cuando;
};

// Uno de por defecto (de cualquier día): al repetir no se copia, que lleva
// la fecha de aquella partida
const DE_POR_DEFECTO = /^.+ · \d{2}\/\d{2}$/;
export const esNombrePorDefecto = (nombre) => DE_POR_DEFECTO.test(nombre ?? '');
