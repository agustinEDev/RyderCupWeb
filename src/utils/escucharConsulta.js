/**
 * Escucha los cambios de una consulta de `matchMedia` y devuelve cómo dejar de
 * escuchar.
 *
 * Safari anterior al 14 no tiene `addEventListener` en un `MediaQueryList`,
 * solo el `addListener` antiguo: llamar al moderno ahí lanzaba un TypeError y
 * tumbaba la pantalla que lo usara (CodeRabbit en la #747).
 */
export const escucharConsulta = (consulta, avisar) => {
  if (typeof consulta.addEventListener === 'function') {
    consulta.addEventListener('change', avisar);
    return () => consulta.removeEventListener('change', avisar);
  }
  consulta.addListener?.(avisar);
  return () => consulta.removeListener?.(avisar);
};

export default escucharConsulta;
