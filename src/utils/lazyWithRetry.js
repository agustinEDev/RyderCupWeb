import { lazy } from 'react';

const ESPERA_DEL_REINTENTO_MS = 1500;
const esperarMs = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * La carga de una pantalla diferida: si el `import()` falla, reintenta a los
 * 1,5 s antes de dejar el error a `LazyLoadErrorBoundary`, que recarga.
 */
export const cargarConReintento = (importFn, esperar = esperarMs) =>
  importFn().catch(() => esperar(ESPERA_DEL_REINTENTO_MS).then(() => importFn()));

export const lazyWithRetry = (importFn) => lazy(() => cargarConReintento(importFn));
