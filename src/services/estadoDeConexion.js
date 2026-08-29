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
// avisar de que no la hay sería adivinar, y el aviso saldría en cada arranque.
// La excepción es el único caso en que el navegador acierta seguro: si dice que
// NO hay red, no la hay —abrir la pantalla en modo avión, por ejemplo—
let llegaAlServidor = globalThis.navigator?.onLine !== false;

const oyentes = new Set();

const avisa = () => {
  // Sobre una copia: un oyente que se apunte durante el aviso entraría en este
  // mismo recorrido, y el de la pantalla de anotación vacía la cola de hoyos.
  // Llamarlo dos veces mandaría el mismo hoyo dos veces
  for (const oyente of [...oyentes]) oyente();
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
  llegaAlServidor = globalThis.navigator?.onLine !== false;
  oyentes.clear();
};

// Los dos eventos del navegador se escuchan, pero no valen lo mismo.
//
// `offline` es de fiar: si dice que no hay red, no la hay.
//
// `online` no lo es —engancharse a un portal cautivo también lo emite—, y aun
// así se hace caso: es una de las formas de volver a intentarlo, y si se
// equivoca la corrección llega sola, porque la primera petición que no complete
// devuelve el estado a «sin conexión». Quitarlo dejaría la recuperación
// dependiendo solo del sondeo.
if (typeof globalThis.addEventListener === 'function') {
  globalThis.addEventListener('offline', () => cambiaA(false));
  globalThis.addEventListener('online', () => cambiaA(true));
}
