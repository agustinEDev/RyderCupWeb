/**
 * El texto de «Cargando...» cuando i18n todavia no puede darlo.
 *
 * Vive suelto porque lo necesitan las dos esperas —la de pantalla completa y la
 * de bloque— y una copia en cada una acabaria divergiendo. Va por idioma porque
 * un texto fijo en español se colaba en una pantalla en ingles, y al reves: la
 * pantalla de espera es tambien el respaldo del `Suspense` raiz, donde `t()`
 * devuelve la clave en crudo porque el namespace `common` no ha bajado.
 *
 * La etiqueta del detector no viene de una lista cerrada —sale de `i18nextLng`—,
 * asi que lo que no se reconozca cae en ingles, igual que el `fallbackLng` de la
 * configuracion.
 */
const RESPALDOS = new Map([
  ['es', 'Cargando...'],
  ['en', 'Loading...'],
]);

/**
 * @param {object} i18n El de `useTranslation`; puede faltar en las pruebas
 * @returns {string} El respaldo en el idioma activo
 */
export const respaldoDeCarga = (i18n) => {
  // `es_ES` con guion bajo es una forma que este proyecto ya ha visto —es la que
  // hacia estallar `localeCompare`—, asi que se parte por los dos separadores
  const idioma = String(i18n?.resolvedLanguage || i18n?.language || 'en')
    .split(/[-_]/)[0]
    .toLowerCase();

  // Un `Map` y no un objeto: `i18nextLng` es texto libre, y en un objeto una
  // etiqueta como `constructor` devolveria una funcion en vez de no encontrarse,
  // que React no sabe pintar
  return RESPALDOS.get(idioma) ?? RESPALDOS.get('en');
};
