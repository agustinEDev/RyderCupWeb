/**
 * Los golpes que ya no se pudieron guardar (FE #521).
 *
 * Cuando el servidor rechaza una anotación encolada —la partida terminó, se
 * canceló, o al jugador lo sacaron de ella— esa anotación sale de la cola para
 * no reintentarse eternamente. Pero sacarla en silencio hace desaparecer un
 * golpe sin que su dueño lo sepa, que es medio problema de la issue: aquí se
 * guarda el aviso hasta que alguien lo lea.
 *
 * Vive en `localStorage` y no en memoria porque el vaciado puede ocurrir con
 * la aplicación en cualquier pantalla, y el aviso se lee en el panel, quizá
 * después de cerrarla y volver a abrirla.
 *
 * **Todo lleva dueño**, igual que la cola: en un móvil compartido, quien entre
 * después no puede leer el nombre de las partidas de la persona anterior. Y no
 * basta con limpiar al cerrar sesión, porque los dos cierres duros —revocación
 * del dispositivo y fallo de CSRF— no pasan por ahí.
 */

const CLAVE = 'rydercup-golpes-perdidos';

const leeTodo = () => {
  try {
    const crudo = localStorage.getItem(CLAVE);
    const guardado = crudo ? JSON.parse(crudo) : [];
    return Array.isArray(guardado) ? guardado : [];
  } catch {
    return [];
  }
};

const guarda = (avisos) => {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(avisos));
    return true;
  } catch {
    // Sin sitio donde escribir no se puede avisar más tarde. Se devuelve false
    // en vez de lanzar: quien vacía tiene que poder decidir qué hacer, y sobre
    // todo tiene que poder NO borrar el golpe si su aviso no cabe
    return false;
  }
};

/** Los huérfanos son de quien esté mirando: ver `scoringOfflineQueue`. */
const esVisiblePara = (aviso, userId) =>
  (aviso.userId ?? null) === null || aviso.userId === userId;

const esDelMismo = (aviso, matchId, holeNumber, userId) =>
  aviso.matchId === matchId
  && aviso.holeNumber === holeNumber
  && (aviso.userId ?? null) === (userId ?? null);

/**
 * Apunta que una anotación no se pudo guardar.
 *
 * @param {{matchId: string, matchName: string|null, holeNumber: number, userId: string|null}} aviso
 * @returns {boolean} Si de verdad quedó apuntado. **Hay que mirarlo**: si no
 *   cupo, el golpe no puede borrarse de la cola, o desaparecería sin dejar ni
 *   el aviso.
 */
export const apunta = (aviso) => {
  const avisos = leeTodo();
  // El duplicado se mira TAMBIÉN por dueño: sin eso, el aviso de una persona
  // se tragaba el de otra sobre el mismo hoyo de la misma partida, y a la
  // segunda se le decía que había quedado registrado cuando no
  const yaEstaba = avisos.some((a) =>
    esDelMismo(a, aviso.matchId, aviso.holeNumber, aviso.userId)
  );
  if (yaEstaba) return true;

  return guarda([...avisos, { ...aviso, cuando: Date.now() }]);
};

/**
 * Los avisos de esta persona, pendientes de leer.
 *
 * Sin `userId` se devuelven todos: es lo que necesita el cierre de sesión, y
 * también lo que hace que los avisos guardados antes de que existiera este
 * campo se sigan viendo.
 */
export const pendientes = (userId = null) => {
  const todos = leeTodo();
  if (userId == null) return todos;
  return todos.filter((a) => esVisiblePara(a, userId));
};

/**
 * Retira los avisos de una partida cuando ya se le han enseñado a quien los
 * tenía que ver.
 *
 * Con dueño, y por el mismo motivo que todo lo demás: descartar los tuyos no
 * puede llevarse por delante los de otra persona que todavía no los ha leído.
 * Los huérfanos se van con quien los descarte, que es lo único que se puede
 * hacer con ellos.
 */
export const olvidaLosDe = (matchId, userId = null) =>
  guarda(leeTodo().filter((a) => a.matchId !== matchId || !esVisiblePara(a, userId)));

/**
 * Retira el aviso de UN hoyo: su dueño acaba de volver a anotarlo, así que ya
 * no hay nada perdido que contarle.
 */
export const olvidaEl = (matchId, holeNumber, userId = null) =>
  guarda(
    leeTodo().filter(
      (a) => !(a.matchId === matchId && a.holeNumber === holeNumber && esVisiblePara(a, userId))
    )
  );

/**
 * Retira los avisos de una cuenta. Lo usan las TRES salidas de la sesión: el
 * cierre normal, el fallo de CSRF y la revocación del dispositivo.
 *
 * Solo los suyos y los huérfanos. Borrarlo todo con un `removeItem` se lleva
 * por delante los avisos sin leer de la otra cuenta de un móvil compartido, y
 * esos **no se pueden regenerar**: el golpe que describen ya se borró de la
 * cola al escribirlos. Sin `userId` no se puede distinguir, y entonces sí se
 * va todo: es la única lectura posible de «no sé de quién es esta sesión».
 */
export const olvidaLosDeLaCuenta = (userId = null) => {
  if (userId == null) return olvidaTodos();
  return guarda(leeTodo().filter((a) => !esVisiblePara(a, userId)));
};

/** Retira todos, sea de quien sea. */
export const olvidaTodos = () => {
  try {
    localStorage.removeItem(CLAVE);
    return true;
  } catch {
    return false;
  }
};
