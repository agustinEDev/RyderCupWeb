// Las claves de texto de los fallos de la anotación de partida rápida
// (`QuickMatchScoringPage`), en el espacio `quickMatch`.

/**
 * El `message` de un error de la API es el `detail` que escribe el backend, y
 * ese está en inglés: pintarlo tal cual metía "You are not a participant of
 * this quick match." en medio de una pantalla en español. El status sí es un
 * dato estable y traducible, así que la copia sale de él.
 *
 * Hacen falta DOS mapas porque el mismo status significa cosas distintas según
 * la operación: un 403 al cargar es "no juegas esta partida", pero un 403 al
 * anotar es "no eres el anotador de ese jugador" — decirle lo primero a alguien
 * que se está viendo en la lista de participantes es peor que no decirle nada.
 *
 * Cuál es cuál lo dice el hook, que los guarda por separado. Deducirlo de si
 * había partida en pantalla no valía: el sondeo cada 10 s falla mucho después
 * de que la partida haya cargado, y ese fallo es de carga.
 */
const LOAD_ERROR_KEY_BY_STATUS = {
  403: 'scoring.errors.forbidden',
  404: 'scoring.errors.notFound',
};

// Los endpoints de anotación devuelven 400, 403, 404, 409 y 422; el resto cae
// en el mensaje de "no se ha podido guardar", que es cierto sea cual sea la
// causa.
//
// El 400 y el 422 comparten mensaje porque son la misma queja vista desde dos
// capas: el 422 es Pydantic rechazando el cuerpo y el 400 una regla de la
// partida —hoy, la raya en Medal—. Importa para la aplicación ya instalada, que
// sigue ofreciendo ese botón hasta que actualice: sin esta línea, quien lo
// pulse en una partida Medal leería "no se ha podido guardar" en vez de que el
// resultado no vale.
const SAVE_ERROR_KEY_BY_STATUS = {
  400: 'scoring.errors.saveInvalid',
  403: 'scoring.errors.saveForbidden',
  404: 'scoring.errors.saveNotFound',
  409: 'scoring.errors.saveConflict',
  422: 'scoring.errors.saveInvalid',
};

export const loadErrorKeyFor = (error) =>
  LOAD_ERROR_KEY_BY_STATUS[error?.status] ?? 'scoring.errors.generic';

// Un error del hook puede traer su propia clave: los del almacenamiento del
// móvil no tienen estado HTTP, y por estado caían en el genérico «inténtalo de
// nuevo», que es lo contrario de lo que hay que hacer con el móvil lleno
export const saveErrorKeyFor = (error) =>
  error?.i18nKey ??
  SAVE_ERROR_KEY_BY_STATUS[error?.status] ??
  'scoring.errors.saveFailed';

// Tres explicaciones, porque son tres cosas distintas: un 409 es que la
// partida ya esta cerrada —otro dispositivo se adelanto—; sin `status` no ha
// llegado a haber respuesta, que en un campo suele ser la cobertura; y un
// 403, un 404 o un 5xx son un no del servidor que no sabemos explicar, asi
// que no se inventa ninguno.
export const claveDeFallo = (base, error) => {
  if (error?.status === 409) return `${base}.failed`;
  if (error?.status) return `${base}.failedServer`;
  // Sin error no hubo ni intento: es la guarda de creador, no la cobertura.
  if (!error) return `${base}.failedServer`;
  // OJO: un fallo de CSRF cae aqui, en «mira la conexion», porque `api.js`
  // lo lanza pelado —sin `status` ni `errorCode`, al contrario que el resto—
  // y no hay forma de distinguirlo sin tocar ese servicio, que usa toda la
  // aplicacion. Da igual de cara al usuario: ese mismo fallo arranca el
  // cierre de sesion, asi que no se queda leyendo este aviso.
  return `${base}.failedOffline`;
};
