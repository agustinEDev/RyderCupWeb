/**
 * La hoja de salidas de una franja de stroke play (FE #824, RyderCupAm#251).
 *
 * Primera y última salida (la hora final ES la última salida posible: de 15:00
 * a 18:00 cada 10 minutos son 19 salidas), intervalo de 5 a 20 minutos y
 * partidas de 3 o 4. El cupo sale de ahí: salidas por jugadores por partida.
 * Las reglas son las del backend, que es quien manda; aquí están para avisar
 * antes de enviar. Las horas van en «HH:MM», hora del campo.
 */

export const INTERVALO_MINIMO = 5;
export const INTERVALO_MAXIMO = 20;
export const TAMANOS_DE_PARTIDA = [3, 4];

// Lo que se propone al añadir cada franja (Agustín, 10 oct 2026): tres por
// jornada, y la última salida un intervalo antes de la hora redonda para que la
// siguiente empiece en punto sin pisarse
const HORAS_PROPUESTAS = {
  MORNING: ['08:00', '11:50'],
  AFTERNOON: ['12:00', '17:50'],
  EVENING: ['18:00', '23:50'],
};
const INTERVALO_PROPUESTO = 10;
const TAMANO_PROPUESTO = 4;

const HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Los minutos desde medianoche de una hora «HH:MM», o null si no lo es. */
const minutos = (hora) => {
  const partes = HORA.exec(hora ?? '');
  return partes ? Number(partes[1]) * 60 + Number(partes[2]) : null;
};

/**
 * El primer problema de una hoja, como clave de `franjas.errors`, o null.
 * @param {{primera: string, ultima: string, intervalo: number, tamano: number}} hoja
 */
export const errorDeHoja = ({ primera, ultima, intervalo, tamano }) => {
  const desde = minutos(primera);
  const hasta = minutos(ultima);
  if (desde === null || hasta === null) return 'teeTimeFormat';
  if (hasta < desde) return 'lastBeforeFirst';
  if (!Number.isInteger(intervalo) || intervalo < INTERVALO_MINIMO || intervalo > INTERVALO_MAXIMO) {
    return 'intervalRange';
  }
  if (!TAMANOS_DE_PARTIDA.includes(tamano)) return 'groupSize';
  return null;
};

/** Cuántas salidas tiene: de la primera a la última que cabe. 0 si no es posible. */
export const numeroDeSalidas = (hoja) =>
  errorDeHoja(hoja) ? 0 : Math.floor((minutos(hoja.ultima) - minutos(hoja.primera)) / hoja.intervalo) + 1;

/** Cuántos jugadores caben: salidas por jugadores por partida (0 si no es posible). */
export const cupoDeLaHoja = (hoja) => numeroDeSalidas(hoja) * hoja.tamano;

/** La hoja que se propone al añadir una franja de ese tipo. */
export const hojaPropuesta = (franja) => {
  const [primera, ultima] = HORAS_PROPUESTAS[franja] ?? HORAS_PROPUESTAS.MORNING;
  return { primera, ultima, intervalo: INTERVALO_PROPUESTO, tamano: TAMANO_PROPUESTO };
};
