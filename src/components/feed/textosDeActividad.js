import { nombreVisible } from '../../utils/nombreVisible';
import { haceCuanto, queDiaEs } from '../../domain/services/lineaDeActividad';

/**
 * Cómo se escribe cada cosa de Actividad (FE-1): frases con nombres que
 * enlazan al perfil, fechas y horas en el idioma de la aplicación.
 *
 * Las frases salen de i18n con el nombre en un hueco: se pide la frase con una
 * marca en lugar del nombre y se parte por ella, para que el orden de las
 * palabras lo decida cada idioma y el nombre siga siendo un enlace. Aquí solo
 * se trocea; los trozos los pinta `FraseDeActividad`.
 */

const MARCA = '\u0001';
const HUECO_NOMBRE = `${MARCA}name${MARCA}`;
const HUECO_RIVALES = `${MARCA}rivals${MARCA}`;

// `Intl` revienta con una etiqueta que no entiende: entonces, la del navegador
const conIdioma = (idioma, crea) => {
  try {
    return crea(idioma);
  } catch {
    return crea(undefined);
  }
};

const espacios = (texto) => texto.replace(/ {2,}/g, ' ');

/**
 * Una persona de la tarjeta: su nombre y, si tiene cuenta y la conocemos, el
 * enlace a su perfil. Quien no viene en los autores (bloqueado, desactivado,
 * oculto) se lee «un jugador», sin enlace.
 */
export const personaDe = (id, autores, t) => {
  const autor = id ? autores?.[id] : null;
  const nombre = nombreVisible(autor);
  if (!nombre) return { nombre: t('feed:player'), enlace: null };
  return { nombre, enlace: `/players/${id}` };
};

/** Un invitado de partida rápida: no tiene cuenta, va por su nombre o «un invitado». */
export const invitadoDe = (nombre, t) => ({ nombre: nombre || t('feed:guest'), enlace: null });

/** Varias personas unidas como en el idioma: «Pedro y Xavi». */
const listaDe = (personas, idioma) => {
  const nombres = personas.map((p) => p.nombre);
  let partes;
  try {
    partes = conIdioma(idioma, (l) =>
      new Intl.ListFormat(l, { style: 'long', type: 'conjunction' }).formatToParts(nombres)
    );
  } catch {
    partes = nombres.flatMap((n, i) =>
      i === 0 ? [{ type: 'element', value: n }] : [{ type: 'literal', value: ', ' }, { type: 'element', value: n }]
    );
  }
  let i = 0;
  const trozos = partes.map((parte) => {
    if (parte.type !== 'element') return { tipo: 'texto', valor: parte.value };
    const persona = personas[i];
    i += 1;
    return { tipo: 'persona', persona };
  });
  return { trozos, texto: partes.map((p) => p.value).join('') };
};

/**
 * Una frase con huecos para el nombre (`{{name}}`) y los rivales
 * (`{{rivals}}`). Devuelve los trozos, para pintarla con sus enlaces, y el
 * texto plano, para nombrar el enlace de la tarjeta.
 *
 * @returns {{ trozos: Array<{tipo: 'texto', valor: string}|{tipo: 'persona', persona: Object}>, texto: string }}
 */
export const fraseCon = (t, clave, valores, { persona, rivales, idioma } = {}) => {
  const lista = rivales ? listaDe(rivales, idioma) : null;
  const texto = espacios(
    t(clave, { ...valores, name: persona?.nombre, rivals: lista?.texto })
  );
  const conMarcas = espacios(
    t(clave, {
      ...valores,
      name: persona ? HUECO_NOMBRE : undefined,
      rivals: lista ? HUECO_RIVALES : undefined,
    })
  );
  const trozos = conMarcas
    .split(new RegExp(`(${HUECO_NOMBRE}|${HUECO_RIVALES})`))
    .filter((trozo) => trozo !== '')
    .flatMap((trozo) => {
      if (trozo === HUECO_NOMBRE) return [{ tipo: 'persona', persona }];
      if (trozo === HUECO_RIVALES) return lista.trozos;
      return [{ tipo: 'texto', valor: trozo }];
    });
  return { trozos, texto };
};

/** Una frase sin huecos, ya escrita. */
export const fraseDeTexto = (texto) => ({ trozos: [{ tipo: 'texto', valor: texto }], texto });

/** «18:30»: la hora de una tarjeta que no es de hoy. */
const horaDelReloj = (fecha, idioma) =>
  conIdioma(idioma, (l) =>
    // 24 h en los dos idiomas: «18:30», no «06:30 PM»
    new Intl.DateTimeFormat(l, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(fecha)
  );

/** «hace 5 min», «hace 2 h» si es de hoy; «18:30» si no. */
export const horaDeLaTarjeta = (fecha, ahora, t, idioma) => {
  if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) return '';
  const hace = haceCuanto(fecha, ahora);
  if (hace.unidad === 'ahora') return t('feed:time.now');
  if (hace.unidad === 'minutos') return t('feed:time.minutes', { count: hace.valor });
  if (hace.unidad === 'horas') return t('feed:time.hours', { count: hace.valor });
  return horaDelReloj(fecha, idioma);
};

const OPCIONES_DEL_DIA = {
  semana: { weekday: 'short', day: 'numeric', month: 'short' },
  esteAno: { day: 'numeric', month: 'short' },
  otroAno: { day: 'numeric', month: 'short', year: 'numeric' },
};

/** El separador: «Hoy», «Ayer», «mié 15 oct», «15 oct», «15 oct 2025». */
export const etiquetaDelDia = (fecha, ahora, t, idioma) => {
  const dia = queDiaEs(fecha, ahora);
  if (dia === 'hoy') return t('feed:days.today');
  if (dia === 'ayer') return t('feed:days.yesterday');
  const texto = conIdioma(idioma, (l) =>
    new Intl.DateTimeFormat(l, OPCIONES_DEL_DIA[dia]).format(fecha)
  );
  // «mié, 15 oct» se lee mejor sin la coma en español; el inglés la lleva
  return String(idioma || '').startsWith('es') ? texto.replace(',', '') : texto;
};

// «2026-11-14» como día local: con `new Date(texto)` sería medianoche UTC, y en
// América caería el día antes
const diaLocal = (texto) => {
  const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(texto || '');
  if (!partes) return null;
  return new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]));
};

/** «14–15 nov»: las fechas de un torneo, con el año solo si no es este. */
export const fechasDelTorneo = (inicio, fin, ahora, idioma) => {
  const desde = diaLocal(inicio);
  if (!desde) return '';
  // Un fin anterior al inicio haría lanzar a `formatRange`
  const finLeido = diaLocal(fin);
  const hasta = finLeido && finLeido >= desde ? finLeido : desde;
  const opciones =
    desde.getFullYear() === ahora.getFullYear() && hasta.getFullYear() === ahora.getFullYear()
      ? OPCIONES_DEL_DIA.esteAno
      : OPCIONES_DEL_DIA.otroAno;
  return conIdioma(idioma, (l) => {
    const formato = new Intl.DateTimeFormat(l, opciones);
    return typeof formato.formatRange === 'function'
      ? formato.formatRange(desde, hasta)
      : formato.format(desde);
  });
};
