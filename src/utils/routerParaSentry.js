/**
 * El router de la aplicación, guardado para el seguimiento de navegaciones de
 * Sentry (`navegacionesEnSentry`), sin nada de Sentry.
 *
 * App.jsx lo registra al crear su router; el seguimiento llega ~2 s después con
 * `src/sentry.ts`. Antes App.jsx importaba `navegacionesEnSentry`, y con él el
 * envoltorio de React Router de Sentry y todo el seguimiento (BrowserTracing,
 * web-vitals…) entraba en el JS de arranque sin usarse hasta entonces (9 nov
 * 2026). Ahora `navegacionesEnSentry` se apunta aquí al cargar, y lo que pasa es
 * lo mismo: si el seguimiento ya está, el router se instrumenta al registrarlo;
 * si no, cuando llegue.
 */
let registrado = null;
let instrumenta = null;
// Los routers que el seguimiento ya envolvió. Aquí y no en navegacionesEnSentry:
// si ese módulo se vuelve a evaluar (HMR), no envuelve otra vez el mismo router
const instrumentados = new WeakSet();

/** La aplicación, al crear su router. Si el seguimiento ya está, lo instrumenta ya. */
export function registrarRouterParaSentry(router, rutas) {
  registrado = { router, rutas };
  instrumenta?.();
}

/** El router registrado, o null. */
export const routerRegistrado = () => registrado;

/** Si el seguimiento ya envolvió este router. */
export const yaInstrumentado = (router) => instrumentados.has(router);

/** El seguimiento acaba de envolver este router. */
export const marcaInstrumentado = (router) => {
  instrumentados.add(router);
};

/** `navegacionesEnSentry`, al cargar: lo que hay que hacer con cada router registrado. */
export const alRegistrarElRouter = (hacer) => {
  instrumenta = hacer;
};
