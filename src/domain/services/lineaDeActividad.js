/**
 * La línea de tiempo de Actividad (FE-1): qué tarjetas hay, en qué orden, en
 * qué día cae cada una y cuáles son nuevas.
 *
 * Es lógica pura, sin idioma ni React: la pantalla decide cómo se escribe cada
 * cosa («Hoy», «hace 5 min»), y aquí solo se decide qué toca.
 */

// Los tipos que la aplicación sabe pintar. Uno que no esté aquí se ignora: el
// backend puede estrenar un tipo antes de que llegue esta versión del cliente,
// y una tarjeta en blanco o con el código del tipo sería peor que no verla
export const TIPOS_DE_ACTIVIDAD = new Set([
  'HOLE_IN_ONE',
  'EAGLE_OR_BETTER',
  'BIRDIE',
  'NEW_COURSE',
  'PERSONAL_BEST',
  'FIRST_TOURNAMENT',
  'ENROLLMENT_APPROVED',
  'ENROLLMENT_CONFIRMED',
  'TEE_TIME_ASSIGNED',
  'INVITED_TO_TOURNAMENT',
  'ENROLLMENT_REQUEST_CLOSED',
  'ENROLLMENT_REJECTED',
  'ENROLLED_IN_TOURNAMENT',
  'TOURNAMENT_MATCH_RESULT',
  'TOURNAMENT_FINAL_STANDING',
  'QUICK_MATCH_FINISHED',
]);

// El backend cuenta con tope de 10; el botón no pinta más de una cifra
const TOPE_DE_LA_INSIGNIA = 9;

const MINUTO = 60 * 1000;
const HORA = 60 * MINUTO;

/**
 * El texto del número del botón de Actividad: nada a 0, «1»…«9» y «9+».
 *
 * @param {number} n
 * @returns {string}
 */
export const textoDeLaInsignia = (n) => {
  if (!Number.isFinite(n) || n <= 0) return '';
  return n > TOPE_DE_LA_INSIGNIA ? `${TOPE_DE_LA_INSIGNIA}+` : String(n);
};

const valida = (fecha) => fecha instanceof Date && !Number.isNaN(fecha.getTime());

// Cuándo llegó al feed; si un backend viejo no lo manda, cuándo se jugó
const instanteDe = (evento) => (valida(evento.publishedAt) ? evento.publishedAt : evento.occurredAt);

const msDe = (fecha) => (valida(fecha) ? fecha.getTime() : 0);

const inicioDelDia = (fecha) => new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());

const claveDelDia = (fecha) => `${fecha.getFullYear()}-${fecha.getMonth()}-${fecha.getDate()}`;

// Días naturales entre dos fechas, contando por calendario y no por 24 h: el
// cambio de hora no puede hacer de ayer «hoy»
const diasEntre = (antes, despues) =>
  Math.round((inicioDelDia(despues).getTime() - inicioDelDia(antes).getTime()) / (24 * HORA));

// La semana empieza el lunes, como se lee en España
const diasDesdeElLunes = (fecha) => (fecha.getDay() + 6) % 7;

/**
 * En qué día cae una fecha respecto a ahora, para el separador.
 *
 * @returns {'hoy'|'ayer'|'semana'|'esteAno'|'otroAno'}
 */
export const queDiaEs = (fecha, ahora) => {
  const dias = diasEntre(fecha, ahora);
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'ayer';
  if (dias <= diasDesdeElLunes(ahora)) return 'semana';
  return fecha.getFullYear() === ahora.getFullYear() ? 'esteAno' : 'otroAno';
};

/**
 * Cuánto hace, para la hora de cada tarjeta: relativo si es de hoy, la hora
 * del reloj si es de otro día.
 *
 * @returns {{unidad: 'ahora'}|{unidad: 'minutos'|'horas', valor: number}|{unidad: 'hora'}}
 */
export const haceCuanto = (fecha, ahora) => {
  if (queDiaEs(fecha, ahora) !== 'hoy') return { unidad: 'hora' };
  const ms = ahora.getTime() - fecha.getTime();
  if (ms < MINUTO) return { unidad: 'ahora' };
  if (ms < HORA) return { unidad: 'minutos', valor: Math.floor(ms / MINUTO) };
  return { unidad: 'horas', valor: Math.floor(ms / HORA) };
};

