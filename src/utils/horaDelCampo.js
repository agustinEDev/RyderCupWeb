/**
 * La hora del campo (FE #824, PR 5): la actualización de hándicaps se programa
 * y se enseña en la hora del campo, la de las salidas (Agustín, 11 oct 2026),
 * y el backend la quiere con su huso (sin él, 422).
 *
 * Con `Intl` y sin librerías: el desfase de una zona en un instante es la
 * diferencia entre su hora de pared y la UTC. Una zona que `Intl` no conoce, o
 * ninguna, cae a la del dispositivo.
 */

const ENTRADA = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const dos = (n) => String(n).padStart(2, '0');

const zonaValida = (zona) => {
  if (!zona) return undefined;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zona });
    return zona;
  } catch {
    return undefined;
  }
};

/** La hora de pared de un instante en una zona, como milisegundos «UTC». */
const paredEn = (instante, zona) => {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: zona,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(new Date(instante))
      .map((p) => [p.type, p.value])
  );
  return Date.UTC(partes.year, partes.month - 1, partes.day, partes.hour, partes.minute, partes.second);
};

/** Minutos que la zona va por delante de UTC en ese instante. */
const desfase = (instante, zona) =>
  zona ? Math.round((paredEn(instante, zona) - instante) / 60000) : -new Date(instante).getTimezoneOffset();

const conSigno = (minutos) => {
  const signo = minutos >= 0 ? '+' : '-';
  const m = Math.abs(minutos);
  return `${signo}${dos(Math.floor(m / 60))}:${dos(m % 60)}`;
};

/**
 * «2030-07-12T03:00» en la hora del campo → «2030-07-12T03:00:00+02:00».
 * Null si lo escrito no es una fecha y hora.
 */
export const aIsoConHuso = (entrada, zonaDelCampo) => {
  const partes = ENTRADA.exec(entrada ?? '');
  if (!partes) return null;
  const [, y, mo, d, h, mi] = partes.map(Number);
  const zona = zonaValida(zonaDelCampo);
  const pared = Date.UTC(y, mo - 1, d, h, mi);
  if (!zona) {
    const local = new Date(y, mo - 1, d, h, mi);
    return `${entrada}:00${conSigno(-local.getTimezoneOffset())}`;
  }
  // Dos pasadas: el desfase en la hora aproximada y, con él, el de la de verdad
  // (por si en medio hay un cambio de hora)
  const primero = desfase(pared, zona);
  const segundo = desfase(pared - primero * 60000, zona);
  return `${entrada}:00${conSigno(segundo)}`;
};

/** Un instante, escrito en la hora del campo para un `<input type="datetime-local">`. */
export const aEntradaDelCampo = (iso, zonaDelCampo) => {
  const instante = Date.parse(iso);
  if (Number.isNaN(instante)) return '';
  const zona = zonaValida(zonaDelCampo);
  const pared = zona ? paredEn(instante, zona) : instante - new Date(instante).getTimezoneOffset() * 60000;
  return new Date(pared).toISOString().slice(0, 16);
};

/** «sáb, 12 oct, 3:00», en la hora del campo y el idioma de la aplicación. */
export const horaEnElCampo = (iso, zonaDelCampo, idioma) => {
  const opciones = { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' };
  const zona = zonaValida(zonaDelCampo);
  try {
    return new Date(iso).toLocaleString(idioma, zona ? { ...opciones, timeZone: zona } : opciones);
  } catch {
    return new Date(iso).toLocaleString(undefined, zona ? { ...opciones, timeZone: zona } : opciones);
  }
};
