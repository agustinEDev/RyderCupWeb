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

/**
 * El primer problema de una franja: el de su hoja o, si su primera salida (o
 * la nueva, al cambiarla) ya llegó, `firstTeePassed`. Una franja pasada no
 * admite partidas y sus jugadores se quedaban sin ella (QA del 11 oct 2026).
 * Y `teeTimeSkipped` si alguna salida cae en la hora que se salta por el
 * cambio de hora. Con el reloj del móvil, que casi siempre está en la hora del
 * campo: quien manda es el servidor, que la rechaza con la zona del campo.
 *
 * @param {{dia: string|null, hoja: Object, primeraAntes?: string}} franja - `primeraAntes`, al cambiar una
 * @param {Date} [ahora]
 * @returns {string|null}
 */
export const errorDeLaFranja = ({ dia, hoja, primeraAntes }, ahora = new Date()) => {
  const deLaHoja = errorDeHoja(hoja);
  if (deLaHoja || !dia) return deLaHoja;
  const [anio, mes, diaDelMes] = dia.split('-').map(Number);
  const aLas = (hora) => new Date(anio, mes - 1, diaDelMes, 0, hora);
  // El día del cambio de hora de primavera, una salida en el hueco no existe:
  // el reloj la corre una hora (2.ª pasada del QA, 12 oct 2026)
  const desde = minutos(hoja.primera);
  for (let hora = desde; hora <= minutos(hoja.ultima); hora += hoja.intervalo) {
    const sale = aLas(hora);
    if (sale.getHours() * 60 + sale.getMinutes() !== hora) return 'teeTimeSkipped';
  }
  if (hoja.primera === primeraAntes) return null;
  return ahora >= aLas(desde) ? 'firstTeePassed' : null;
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
