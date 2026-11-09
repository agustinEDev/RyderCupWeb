import { createBrowserRouter } from 'react-router';

/**
 * Dónde guarda `<ScrollRestoration />` las posiciones. Clave propia para poder
 * borrarla al cargar la página: con la de por defecto, recargar devolvía a la
 * posición de antes, y hoy recargar empieza arriba (revisor, FE #647 fase 3).
 */
export const CLAVE_DEL_SCROLL = 'rcf-posiciones-del-scroll';

/**
 * El router de la aplicación, con el scroll como estaba antes del router de
 * datos salvo en una cosa: volver atrás a una pantalla con `loader` te deja
 * donde estabas (FE #647, fase 3; Agustín, 2 nov 2026: «que funcione igual»).
 *
 * `<ScrollRestoration />` sube arriba en toda navegación nueva sin posición
 * guardada: también al cambiar solo el query (los filtros del admin), el `#`
 * (el mapa del hoyo) o al pulsar la pestaña en la que ya estás. Su forma de
 * evitarlo es `preventScrollReset` en cada navegación, así que aquí va por
 * defecto en todas: la librería solo actúa al volver atrás, y subir arriba al
 * cambiar de pantalla lo sigue haciendo `useVolverArriba`, como siempre.
 *
 * Ojo con los `#`: con la marca, `<ScrollRestoration />` sigue llevando a la
 * vista el elemento cuyo `id` coincida. Hoy ningún `#` de la aplicación (el
 * `#mapa` del hoyo) tiene un elemento con ese `id`; el día que lo tenga, abrirlo
 * moverá la página (segundo revisor).
 */
export const creaElRouterDeLaAplicacion = (rutas) => {
  try {
    globalThis.sessionStorage?.removeItem(CLAVE_DEL_SCROLL);
  } catch {
    // Sin almacenamiento (ventana privada): no hay nada guardado que reponer
  }
  const router = createBrowserRouter(rutas);
  const navega = router.navigate;
  // Con `??`: los `<Link>` mandan `preventScrollReset: undefined` explícito. Con
  // un número (`navigate(-1)`) el router va al historial y no mira las opciones
  router.navigate = (destino, opciones) =>
    navega(destino, { ...opciones, preventScrollReset: opciones?.preventScrollReset ?? true });
  return router;
};
