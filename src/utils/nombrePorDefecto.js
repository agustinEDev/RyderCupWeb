/**
 * El nombre que trae una partida rápida nueva: «Modalidad - dd/mm/aa», por
 * ejemplo «Fourball - 04/11/26» (Agustín, 4 nov 2026).
 */
const dosCifras = (n) => String(n).padStart(2, '0');

export const nombrePorDefecto = (modalidad, fecha) =>
  `${modalidad} - ${dosCifras(fecha.getDate())}/${dosCifras(fecha.getMonth() + 1)}/${dosCifras(fecha.getFullYear() % 100)}`;

// Uno de por defecto (de cualquier día): al repetir no se copia, que lleva
// la fecha de aquella partida
const DE_POR_DEFECTO = /^.+ - \d{2}\/\d{2}\/\d{2}$/;
export const esNombrePorDefecto = (nombre) => DE_POR_DEFECTO.test(nombre ?? '');
