/**
 * Copia un campo de la respuesta SOLO si viene, sin convertir su ausencia en un
 * vacío.
 *
 * La diferencia importa donde se decide algo con ella. Con `scoring_opens_at`
 * (BE #305, FE #621): vacío es «este campo no tiene coordenadas y su anotación
 * no abre sola», y ausente es «este servidor es anterior a la BE #305, y hay que
 * seguir con la regla de antes». Un `?? null` las iguala, y eso dejó sin botón
 * de anotar a TODO partido programado en cuanto el frontend se adelantó a su
 * backend.
 *
 * @param {object|null|undefined} origen - El objeto de la API
 * @param {string} clave - El campo, como lo llama la API
 * @param {string} [nombre] - Cómo se llama de este lado, si cambia
 * @returns {object} El campo listo para esparcir, o nada
 */
export const siViene = (origen, clave, nombre = clave) => (
  origen && clave in origen ? { [nombre]: origen[clave] } : {}
);
