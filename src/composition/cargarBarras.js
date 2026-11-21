import * as barras from './barras';

/**
 * Los casos de uso de las barras (ver `./barras`). Solo los importan pantallas
 * que ya se cargan aparte (la ficha, explorar, las invitaciones), así que no
 * van en el arranque. Con `import()` en vez de un import fijo, Rolldown
 * partía en trozos nuevos lo que comparten con el arranque y este pesaba
 * ~1,5 KB más (21 nov 2026). Asíncrono para que quien lo usa no dependa de
 * cómo se carga.
 *
 * @returns {Promise<typeof import('./barras')>}
 */
export const cargarBarras = async () => barras;
