const clave = (k) => k.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());

/**
 * La respuesta de la API con las claves en camelCase, a cualquier profundidad.
 * Solo cambian las claves: los valores (textos, enums, fechas, null) quedan
 * tal cual. Es lo que los repositorios entregan como `extras` a la capa de
 * aplicación, que así no conoce la forma de la API (antes, `_apiData`).
 *
 * @param {*} valor
 * @returns {*}
 */
export const aCamelCase = (valor) => {
  if (Array.isArray(valor)) return valor.map(aCamelCase);
  if (valor === null || typeof valor !== 'object') return valor;
  return Object.fromEntries(
    Object.entries(valor).map(([k, v]) => [clave(k), aCamelCase(v)]),
  );
};
