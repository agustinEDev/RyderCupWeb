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

/**
 * Si el fallo no es de ESTA anotación, sino de la sesión o del servidor
 * entero: mientras siga así, cualquier otra fallaría igual.
 *
 * Sirve para decidir si se para el vaciado o se sigue con la siguiente. Sin
 * esto, un 403 de CSRF —que `api.js` responde cerrando la sesión y redirigiendo
 * a la fuerza— se repetía una vez por golpe guardado: doce peticiones
 * condenadas y doce cierres de sesión antes de que la navegación llegara a
 * ocurrir. Y un 503 durante un despliegue reintentaba la cola entera en cada
 * vuelta a la aplicación, sin espera de ningún tipo.
 *
 * Un `Error` pelado que NO sea el de CSRF es lo contrario: lo lanza el caso de
 * uso al validar, antes de enviar, y habla solo de esa anotación. Ese no puede
 * parar la cola, o una entrada mala a la cabeza dejaría sin enviar los golpes
 * de todas las demás partidas para siempre.
 */
export const esFalloDeTodaLaSesion = (error) => {
  if (error?.errorCode === 'CSRF_VALIDATION_FAILED') return true;
  const codigo = codigoDe(error);
  if (codigo === undefined) return false;
  return seGuardaParaDespues(error);
};

/**
 * Si la petición no llegó a tener respuesta del servidor.
 *
 * Sirve para decidir si se sigue vaciando la cola: sin red no tiene sentido
 * intentar la siguiente. **No es lo mismo que `sinCobertura.esFalloDeRed`**, y
 * por eso no se reutiliza: aquella responde «qué le enseño al usuario» y
 * cuenta `navigator.onLine === false` como motivo suficiente; esta responde
 * «paro el bucle», donde ese dato no vale —el navegador puede decir que hay
 * red mientras la petición muere igual— y donde equivocarse cuesta golpes.
 *
 * El patrón de mensajes es corto a propósito. Con `/red/` dentro, un «Marked
 * player ID is required» se leía como caída de red —por «requi-RED»— y paraba
 * el vaciado de toda la cola.
 */
export const noLlegoAlServidor = (error) => {
  if (codigoDe(error)) return false;
  if (error?.errorCode === 'CSRF_VALIDATION_FAILED') return false;
  if (error instanceof TypeError) return true;
  return /failed to fetch|networkerror|network error|load failed/i.test(error?.message ?? '');
};
