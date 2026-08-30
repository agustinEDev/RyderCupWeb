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

/** Puesto al cerrar sesión: ver `olvidaLoDeEstaCuenta`. */
let cerrado = false;

/**
 * Una LISTA y no un objeto por id: en un objeto el turno para desalojar sale
 * del orden de las claves, y ese orden no es el de inserción para las que
 * parecen números enteros. Hoy los identificadores son UUID y no pasa, pero
 * atar a eso el «cuál se tira» es frágil de balde. Aquí el orden es el que se
 * ve: la última es la más reciente.
 */
const leeTodo = () => {
  try {
    const crudo = localStorage.getItem(CLAVE);
    const guardado = crudo ? JSON.parse(crudo) : null;
    return Array.isArray(guardado) ? guardado : [];
  } catch {
    return [];
  }
};

const escribe = (todas) => {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(todas));
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
  if (!id || cerrado) return false;

  const todas = leeTodo();
  const donde = todas.findIndex((x) => x.id === id);

  // Si no ha cambiado nada Y ya es la última, no se toca el almacenamiento:
  // esto corre en cada sondeo, toda la vuelta, y es un parseo, un serializado y
  // una escritura síncronos en el hilo que atiende los botones de anotar.
  // Lo de «ya es la última» no es un detalle: de ahí sale el turno para
  // desalojar, y saltarse la escritura sin más dejaba la partida que se está
  // jugando clavada en su sitio y la convertía en la primera en caer
  if (donde === todas.length - 1 && JSON.stringify(todas[donde]) === JSON.stringify({ id, ...lo })) {
    return true;
  }

  if (donde !== -1) todas.splice(donde, 1);
  todas.push({ id, ...lo });

  // Las más viejas se van por delante
  return escribe(todas.slice(-CUANTAS_CABEN));
};

/** @returns {{partida: Object, campo: Object|null}|null} */
export const loQueSeSupo = (id) => {
  if (!id) return null;
  const lo = leeTodo().find((x) => x.id === id);
  return lo && lo.partida ? lo : null;
};

/** Se olvida: la partida ya no está, o ya no es nuestra. */
export const olvida = (id) => {
  if (!id) return;
  const todas = leeTodo();
  const quedan = todas.filter((x) => x.id !== id);
  if (quedan.length === todas.length) return;
  escribe(quedan);
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
  if (cerrado) return false;
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
const borra = () => {
  try {
    localStorage.removeItem(CLAVE_LISTA);
    localStorage.removeItem(CLAVE);
  } catch {
    // Nada que hacer
  }
};

export const olvidaLoDeEstaCuenta = () => {
  // Y no se vuelve a escribir en lo que queda de página. Los cierres duros
  // —CSRF, dispositivo revocado— salen con una redirección, que NO es
  // instantánea: una petición en vuelo puede contestar después de este borrado
  // y reponer justo lo que se acaba de quitar, y eso sí sobrevive a la
  // redirección. El cerrojo se va solo con la recarga, que es lo que viene
  borra();
  cerrado = true;
};

/** Solo para las pruebas: borra Y levanta el cerrojo. */
export const olvidaTodo = () => {
  borra();
  cerrado = false;
};
