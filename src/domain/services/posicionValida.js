/**
 * Una posición con coordenadas de verdad: hay GPS y extensiones que dan NaN.
 *
 * Aparte de `geometriaDelHoyo`, que la reexporta: la composición la necesita al
 * arrancar (`GetCourseLocationUseCase`) y, importándola de allí, el trozo
 * entero de la geometría del mapa entraba en el arranque (20 nov 2026).
 */
export const esPosicionValida = (posicion) =>
  Number.isFinite(posicion?.lat) &&
  Number.isFinite(posicion?.lon) &&
  Math.abs(posicion.lat) <= 90 &&
  Math.abs(posicion.lon) <= 180;
