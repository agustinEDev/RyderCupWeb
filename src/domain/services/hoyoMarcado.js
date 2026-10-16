/**
 * Un hoyo marcado por el jugador (BE #532, PR C).
 *
 * En un hoyo sin datos se marcan la salida y el centro del green (y, en un
 * dogleg, hasta dos codos); si el hoyo ya tiene salida, solo el green. De ahí
 * sale un hoyo como los del mapa: su línea de juego y su green, con delante y
 * fondo a 10 m del centro sobre el último tramo, hasta que haya contorno.
 *
 * Las reglas son las aprobadas el 15 oct; el límite de 40-750 m lo aplica
 * también el servidor, y aquí sirve para no aceptar un green imposible. Los
 * codos van según el par (16 oct).
 */

import { distanciaEnMetros } from './distanciasAlGreen';
import { radianes, rumbo } from './geometriaDelHoyo';

export const METROS_AL_BORDE_DEL_GREEN = 10;
export const MAX_CODOS = 2;
export const MIN_SALIDA_GREEN_M = 40;
export const MAX_SALIDA_GREEN_M = 750;
// A más de esto del campo no se está jugando: el mismo límite que el servidor
// pone a cada punto de una muestra (Agustín, 16 oct)
export const MAX_DISTANCIA_AL_CAMPO_M = 3000;

const RADIO_TERRESTRE_M = 6371008.8; // el de distanciaEnMetros
const grados = (rad) => (rad * 180) / Math.PI;

/** El punto a `metros` de `origen` con ese rumbo (grados desde el norte). */
export const puntoDesde = (origen, rumboEnGrados, metros) => {
  const d = metros / RADIO_TERRESTRE_M;
  const r = radianes(rumboEnGrados);
  const lat1 = radianes(origen.lat);
  const lon1 = radianes(origen.lon);
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(r));
  const lon2 = lon1 + Math.atan2(Math.sin(r) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return { lat: grados(lat2), lon: grados(lon2) };
};

const greenAlFinalDe = (linea) => {
  const center = linea.at(-1);
  const anterior = linea.at(-2);
  return {
    front: puntoDesde(center, rumbo(center, anterior), METROS_AL_BORDE_DEL_GREEN),
    center,
    back: puntoDesde(center, rumbo(anterior, center), METROS_AL_BORDE_DEL_GREEN),
  };
};

/**
 * El hoyo que sale de una línea marcada (o de una muestra): su salida, sus
 * codos y su green, con delante y fondo a 10 m del centro sobre el último tramo.
 *
 * @param {{tee: Object, bends: Object[], greenCenter: Object}|null} marca
 */
export const hoyoDeUnaMarca = (marca) => {
  if (!marca?.tee) return null;
  const playLine = [marca.tee, ...marca.bends, marca.greenCenter];
  return { playLine, green: greenAlFinalDe(playLine) };
};

/** Lo que mide la línea siguiendo sus codos, en metros. */
export const longitudDeLaLinea = (linea) =>
  linea.slice(1).reduce((total, punto, i) => total + distanciaEnMetros(linea[i], punto), 0);

/** Si la posición está a más de 3 km del campo; sin una de las dos, no se sabe y no. */
export const estaLejosDelCampo = (posicion, campo) =>
  Boolean(posicion && campo) && distanciaEnMetros(posicion, campo) > MAX_DISTANCIA_AL_CAMPO_M;

/** 'cerca' o 'lejos' si la recta de la salida al green se sale de 40-750 m; si no, null. */
export const salidaGreenFueraDeLimites = (salida, green) => {
  const metros = distanciaEnMetros(salida, green);
  if (metros < MIN_SALIDA_GREEN_M) return 'cerca';
  if (metros > MAX_SALIDA_GREEN_M) return 'lejos';
  return null;
};

/**
 * Los codos que lleva un hoyo según su par (Agustín, 16 oct): un par 3, ninguno;
 * un par 4, uno; un par 5 (o más), dos. Sin par conocido, uno.
 */
export const codosDelPar = (par) => {
  if (par === 3) return 0;
  if (par >= 5) return MAX_CODOS;
  return 1;
};

/**
 * La línea con los codos de su par: los que le faltan se ponen sobre ella, así
 * que su longitud no cambia, y el jugador los arrastra a la calle. En la recta,
 * a partes iguales (en un par 5, a un tercio y a dos tercios); con un codo ya
 * puesto, el que falta en mitad del último tramo. Una línea con los suyos (o con
 * más, como las de un mapa aprobado) se queda como está.
 */
export const conCodosDelPar = (linea, par) => {
  const faltan = codosDelPar(par) - Math.max(0, linea.length - 2);
  if (linea.length < 2 || faltan <= 0) return linea;
  const desde = linea.at(-2);
  const green = linea.at(-1);
  const largo = distanciaEnMetros(desde, green);
  const hacia = rumbo(desde, green);
  const nuevos = Array.from({ length: faltan }, (_, i) => puntoDesde(desde, hacia, (largo * (i + 1)) / (faltan + 1)));
  return [...linea.slice(0, -1), ...nuevos, green];
};

/**
 * Una línea con más puntos en medio de los codos de su par (las de OSM) se queda
 * con los de su par: la salida, el green y, de los de en medio, los más
 * cercanos a partes iguales del recorrido (en un par 5, a un tercio y a dos
 * tercios), sin repetir ninguno. Así cabe en una muestra (QA del 16 oct). Una
 * línea que ya cabe se queda como está.
 */
export const aCodosDelPar = (lineaEntera, par) => {
  const codos = codosDelPar(par);
  // OSM a veces repite un nodo seguido: dos codos en el mismo sitio, no
  const sinRepetidos = lineaEntera.filter((p, i) => i === 0 || p.lat !== lineaEntera[i - 1].lat || p.lon !== lineaEntera[i - 1].lon);
  const linea = sinRepetidos.length === lineaEntera.length ? lineaEntera : sinRepetidos;
  if (linea.length - 2 <= codos) return linea;
  const recorrido = [0];
  for (let i = 1; i < linea.length; i += 1) recorrido.push(recorrido[i - 1] + distanciaEnMetros(linea[i - 1], linea[i]));
  const total = recorrido.at(-1);
  const elegidos = [];
  for (let k = 1; k <= codos; k += 1) {
    const objetivo = (total * k) / (codos + 1);
    let mejor = null;
    for (let i = 1; i < linea.length - 1; i += 1) {
      if (elegidos.includes(i)) continue;
      if (mejor === null || Math.abs(recorrido[i] - objetivo) < Math.abs(recorrido[mejor] - objetivo)) mejor = i;
    }
    elegidos.push(mejor);
  }
  return [linea[0], ...elegidos.sort((a, b) => a - b).map((i) => linea[i]), linea.at(-1)];
};

/** Un anillo cerrado de puntos a `metros` de `centro` (el arco de la tarjeta). */
export const circuloAlrededor = (centro, metros, lados = 64) => {
  const anillo = Array.from({ length: lados }, (_, i) => puntoDesde(centro, (360 / lados) * i, metros));
  return [...anillo, anillo[0]];
};
