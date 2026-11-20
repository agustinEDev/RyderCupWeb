/**
 * Una posición con coordenadas de verdad: hay GPS y extensiones que dan NaN.
 *
 * Vive aparte de `geometriaDelHoyo`, que la usa pero no la reexporta: la
 * composición la necesita al arrancar (`GetCourseLocationUseCase`) y,
 * importándola de allí, el trozo entero de la geometría del mapa entraba en el
 * arranque (20 nov 2026). Lo vigila `arranqueSinGeometriaDelMapa.test.js`.
 */
export const esPosicionValida = (posicion) =>
  Number.isFinite(posicion?.lat) &&
  Number.isFinite(posicion?.lon) &&
  Math.abs(posicion.lat) <= 90 &&
  Math.abs(posicion.lon) <= 180;