/**
 * Las tarjetas: los logros de una misma vuelta comparten `groupKey` y van en
 * una sola; cada aviso lleva la suya. Se agrupa sobre todo lo cargado, no por
 * página: el cursor puede partir una vuelta entre dos páginas.
 */
const agrupa = (eventos) => {
  const porClave = new Map();
  for (const evento of eventos) {
    if (!TIPOS_DE_ACTIVIDAD.has(evento.type)) continue;
    const clave = evento.groupKey || evento.id;
    const tarjeta = porClave.get(clave);
    if (tarjeta) {
      tarjeta.eventos.push(evento);
      if (msDe(instanteDe(evento)) > msDe(tarjeta.instante)) tarjeta.instante = instanteDe(evento);
    } else {
      porClave.set(clave, {
        clave,
        tipo: evento.type,
        autorId: evento.userId,
        eventos: [evento],
        instante: instanteDe(evento),
        nueva: false,
      });
    }
  }
  // `sort` es estable: a igual instante se respeta el orden del backend
  return [...porClave.values()].sort((a, b) => msDe(b.instante) - msDe(a.instante));
};

/**
 * Arma la línea de tiempo completa.
 *
 * **Lo nuevo** sale del número de novedades, que el backend cuenta igual que
 * el botón: tarjetas y solicitudes llegadas desde la última visita. Como todo
 * va de lo más reciente a lo más antiguo, las nuevas son las primeras
 * `novedades` de la lista conjunta. El backend no manda la fecha de la última
 * visita, así que con el tope de 10 se marcan como mucho 10.
 *
 * @param {{ eventos?: Array, solicitudes?: Array, novedades?: number, ahora: Date }} entrada
 * @returns {{ solicitudes: Array, dias: Array<{ clave: string, fecha: Date, tarjetas: Array }> }}
 */
export const armaLaLineaDeActividad = ({ eventos = [], solicitudes = [], novedades = 0, ahora }) => {
  const tarjetas = agrupa(eventos);
  const pendientes = [...solicitudes]
    .sort((a, b) => msDe(b.createdAt) - msDe(a.createdAt))
    .map((s) => ({ ...s, nueva: false }));

  const todo = [
    ...pendientes.map((s) => ({ item: s, ms: msDe(s.createdAt) })),
    ...tarjetas.map((t) => ({ item: t, ms: msDe(t.instante) })),
  ].sort((a, b) => b.ms - a.ms);
  const cuantas = Number.isFinite(novedades) ? Math.max(0, novedades) : 0;
  todo.slice(0, cuantas).forEach(({ item }) => {
    item.nueva = true;
  });

  const dias = [];
  for (const tarjeta of tarjetas) {
    const fecha = valida(tarjeta.instante) ? inicioDelDia(tarjeta.instante) : inicioDelDia(ahora);
    const clave = claveDelDia(fecha);
    const ultimo = dias.at(-1);
    if (ultimo?.clave === clave) {
      ultimo.tarjetas.push(tarjeta);
    } else {
      dias.push({ clave, fecha, tarjetas: [tarjeta] });
    }
  }

  return { solicitudes: pendientes, dias };
};

/**
 * Las primeras `n` tarjetas de la línea, sin perder sus días: un día cortado a
 * medias se queda con las que caben y uno que no llega a enseñar ninguna no
 * aparece, para que no haya separadores sin tarjetas debajo. Es lo que usa el
 * perfil de un amigo, que enseña la actividad de 5 en 5 tarjetas.
 *
 * @param {Array<{ clave: string, fecha: Date, tarjetas: Array }>} dias
 * @param {number} n
 * @returns {Array<{ clave: string, fecha: Date, tarjetas: Array }>}
 */
export const primerasTarjetasPorDia = (dias, n) => {
  const recortados = [];
  let quedan = n;
  for (const dia of dias) {
    if (quedan <= 0) break;
    const tarjetas = dia.tarjetas.slice(0, quedan);
    quedan -= tarjetas.length;
    recortados.push({ ...dia, tarjetas });
  }
  return recortados;
};
