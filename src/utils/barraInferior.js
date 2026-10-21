/**
 * El hueco que deja la navegación inferior del móvil (QA del 21 oct 2026).
 *
 * App lo publica en `--alto-barra-inferior` sobre <html> solo mientras pinta la
 * barra; las páginas de pantalla completa lo descuentan sin preguntar por la
 * sesión, que no siempre coincide con que la barra esté (Términos pendientes,
 * rutas públicas, anotación). A partir de `md` la barra no existe.
 */
export const VARIABLE_ALTO_BARRA_INFERIOR = '--alto-barra-inferior';
export const ALTO_BARRA_INFERIOR = 'calc(4rem + env(safe-area-inset-bottom))';
export const PANTALLA_MENOS_BARRA_INFERIOR = 'min-h-[calc(100dvh-var(--alto-barra-inferior,0px))] md:min-h-dvh';
