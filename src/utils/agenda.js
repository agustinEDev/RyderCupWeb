/**
 * Las cuentas de la agenda de una competición (FE #654).
 *
 * El torneo ES su agenda: días, y en cada día sus sesiones. Aquí vive lo que
 * se calcula sin pantalla —qué agenda se propone al crear, cuántos partidos
 * salen de una sesión, qué franjas quedan libres— para poder probarlo como lo
 * que es.
 */

// Las franjas de un día, en el orden en que se juegan
export const FRANJAS = ['MORNING', 'AFTERNOON', 'EVENING'];

// Lo que acepta el servidor en una agenda automática
const MAX_SESIONES = 18;

// Cuántos jugadores de cada equipo juegan un partido de ese formato
const POR_LADO = { SINGLES: 1, FOURBALL: 2, FOURSOMES: 2 };

const UN_DIA = 24 * 60 * 60 * 1000;

const aDia = (iso) => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

/**
 * Los días del torneo, del primero al último, ambos incluidos.
 * @param {string} inicio - YYYY-MM-DD
 * @param {string} fin - YYYY-MM-DD
 * @returns {string[]} Vacío si las fechas no se leen o van al revés
 */
export const diasDelTorneo = (inicio, fin) => {
  const desde = aDia(inicio);
  const hasta = aDia(fin);
  if (desde === null || hasta === null || hasta < desde) return [];
  const dias = [];
  for (let t = desde; t <= hasta; t += UN_DIA) {
    dias.push(new Date(t).toISOString().slice(0, 10));
  }
  return dias;
};

/**
 * La agenda que se propone al crear la competición: dos sesiones al día y
 * una el último —parejas los primeros días, individuales al final, que es el
 * orden que pone el servidor—. Un fin de semana son sábado mañana y tarde y
 * domingo, el ejemplo de la issue.
 *
 * @returns {{mode: string, total_sessions: number, sessions_per_day: number}|null}
 *   null si las fechas no se leen: mejor no proponer nada que proponer mal
 */
export const agendaPropuesta = (inicio, fin) => {
  const dias = diasDelTorneo(inicio, fin).length;
  if (dias === 0) return null;
  return {
    mode: 'AUTOMATIC',
    total_sessions: Math.min(dias * 2 - 1, MAX_SESIONES),
    sessions_per_day: 2,
  };
};

/**
 * Cuántos partidos salen de una sesión de ese formato.
 *
 * Con equipos, manda el corto: el cruce va de uno en uno y el que sobra no
 * juega. Sin equipos todavía, se reparte la plantilla a la mitad.
 *
 * @param {string} formato - SINGLES, FOURBALL o FOURSOMES
 * @param {{jugadores?: number, equipoA?: number, equipoB?: number}} plantilla
 * @returns {number}
 */
export const partidosDeLaSesion = (formato, { jugadores = 0, equipoA, equipoB } = {}) => {
  const porLado = POR_LADO[formato] || 1;
  const porEquipo =
    equipoA !== undefined && equipoB !== undefined
      ? Math.min(equipoA, equipoB)
      : Math.floor(jugadores / 2);
  return Math.floor(porEquipo / porLado);
};

/**
 * Las franjas de ese día que todavía no tienen sesión, en orden.
 * @param {Array<{roundDate: string, sessionType: string}>} sesiones
 * @param {string} dia - YYYY-MM-DD
 * @returns {string[]}
 */
export const franjasLibres = (sesiones, dia) => {
  const cogidas = new Set(
    sesiones.filter((s) => s.roundDate === dia).map((s) => s.sessionType)
  );
  return FRANJAS.filter((franja) => !cogidas.has(franja));
};
