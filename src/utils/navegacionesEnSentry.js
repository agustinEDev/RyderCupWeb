import { getActiveSpan, getClient, getCurrentScope, getRootSpan, spanToJSON, wrapCreateBrowserRouterV7 } from '@sentry/react';
import { matchRoutes } from 'react-router';

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
 *
 * Menos en un caso: Sentry solo nombra la carga si lo último fue una carga o un
 * «atrás» (POP). La aplicación instalada abre en `/start` y redirige al momento,
 * y un toque en esos 2 s es un PUSH: la carga se quedaba como «Pageload»
 * (revisor). Ahí la nombra esto, con la ruta a la que se llegó; y también si la
 * redirección llega con la carga ya nombrada, que Sentry solo sigue PUSH y POP
 * (/code-review). Como Sentry, pone la ruta de transacción del scope: si no, los
 * errores de esa carga se agrupaban por la dirección, con sus ids.
 *
 * El seguimiento es opcional: si algo de Sentry falla aquí, la aplicación sigue
 * y se vuelve a intentar cuando llegue otra vez (/code-review).
 *
 * Se da por puesto el seguimiento de React Router si hay una integración
 * `BrowserTracing`: `main.jsx` no añade la genérica de Sentry, que se llama
 * igual y no lo es (con ella, el envoltorio no instrumentaría nada).
 *
 * Los routers no se desechan al desmontar la aplicación: en producción se monta
 * una vez, y desecharlo en la limpieza de un efecto mataría el router vivo con
 * StrictMode, que simula desmontar y volver a montar.
 */
const ORIGEN_DEL_NOMBRE = 'sentry.segment.name.source';

// La ruta con parámetros, como la escribe Sentry: las rutas sin `path` (la
// carcasa) no cuentan, y una relativa se cuelga de la anterior ('*' → '/*')
const nombreDeLaRuta = (rutas, pathname) => {
  let nombre = '';
  for (const { route } of matchRoutes(rutas, pathname) ?? []) {
    if (!route.path) continue;
    nombre = route.path.startsWith('/') ? route.path : `${nombre.replace(/\/$/, '')}/${route.path}`;
  }
  return nombre || null;
};

const nombrarLaCarga = (router, rutas, { aunqueTengaRuta = false } = {}) => {
  if (!aunqueTengaRuta && router.state.historyAction === 'POP') return;
  const activa = getActiveSpan();
  if (!activa) return;
  const carga = getRootSpan(activa);
  const datos = spanToJSON(carga);
  const op = datos.op ?? datos.attributes?.['sentry.op'];
  const origen = datos.data?.[ORIGEN_DEL_NOMBRE] ?? datos.attributes?.[ORIGEN_DEL_NOMBRE];
  if (op !== 'pageload' || (origen === 'route' && !aunqueTengaRuta)) return;
  const nombre = nombreDeLaRuta(rutas, router.state.location.pathname);
  if (!nombre) return;
  carga.updateName(nombre);
  carga.setAttribute(ORIGEN_DEL_NOMBRE, 'route');
  carga.setAttribute('url.template', nombre);
  getCurrentScope().setTransactionName(nombre);
};

const sinRomper = (hacer) => {
  try {
    hacer();
  } catch {
    // Sin seguimiento de esta navegación; la aplicación, intacta
  }
};

let registrado = null;
let instrumentado = null;

const intentar = () => {
  if (!registrado || instrumentado === registrado.router) return;
  // Sin su integración, el envoltorio no haría nada: se espera a que llegue
  if (!getClient()?.getIntegrationByName?.('BrowserTracing')) return;
  const { router, rutas } = registrado;
  try {
    wrapCreateBrowserRouterV7(() => router)(rutas);
  } catch {
    return;
  }
  instrumentado = router;
  sinRomper(() => nombrarLaCarga(router, rutas));
  // Una redirección (replace) con la carga aún abierta: Sentry no la sigue
  router.subscribe((estado) => {
    if (estado.historyAction === 'REPLACE' && estado.navigation.state === 'idle') {
      sinRomper(() => nombrarLaCarga(router, rutas, { aunqueTengaRuta: true }));
    }
  });
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
