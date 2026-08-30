/**
 * Lo último que se supo, guardado en el dispositivo (FE #524).
 *
 * La finalidad de todo esto es poder anotar sin cobertura, y para eso no basta
 * con guardar los golpes: hace falta poder **llegar** a la partida y pintarla.
 * Sin esto, quien vuelve a abrir la aplicación en el campo se encuentra una
 * pantalla que no puede dibujarse —ni hoyos, ni pares, ni quién juega— y ahí ya
 * no hay nada que anotar.
 *
 * El service worker no sirve para esto y es deliberado: las llamadas a la API
 * son `NetworkOnly` para no dar por buenos datos rancios sin decirlo. Aquí sí
 * se puede, porque la pantalla avisa de que lo que se ve puede no estar al día.
 *
 * Reglas que trae la experiencia:
 *
 * - **Solo se guarda lo que responde el backend.** Igual que en
 *   `sesionCompartida`: quien lee de aquí espera el DTO, no una entidad de
 *   dominio.
 * - **Un error CON respuesta no se tapa.** Si el servidor dice 404 o 403, esa
 *   partida ya no está o no es tuya: resucitarla desde el móvil sería mentir.
 *   Esto solo cubre el caso de que no haya a quién preguntar.
 * - **Cabe poco a propósito.** Se guardan las últimas partidas abiertas y nada
 *   más: el almacenamiento del navegador es pequeño y compartido, y la cola de
 *   golpes sin enviar vive ahí también. Perder eso sí sería grave.
 */

const CLAVE = 'rydercup-ultimo-conocido';

/** Las últimas que se abrieron. Con una sola, volver a la anterior sin
 *  cobertura no encontraba nada, y jugar dos partidas el mismo día es normal. */
const CUANTAS_CABEN = 3;

const leeTodo = () => {
  try {
    const crudo = localStorage.getItem(CLAVE);
    const guardado = crudo ? JSON.parse(crudo) : null;
    return guardado && typeof guardado === 'object' && !Array.isArray(guardado) ? guardado : {};
  } catch {
    return {};
  }
};

const escribe = (todo) => {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(todo));
    return true;
  } catch {
    // Sin espacio, o en una ventana privada. Se seguirá sin poder pintar la
    // partida sin cobertura, que es como estaba antes
    return false;
  }
};

/**
 * @param {string} id
 * @param {{partida: Object, campo: Object|null}} lo Tal y como lo dio el backend
 * @returns {boolean} Si de verdad quedó guardado
 */
export const recuerda = (id, lo) => {
  if (!id) return false;

  const todo = leeTodo();

  // Si no ha cambiado nada Y ya es la última, no se toca el almacenamiento:
  // esto corre en cada sondeo, toda la vuelta, y es un parseo, un serializado y
  // una escritura síncronos en el hilo que atiende los botones de anotar.
  //
  // Lo de «ya es la última» no es un detalle: el turno para desalojar sale del
  // orden de las claves, así que saltarse la escritura sin más dejaba la
  // partida que se está jugando clavada en su sitio de la primera vez, y volvía
  // a ser la primera en caer al abrir otra
  const ids = Object.keys(todo);
  const comoEstaba = todo[id];
  const yaEsLaUltima = ids[ids.length - 1] === id;
  if (yaEsLaUltima && comoEstaba && JSON.stringify(comoEstaba) === JSON.stringify(lo)) return true;

  // Se quita antes de volver a poner: escribir sobre una clave que ya está NO
  // la mueve al final
  delete todo[id];
  todo[id] = lo;

  // Las más viejas se van: el orden de las claves da el turno, y la que se
  // acaba de escribir queda siempre la última
  const conLaNueva = Object.keys(todo);
  for (const viejo of conLaNueva.slice(0, Math.max(0, conLaNueva.length - CUANTAS_CABEN))) {
    delete todo[viejo];
  }

  return escribe(todo);
};

/** @returns {{partida: Object, campo: Object|null}|null} */
export const loQueSeSupo = (id) => {
  if (!id) return null;
  const lo = leeTodo()[id];
  return lo && typeof lo === 'object' && lo.partida ? lo : null;
};

/** Se olvida: la partida ya no está, o ya no es nuestra. */
export const olvida = (id) => {
  if (!id) return;
  const todo = leeTodo();
  if (!(id in todo)) return;
  delete todo[id];
  escribe(todo);
};

const CLAVE_LISTA = 'rydercup-ultima-lista';

/**
 * La lista de partidas, para poder LLEGAR a una sin cobertura. Sin esto, quien
 * abre la aplicación en el campo no tiene por dónde entrar: la pantalla de
 * anotación sabe pintarse sola, pero hay que poder pulsar en la partida.
 */
/** Las que caben en la puerta de entrada. La pantalla pide 50, y guardarlas
 *  todas con su DTO entero comparte sitio con la cola de golpes sin enviar. */
const CUANTAS_EN_LA_LISTA = 20;

export const recuerdaLaLista = (partidas) => {
  try {
    localStorage.setItem(CLAVE_LISTA, JSON.stringify((partidas ?? []).slice(0, CUANTAS_EN_LA_LISTA)));
    return true;
  } catch {
    return false;
  }
};

/** @returns {Array|null} */
export const laUltimaLista = () => {
  try {
    const crudo = localStorage.getItem(CLAVE_LISTA);
    if (!crudo) return null;
    const lista = JSON.parse(crudo);
    return Array.isArray(lista) ? lista : null;
  } catch {
    return null;
  }
};

/**
 * Al cerrar sesión: son datos de ESTA cuenta. En un móvil compartido, sin esto
 * la siguiente persona que entrara y se quedara sin señal vería la lista de
 * partidas de la anterior, con sus nombres y sus resultados.
 */
export const olvidaLoDeEstaCuenta = () => {
  olvidaTodo();
};

/** Solo para las pruebas. */
export const olvidaTodo = () => {
  try {
    localStorage.removeItem(CLAVE_LISTA);
    localStorage.removeItem(CLAVE);
  } catch {
    // Nada que hacer
  }
};
