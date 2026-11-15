/**
 * Hasta cuándo se apunta uno a una competición (15 nov 2026; RyderCupAm #865).
 *
 * Las inscripciones cierran solas a las 12:00 del día anterior, a la hora del
 * campo. El instante lo manda el servidor con el desfase del campo, y si vale
 * para esta competición: no vale si el organizador la abrió (o reabrió) a mano
 * pasado el plazo. Aquí no se calcula nada: solo se decide si se enseña.
 */

// Fecha y hora con su desfase, tal como lo escribe el servidor
const CON_DESFASE =
  /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/;

/**
 * El plazo que se enseña con la competición abierta, o `null` si no toca.
 *
 * El día y la hora salen del texto, no de convertirlo: son los del campo, y
 * convertidos serían los de quien la mira.
 *
 * @param {{status: string, enrollmentDeadline?: string|null, enrollmentDeadlineApplies?: boolean}} competition
 * @param {Date} ahora
 * @returns {{dia: string, hora: string}|null} `dia` en YYYY-MM-DD, `hora` en HH:MM
 */
export const plazoQueSeEnseña = (competition, ahora) => {
  if (competition?.status !== 'ACTIVE') return null;
  if (competition.enrollmentDeadlineApplies !== true) return null;
  const plazo = competition.enrollmentDeadline;
  const partes = typeof plazo === 'string' ? CON_DESFASE.exec(plazo) : null;
  if (!partes) return null;
  const instante = new Date(plazo);
  if (Number.isNaN(instante.getTime())) return null;
  if (instante.getTime() <= ahora.getTime()) return null;
  return { dia: partes[1], hora: partes[2] };
};
