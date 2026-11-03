/**
 * Lo último que cargó cada lista en esta visita, para enseñarlo sin red
 * (FE #647, fase 3; decidido el 2 nov 2026).
 *
 * Solo en memoria, a propósito: el almacenamiento del móvil lo comparte la cola
 * de golpes sin enviar, y perder eso sí sería grave (`loUltimoConocido`). Así
 * que al cerrar la aplicación se va, y una lista solo se puede enseñar sin red
 * si ya se cargó en esta visita.
 *
 * Va por cuenta: si entra otra persona sin recargar la página, no ve la lista
 * de la anterior. Y se vacía al cerrar sesión, con lo demás de la cuenta. Lo
 * mismo con los filtros de cada lista.
 */
const listas = new Map();

/** @param {string} clave La lista: 'competiciones', 'amigos'… */
export const guardaEnMemoria = (clave, usuarioId, datos) => {
  listas.set(clave, { usuarioId, datos });
};

/** @returns {*|null} Lo guardado por esta cuenta, o `null` */
export const loGuardadoEnMemoria = (clave, usuarioId) => {
  const guardado = listas.get(clave);
  return guardado && guardado.usuarioId === usuarioId ? guardado.datos : null;
};

/**
 * Los filtros de cada lista, por entrada del historial: al volver atrás se
 * reponen, y así el scroll cae en la misma lista (Agustín, 2 nov 2026). Entrar
 * de nuevo es otra entrada, y empieza sin filtros. Antes iban en el propio
 * historial, y escribirlo cortaba la recarga que estuviera en camino, dejaba lo
 * buscado a la vista de la siguiente cuenta y Safari lo frena si se escribe en
 * cada tecla (tercer revisor).
 */
export const MAXIMO_DE_FILTROS = 50;
const filtros = new Map();
const deLosFiltros = (clave, usuarioId, entrada) => JSON.stringify([clave, usuarioId, entrada]);

/** @param {{busqueda: string, estado: string}|null} losFiltros `null`, sin filtros */
export const guardaLosFiltros = (clave, usuarioId, entrada, losFiltros) => {
  const donde = deLosFiltros(clave, usuarioId, entrada);
  filtros.delete(donde);
  if (!losFiltros) return;
  filtros.set(donde, losFiltros);
  // Los más viejos fuera: el Map guarda el orden en que entraron
  if (filtros.size > MAXIMO_DE_FILTROS) filtros.delete(filtros.keys().next().value);
};

/** @returns {{busqueda: string, estado: string}|null} */
export const losFiltrosGuardados = (clave, usuarioId, entrada) =>
  filtros.get(deLosFiltros(clave, usuarioId, entrada)) ?? null;

/**
 * Las entradas del historial en que cada lista ya se pintó con tarjetas. Al
 * volver a una, sus tarjetas salen ya pintadas, sin la animación de entrada:
 * el router deja el scroll a la altura de la séptima, y su retraso dejaba la
 * pantalla en blanco un momento (Agustín, 3 nov 2026, en el iPhone). Recargar
 * es otra visita: sin nada apuntado, anima como siempre.
 */
const pintadas = new Set();

export const apuntaQueSePinto = (clave, usuarioId, entrada) => {
  const donde = deLosFiltros(clave, usuarioId, entrada);
  pintadas.delete(donde);
  pintadas.add(donde);
  if (pintadas.size > MAXIMO_DE_FILTROS) pintadas.delete(pintadas.values().next().value);
};

export const yaSePinto = (clave, usuarioId, entrada) => pintadas.has(deLosFiltros(clave, usuarioId, entrada));

export const vaciaLaMemoriaDeLasListas = () => {
  pintadas.clear();
  listas.clear();
  filtros.clear();
};
