import { aCamelCase } from './aCamelCase';

/**
 * La respuesta de la API en camelCase, o `null` si no la hay: los `extras`
 * que acompañan a una entidad hasta el assembler (antes, `_apiData`).
 *
 * @param {Object|null|undefined} apiData
 * @returns {Object<string, any>|null}
 */
export const aExtras = (apiData) => (apiData ? aCamelCase(apiData) : null);

/**
 * @template T
 * @param {T} entity
 * @param {Object|null|undefined} apiData - La respuesta de la que salió
 * @returns {{ entity: T, extras: Object<string, any>|null }}
 */
export const conExtras = (entity, apiData) => ({
  entity,
  extras: aExtras(apiData),
});

/**
 * Cada entidad con los extras de su respuesta, por posición.
 *
 * @template T
 * @param {T[]} entities
 * @param {Object[]} apiDataArray
 * @returns {Array<{ entity: T, extras: Object<string, any>|null }>}
 */
export const conExtrasLista = (entities, apiDataArray) =>
  entities.map((entity, i) => conExtras(entity, apiDataArray[i]));
