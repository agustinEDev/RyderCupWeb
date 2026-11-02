import { getClient, wrapCreateBrowserRouterV7 } from '@sentry/react';

/**
 * El seguimiento de navegaciones de Sentry sobre el router de datos (FE #647).
 *
 * `wrapCreateBrowserRouterV7` solo instrumenta el router que crea, y solo si su
 * integración ya está puesta. Aquí no lo está: `main.jsx` carga el seguimiento
 * ~2 s después del arranque, para no pagarlo en el JS de arranque, y el router
 * se crea al montar la aplicación. Envuelto entonces, Sentry devolvía el router
 * sin instrumentar y la sesión entera se quedaba sin navegaciones (revisor).
 *
 * Así que la aplicación registra su router, y cuando llega el seguimiento se le
 * pasa a Sentry como si lo creara él (`() => router`): nombra la carga de
 * página con la ruta y abre una navegación en cada cambio, con su propia lógica.
 */
let registrado = null;
let instrumentado = null;

const intentar = () => {
  if (!registrado || instrumentado === registrado.router) return;
  // Sin su integración, el envoltorio no haría nada: se espera a que llegue
  if (!getClient()?.getIntegrationByName?.('BrowserTracing')) return;
  instrumentado = registrado.router;
  const { router, rutas } = registrado;
  wrapCreateBrowserRouterV7(() => router)(rutas);
};

/** La aplicación, al crear su router. Si Sentry ya está, lo instrumenta ya. */
export function registrarRouterParaSentry(router, rutas) {
  registrado = { router, rutas };
  intentar();
}

/** `infrastructure/sentry`, al poner el seguimiento de navegaciones. */
export function instrumentarRouterEnSentry() {
  intentar();
}
