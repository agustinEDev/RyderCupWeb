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

/** Lo precargado deja siempre un sitio para lo que se abre de verdad. */
const CUANTAS_PRECARGADAS = CUANTAS_CABEN - 1;

/**
 * Guarda una partida que NADIE ha abierto: la que toca jugar, pedida mientras
 * había cobertura para poder pintarla después en el campo (FE #615).
 *
 * No entra como `recuerda`, que echa sin mirar a la más vieja. Esto corre solo,
 * al abrir el panel, y no puede llevarse por delante lo que el jugador sí
 * abrió: ni una partida con golpes en la cola —es la que hace falta para ver
 * lo que falta por enviar— ni la última que abrió, que es la que se está
 * jugando. Lleva su propia marca (`precargada`) y no se deduce de nada: abrirla
 * de verdad con `recuerda` la quita.
 *
 * @param {string} id
 * @param {{partida: Object, campo: Object|null}} lo Tal y como lo dio el backend
 * @param {{protegidas?: Set<string>}} [opciones] Las que no se pueden echar: las
 *   partidas con golpes en la cola y las de la propia tanda que se precarga
 * @returns {boolean} Si de verdad quedó guardada
 */
export const precarga = (id, lo, { protegidas = new Set() } = {}) => {
  if (!id || cerrado) return false;

  const todas = leeTodo();
  const donde = todas.findIndex((x) => x.id === id);

  if (donde !== -1) {
    // Abierta de verdad: no se toca. Esta respuesta salió del panel sin que
    // nadie la esperara, y si mientras tanto se abrió el partido, lo que guardó
    // la pantalla de anotación es más nuevo —con los golpes ya enviados—.
    // Se decide con lo que hay AHORA en el almacenamiento, no con lo que había
    // al pedirla, y por eso cubre justo esa carrera
    if (!todas[donde].precargada) return true;
    const refrescada = { ...todas[donde], ...lo };
    if (JSON.stringify(refrescada) === JSON.stringify(todas[donde])) return true;
    todas[donde] = refrescada;
    return escribe(todas);
  }

  const ultimaAbierta = todas.map((x) => !x.precargada).lastIndexOf(true);
  const sePuedeIr = (x, i) => !protegidas.has(x.id) && i !== ultimaAbierta;
  const precargadas = todas.filter((x) => x.precargada).length;

  if (precargadas >= CUANTAS_PRECARGADAS || todas.length >= CUANTAS_CABEN) {
    // Con las precargadas al tope se va una de ellas; si no, la más vieja que
    // se pueda ir, sea lo que sea
    const seVa = precargadas >= CUANTAS_PRECARGADAS
      ? todas.findIndex((x, i) => x.precargada && sePuedeIr(x, i))
      : todas.findIndex(sePuedeIr);
    if (seVa === -1) return false;
    todas.splice(seVa, 1);
  }

  todas.push({ id, ...lo, precargada: true });
  return escribe(todas);
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

const guardaLista = (clave, lista) => {
  if (cerrado) return false;
  try {
    localStorage.setItem(clave, JSON.stringify((lista ?? []).slice(0, CUANTAS_EN_LA_LISTA)));
    return true;
  } catch {
    return false;
  }
};

/** @returns {Array|null} */
const leeLista = (clave) => {
  try {
    const crudo = localStorage.getItem(clave);
    if (!crudo) return null;
    const lista = JSON.parse(crudo);
    return Array.isArray(lista) ? lista : null;
  } catch {
    return null;
  }
};

export const recuerdaLaLista = (partidas) => guardaLista(CLAVE_LISTA, partidas);

/** @returns {Array|null} */
export const laUltimaLista = () => leeLista(CLAVE_LISTA);

/**
 * Los próximos partidos de competición, la otra puerta de entrada (FE #615).
 * Con clave propia: compartir la de partidas rápidas hacía que cada pantalla
 * borrara la lista de la otra, y sin cobertura se quedaba sin entrada una de
 * las dos.
 */
const CLAVE_PARTIDOS = 'rydercup-ultimos-partidos';

export const recuerdaLosPartidos = (partidos) => guardaLista(CLAVE_PARTIDOS, partidos);

/** @returns {Array|null} */
export const losUltimosPartidos = () => leeLista(CLAVE_PARTIDOS);

/**
 * Al cerrar sesión: son datos de ESTA cuenta. En un móvil compartido, sin esto
 * la siguiente persona que entrara y se quedara sin señal vería la lista de
 * partidas de la anterior, con sus nombres y sus resultados.
 */
const borra = () => {
  try {
    localStorage.removeItem(CLAVE_LISTA);
    localStorage.removeItem(CLAVE_PARTIDOS);
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
