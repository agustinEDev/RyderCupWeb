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

import { distanciaEnMetros, distanciaExacta } from './distanciasAlGreen';
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

/** Lo mismo, sin redondear cada tramo: para comparar con otros metros. */
const longitudExacta = (linea) => linea.slice(1).reduce((total, punto, i) => total + distanciaExacta(linea[i], punto), 0);

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
 * más) se queda como está: para quedarse con los de su par, `aCodosDelPar`.
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

// Lo que tiene que separarse un punto de la línea para contar como codo: los
// vértices que OSM dibuja casi en línea recta no lo son
export const MIN_DESVIO_DE_UN_CODO_M = 15;

// Metros de `p` al tramo de `a` a `b`, en un plano local (pocos cientos de metros)
const distanciaAlTramo = (p, a, b) => {
  const coseno = Math.cos(radianes(a.lat));
  const xy = (q) => [radianes(q.lon - a.lon) * RADIO_TERRESTRE_M * coseno, radianes(q.lat - a.lat) * RADIO_TERRESTRE_M];
  const [px, py] = xy(p);
  const [bx, by] = xy(b);
  const largo2 = bx * bx + by * by;
  const t = largo2 > 0 ? Math.min(1, Math.max(0, (px * bx + py * by) / largo2)) : 0;
  return Math.hypot(px - t * bx, py - t * by);
};

/**
 * Una línea con más puntos en medio de los codos de su par (las de OSM) se queda
 * con los de su par, DONDE DE VERDAD GIRA (Agustín, 16 oct): la salida, el green
 * y, como mucho, tantos codos como su par, eligiendo cada vez el punto que más
 * se separa de la línea ya elegida (al estilo de Douglas-Peucker), y solo si se
 * separa al menos 15 m. Así conserva la esquina de un dogleg (a partes iguales
 * del recorrido la cortaba) y los vértices casi en línea no cuentan. Un par 3,
 * recto. Una línea que ya cabe se queda como está.
 */
export const aCodosDelPar = (lineaEntera, par) => {
  const codos = codosDelPar(par);
  // OSM a veces repite un nodo seguido: dos codos en el mismo sitio, no
  const sinRepetidos = lineaEntera.filter((p, i) => i === 0 || p.lat !== lineaEntera[i - 1].lat || p.lon !== lineaEntera[i - 1].lon);
  const linea = sinRepetidos.length === lineaEntera.length ? lineaEntera : sinRepetidos;
  if (linea.length - 2 <= codos) return linea;
  const elegidos = [0, linea.length - 1];
  while (elegidos.length - 2 < codos) {
    let mejor = null;
    for (let k = 0; k < elegidos.length - 1; k += 1) {
      const [desde, hasta] = [elegidos[k], elegidos[k + 1]];
      for (let i = desde + 1; i < hasta; i += 1) {
        const desvio = distanciaAlTramo(linea[i], linea[desde], linea[hasta]);
        if (desvio >= MIN_DESVIO_DE_UN_CODO_M && (mejor === null || desvio > mejor.desvio)) mejor = { i, desvio };
      }
    }
    if (mejor === null) break;
    elegidos.push(mejor.i);
    elegidos.sort((x, y) => x - y);
  }
  return elegidos.map((i) => linea[i]);
};

/** Un anillo cerrado de puntos a `metros` de `centro` (el arco de la tarjeta). */
export const circuloAlrededor = (centro, metros, lados = 64) => {
  const anillo = Array.from({ length: lados }, (_, i) => puntoDesde(centro, (360 / lados) * i, metros));
  return [...anillo, anillo[0]];
};

/**
 * La línea con la salida del jugador (V2, Agustín, 17 oct): hay una referencia
 * por hoyo, de la barra que sea, y cada uno la ve desde la suya. Su salida se
 * lleva sobre el primer tramo lo que va de lo que mide la línea (siguiendo los
 * codos) a los metros de su tarjeta: hacia delante si la tarjeta es más corta,
 * hacia atrás (en la misma dirección) si es más larga. No se mueve sin metros,
 * si la diferencia es más que lo que mide el primer tramo (adelantarla pasaría
 * del primer codo), ni si deja el green a menos de 40 o más de 750 m en recta.
 */
export const salidaPorMetros = (linea, metros) => {
  if (!Array.isArray(linea) || linea.length < 2 || !Number.isFinite(metros)) return linea;
  const largo = longitudExacta(linea);
  // Un punto roto (NaN) no se arrastra a la salida
  if (!Number.isFinite(largo)) return linea;
  const diferencia = largo - metros;
  if (Math.abs(diferencia) < 0.5) return linea;
  const [salida, siguiente] = linea;
  const primerTramo = distanciaExacta(salida, siguiente);
  if (Math.abs(diferencia) >= primerTramo) return linea;
  // Hacia el primer codo; con la diferencia negativa, hacia atrás
  const nueva = puntoDesde(salida, rumbo(salida, siguiente), diferencia);
  if (salidaGreenFueraDeLimites(nueva, linea.at(-1))) return linea;
  return [nueva, ...linea.slice(1)];
};

/** Los puntos de una línea `{ tee, bends, greenCenter }`, en orden: salida, codos y green. */
export const puntosDeLaLinea = (linea) => [linea.tee, ...(linea.bends ?? []), linea.greenCenter];

/** La inversa: de los puntos en orden (salida, codos y green) a la línea. */
export const lineaDePuntos = (puntos) => ({ tee: puntos[0], bends: puntos.slice(1, -1), greenCenter: puntos.at(-1) });
