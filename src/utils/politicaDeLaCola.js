/**
 * Qué se hace con una anotación que no llegó al servidor (FE #521).
 *
 * Vivía repetida en cada pantalla que anota, con tres formas distintas y por
 * tanto tres respuestas distintas a la misma pregunta: qué le pasa a tu golpe
 * dependía de dónde estuvieras mirando. Aquí hay una sola.
 *
 * Los dos únicos desenlaces posibles:
 *
 * - **Se guarda** para enviarlo más tarde. La cola vive en el móvil, así que
 *   el golpe sigue ahí cuando su dueño vuelva a entrar.
 * - **Se descarta**, porque el servidor ha dicho que esa anotación no entra y
 *   no va a entrar. Reintentarla en cada reconexión no la va a salvar.
 *
 * Nunca hay un tercer desenlace en el que el golpe desaparece sin más.
 */

// Los 4xx que NO son culpa de la anotación: se arreglan solos con el tiempo.
//
// El 401 es la sesión —lo normal al abrir la aplicación días después con
// golpes guardados—, y el 408 y el 429 son el momento, no el golpe. Descartar
// por cualquiera de ellos borra una anotación perfectamente buena.
const SE_ARREGLA_SOLO = new Set([401, 408, 429]);

const PRIMER_ERROR_DEL_CLIENTE = 400;
const PRIMER_ERROR_DEL_SERVIDOR = 500;

/** El código HTTP de un error, mire donde mire quien lo lanzó. */
const codigoDe = (error) => error?.status ?? error?.response?.status;

/**
 * Si esta anotación hay que guardarla para intentarlo más tarde.
 *
 * Sin código es que no llegó respuesta —sin cobertura, o el fallo de CSRF que
 * `api.js` lanza como un Error pelado—: se guarda. No se ha podido preguntar,
 * que no es lo mismo que una negativa.
 */
export const seGuardaParaDespues = (error) => {
  const codigo = codigoDe(error);
  if (codigo === undefined) return true;
  if (SE_ARREGLA_SOLO.has(codigo)) return true;
  // El resto del rango 4xx es la petición en sí: reintentarla no cambia nada
  return !(codigo >= PRIMER_ERROR_DEL_CLIENTE && codigo < PRIMER_ERROR_DEL_SERVIDOR);
};

/**
 * Si el servidor ha rechazado esta anotación de forma definitiva.
 *
 * Es exactamente lo contrario de guardarla, y se expone aparte para que quien
 * vacía la cola no tenga que negar una condición y equivocarse al hacerlo.
 */
export const esRechazoDefinitivo = (error) => !seGuardaParaDespues(error);
