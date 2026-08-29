/**
 * Si la aplicación está llegando al servidor o no.
 *
 * `navigator.onLine` no sirve para esto: dice si hay una interfaz de red
 * levantada, no si los datos llegan. En un campo de golf con dos rayas de
 * cobertura vale `true` mientras ninguna petición completa, así que la
 * aplicación se creía conectada, no avisaba de nada y no guardaba nada para
 * después (FE #514).
 *
 * Aquí la respuesta la dan las peticiones reales: si una vuelve —con el estado
 * que sea, incluso un error del servidor— hay conexión; si ninguna llega, no la
 * hay. El navegador se sigue escuchando, porque cuando él dice que no hay red
 * acierta siempre; es al revés cuando se equivoca.
 */

// Se arranca creyendo que hay conexión: sin ninguna petición hecha todavía,
// avisar de que no la hay sería adivinar, y el aviso saldría en cada arranque
let llegaAlServidor = true;

const oyentes = new Set();

const avisa = () => {
  for (const oyente of oyentes) oyente();
};

const cambiaA = (valor) => {
  if (llegaAlServidor === valor) return;
  llegaAlServidor = valor;
  avisa();
};

/** Una petición volvió: hay conexión, aunque la respuesta sea un error. */
export const apuntaRespuestaDelServidor = () => cambiaA(true);

/** Una petición no llegó a completarse: no hay conexión. */
export const apuntaFalloDeRed = () => cambiaA(false);

export const hayConexion = () => llegaAlServidor;

export const seSuscribeALaConexion = (oyente) => {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
};

/** Solo para los tests: devuelve el módulo a su estado de arranque. */
export const olvidaElEstadoDeConexion = () => {
  llegaAlServidor = true;
  oyentes.clear();
};

// El navegador solo se cree cuando dice que NO hay red: ahí no hay duda
if (typeof globalThis.addEventListener === 'function') {
  globalThis.addEventListener('offline', () => cambiaA(false));
  globalThis.addEventListener('online', () => cambiaA(true));
}
