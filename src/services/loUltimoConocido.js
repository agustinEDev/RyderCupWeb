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

import { vaciaLaMemoriaDeLasListas } from './memoriaDeLasListas';

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
  if (
    donde === todas.length - 1 &&
    JSON.stringify(todas[donde]) === JSON.stringify({ id, ...lo })
  ) {
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
    if (JSON.stringify(refrescada) === JSON.stringify(todas[donde]))
      return true;
    todas[donde] = refrescada;
    return escribe(todas);
  }

  const ultimaAbierta = todas.map((x) => !x.precargada).lastIndexOf(true);
  const sePuedeIr = (x, i) => !protegidas.has(x.id) && i !== ultimaAbierta;
  const precargadas = todas.filter((x) => x.precargada).length;

  if (precargadas >= CUANTAS_PRECARGADAS || todas.length >= CUANTAS_CABEN) {
    // Con las precargadas al tope se va una de ellas; si no, la más vieja que
    // se pueda ir, sea lo que sea
    const seVa =
      precargadas >= CUANTAS_PRECARGADAS
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
    localStorage.setItem(
      clave,
      JSON.stringify((lista ?? []).slice(0, CUANTAS_EN_LA_LISTA)),
    );
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

export const recuerdaLosPartidos = (partidos) =>
  guardaLista(CLAVE_PARTIDOS, partidos);

/** @returns {Array|null} */
export const losUltimosPartidos = () => leeLista(CLAVE_PARTIDOS);

/**
 * Y las próximas partidas de stroke play, la puerta del banner a su pantalla
 * sin cobertura (FE #824, PR 7). Clave propia, por lo mismo: con otra forma,
 * mezcladas con los partidos las leería mal «Mis próximos partidos».
 */
const CLAVE_PARTIDAS = 'rydercup-ultimas-partidas-de-franja';

export const recuerdaLasPartidas = (partidas) =>
  guardaLista(CLAVE_PARTIDAS, partidas);

/** @returns {Array|null} */
export const lasUltimasPartidas = () => leeLista(CLAVE_PARTIDAS);

/**
 * Lo último que se vio del panel, para pintarlo al entrar sin esperar a sus
 * cuatro peticiones (Agustín, 14 nov 2026). Con su cuenta dentro: solo lo usa
 * esa. Con el hándicap y las cifras que se veían: Agustín lo pidió así el mismo
 * día, aunque en la fase 3 el hándicap se dejó fuera de la copia del usuario.
 * Se borra al cerrar sesión, como todo lo de la cuenta.
 */
const CLAVE_PANEL = 'rydercup-ultimo-panel';
/** Si cambia la forma de lo guardado, se sube y lo de antes se ignora. */
const VERSION_DEL_PANEL = 1;

/** De cada competición, lo que usa el panel: contarlas y la tarjeta de pendientes. */
const loJustoDeLaCompeticion = (c) => ({
  id: c?.id,
  name: c?.name,
  status: c?.status,
});

/** Las cifras que pinta el panel. Sin la lista de diferenciales, que no enseña. */
const CAMPOS_DE_LAS_CIFRAS = [
  'handicap',
  'handicapTrend',
  'scoringAvg',
  'roundsPlayed',
  'tournamentsTotal',
  'tournamentsActive',
  'estimatedIndex',
  'playingAvg',
  'bestDifferential',
  'roundsWithDifferential',
];

/** Lo que hace falta para rehacer cada partida reciente (`RecentMatch`). */
const CAMPOS_DE_LA_PARTIDA = [
  'id',
  'date',
  'playedAt',
  'matchFormat',
  'scoringFormat',
  'golfCourseId',
  'golfCourseName',
  'matchName',
  'tournamentName',
  'result',
  'score',
  'stablefordPoints',
  'totalStrokes',
  'holesPlayed',
  'partners',
  'opponents',
  'excludedFromStats',
];

/**
 * Valores sueltos de esos campos: lo que llega son entidades con campos privados
 * y getters, y `JSON.stringify` de una entidad da `{}`. Lo que no vino no se
 * guarda, para que al rehacerla la entidad ponga su valor por defecto.
 */
const enPlano = (campos, x) =>
  Object.fromEntries(
    campos
      .map((c) => [c, x?.[c] instanceof Date ? x[c].toISOString() : x?.[c]])
      .filter(([, v]) => v !== undefined),
  );

const esUnObjeto = (x) =>
  Boolean(x) && typeof x === 'object' && !Array.isArray(x);

const conId = (x) => esUnObjeto(x) && typeof x.id === 'string' && x.id !== '';

/**
 * Lo que se pinta tiene que ser de su tipo: un nombre que no es texto (un
 * objeto, por ejemplo) revienta al pintarlo, y como se pinta antes de que llegue
 * lo nuevo, tumbaría el panel en cada apertura hasta cerrar sesión (CodeRabbit).
 */
const nada = (x) => x === null || x === undefined;
const textoONada = (x) => nada(x) || typeof x === 'string';
const numeroONada = (x) => nada(x) || Number.isFinite(x);
const textos = (x) =>
  x === undefined ||
  (Array.isArray(x) && x.every((t) => typeof t === 'string'));

const TIPOS_DE_LA_PARTIDA = {
  date: textoONada,
  playedAt: textoONada,
  matchFormat: textoONada,
  scoringFormat: textoONada,
  golfCourseId: textoONada,
  golfCourseName: textoONada,
  matchName: textoONada,
  tournamentName: textoONada,
  result: textoONada,
  score: (x) => textoONada(x) || Number.isFinite(x),
  stablefordPoints: numeroONada,
  totalStrokes: numeroONada,
  holesPlayed: numeroONada,
  partners: textos,
  opponents: textos,
  excludedFromStats: (x) => x === undefined || typeof x === 'boolean',
};

const TIPOS_DE_LA_COMPETICION = { name: textoONada, status: textoONada };

const deSuTipo = (tipos) => (x) =>
  conId(x) && Object.entries(tipos).every(([campo, vale]) => vale(x[campo]));

/** Una lista guardada, sin los elementos que no se pueden pintar. */
const listaValida = (lista, esValido) =>
  Array.isArray(lista) ? lista.filter(esValido) : null;

/** Las cifras guardadas, solo las que son números (o nada). */
const cifrasValidas = (cifras) =>
  esUnObjeto(cifras)
    ? Object.fromEntries(
        Object.entries(cifras).filter(
          ([c, v]) =>
            CAMPOS_DE_LAS_CIFRAS.includes(c) &&
            (v === null || Number.isFinite(v)),
        ),
      )
    : null;

const leeElPanel = () => {
  try {
    const crudo = localStorage.getItem(CLAVE_PANEL);
    if (!crudo) return null;
    const panel = JSON.parse(crudo);
    if (!esUnObjeto(panel) || panel.v !== VERSION_DEL_PANEL) return null;
    if (typeof panel.usuarioId !== 'string' || !panel.usuarioId) return null;
    return {
      usuarioId: panel.usuarioId,
      competiciones: listaValida(
        panel.competiciones,
        deSuTipo(TIPOS_DE_LA_COMPETICION),
      ),
      ultimasPartidas: listaValida(
        panel.ultimasPartidas,
        deSuTipo(TIPOS_DE_LA_PARTIDA),
      ),
      estadisticas: cifrasValidas(panel.estadisticas),
    };
  } catch {
    return null;
  }
};

/**
 * Guarda una parte del panel de esta cuenta, o las dos. Cada una llega por su
 * lado; si lo guardado es de otra cuenta, se empieza de cero.
 *
 * @param {string} usuarioId
 * @param {{competiciones?: Array|null, ultimasPartidas?: Array|null, estadisticas?: Object|null}} partes
 *   Cada parte: lo nuevo, `null` para borrarla, o sin poner para dejar la que había
 */
export const recuerdaElPanel = (
  usuarioId,
  { competiciones, ultimasPartidas, estadisticas } = {},
) => {
  if (cerrado || !usuarioId) return false;
  // Nada de aquí puede hacer reventar a quien guarda: guardar va justo después
  // de aplicar una respuesta buena, y su fallo no puede deshacerla (/code-review).
  // Una fecha imposible en una partida, por ejemplo, lanza al pasarla a texto
  try {
    const antes = leeElPanel();
    const deEsta = antes?.usuarioId === usuarioId ? antes : null;
    // Una parte nueva, `null` para borrarla (el servidor dijo que no), o nada
    // para dejar la que había
    const parte = (valor, esValida, enPlanoDeLaParte, anterior) => {
      if (valor === null) return null;
      return esValida(valor) ? enPlanoDeLaParte(valor) : (anterior ?? null);
    };
    const panel = {
      v: VERSION_DEL_PANEL,
      usuarioId,
      competiciones: parte(
        competiciones,
        Array.isArray,
        (lista) => lista.map(loJustoDeLaCompeticion),
        deEsta?.competiciones,
      ),
      ultimasPartidas: parte(
        ultimasPartidas,
        Array.isArray,
        (lista) => lista.map((m) => enPlano(CAMPOS_DE_LA_PARTIDA, m)),
        deEsta?.ultimasPartidas,
      ),
      estadisticas: parte(
        estadisticas,
        esUnObjeto,
        (cifras) => enPlano(CAMPOS_DE_LAS_CIFRAS, cifras),
        deEsta?.estadisticas,
      ),
    };
    localStorage.setItem(CLAVE_PANEL, JSON.stringify(panel));
    return true;
  } catch {
    // Sin sitio, o algo que no se deja guardar: no se guarda. La cola de golpes
    // sin enviar manda
    return false;
  }
};

/**
 * @param {string} usuarioId
 * @returns {{competiciones: Array|null, ultimasPartidas: Array|null, estadisticas: Object|null}|null}
 */
export const elUltimoPanel = (usuarioId) => {
  if (!usuarioId) return null;
  const panel = leeElPanel();
  if (!panel || panel.usuarioId !== usuarioId) return null;
  return {
    competiciones: panel.competiciones,
    ultimasPartidas: panel.ultimasPartidas,
    estadisticas: panel.estadisticas,
  };
};

/**
 * Al cerrar sesión: son datos de ESTA cuenta. En un móvil compartido, sin esto
 * la siguiente persona que entrara y se quedara sin señal vería la lista de
 * partidas de la anterior, con sus nombres y sus resultados.
 */
const borra = () => {
  try {
    localStorage.removeItem(CLAVE_LISTA);
    localStorage.removeItem(CLAVE_PARTIDOS);
    localStorage.removeItem(CLAVE_PARTIDAS);
    localStorage.removeItem(CLAVE_PANEL);
    localStorage.removeItem(CLAVE);
  } catch {
    // Nada que hacer
  }
  // Y las listas que se cargaron en esta visita (FE #647, fase 3)
  vaciaLaMemoriaDeLasListas();
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

/**
 * Entra una cuenta en esta carga (revisión de la fase 3): el cerrojo se levanta. Los
 * caminos «sin sesión» que no salen de la página (la pantalla de entrar, un 401 al
 * arrancar) limpian con el mismo registro y lo dejaban puesto hasta recargar: tras
 * entrar con contraseña, sin recarga, la anotación sin cobertura se quedaba sin
 * partidas guardadas. En los cierres duros no entra nadie antes de la recarga, así que
 * allí el cerrojo sigue haciendo lo suyo. No borra nada.
 */
export const abreLoGuardadoParaLaCuenta = () => {
  cerrado = false;
};

/** Solo para las pruebas: borra Y levanta el cerrojo. */
export const olvidaTodo = () => {
  borra();
  cerrado = false;
};
