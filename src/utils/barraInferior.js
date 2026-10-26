/**
 * El hueco que deja la navegación inferior del móvil (QA del 21 oct 2026).
 *
 * App lo publica en `--alto-barra-inferior` sobre <html> solo mientras pinta la
 * barra; las páginas de pantalla completa lo descuentan sin preguntar por la
 * sesión, que no siempre coincide con que la barra esté (Términos pendientes,
 * rutas públicas, anotación). A partir de `md` la barra no existe.
 */
export const VARIABLE_ALTO_BARRA_INFERIOR = '--alto-barra-inferior';
// 5rem y no los 4 de la barra: el botón «Partida» sobresale por encima. Igual
// que el hueco del final de App, o las pantallas de alto completo hacían scroll
export const ALTO_BARRA_INFERIOR = 'calc(5rem + env(safe-area-inset-bottom))';
/**
 * El alto del aviso de instalar, que también flota abajo y tapaba lo último de
 * la página («Cerrar sesión» en el iPhone, QA FE #865-13). Lo publica el aviso
 * mientras se ve; el hueco del final de App lo suma.
 */
export const VARIABLE_ALTO_AVISO_INSTALAR = '--alto-aviso-instalar';
export const PANTALLA_MENOS_BARRA_INFERIOR =
  'min-h-[calc(100dvh-var(--alto-barra-inferior,0px)-var(--alto-aviso-instalar,0px))] md:min-h-[calc(100dvh-var(--alto-aviso-instalar,0px))]';
