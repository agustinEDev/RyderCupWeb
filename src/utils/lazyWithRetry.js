import { lazy } from 'react';
import { olvidarLaRecarga } from './recargaDeLaBarrera';

const ESPERA_DEL_REINTENTO_MS = 1500;
const esperarMs = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * La carga de una pantalla diferida: si el `import()` falla, reintenta a los
 * 1,5 s antes de dejar el error a `LazyLoadErrorBoundary`, que recarga.
 *
 * Si carga un módulo, olvida la recarga (`recargaDeLaBarrera`): la siguiente
 * actualización vuelve a poder recargar sola. Solo con un módulo de verdad:
 * cuando `recargaPorTrozoViejo` cancela el error, Vite resuelve sin módulo y la
 * recarga está en camino; olvidarla ahí daba una segunda (revisor, 25 oct 2026).
 */
export async function cargarConReintento(importFn, esperar = esperarMs) {
  const modulo = await importFn().catch(() => esperar(ESPERA_DEL_REINTENTO_MS).then(() => importFn()));
  if (modulo) olvidarLaRecarga();
  return modulo;
}

export const lazyWithRetry = (importFn) => lazy(() => cargarConReintento(importFn));
