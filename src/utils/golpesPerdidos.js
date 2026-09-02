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
 * después no puede leer el nombre de las partidas de la persona anterior. Eso
 * se resuelve al LEER (`pendientes`), no borrando al cerrar sesión: un aviso
 * no se puede regenerar —el golpe que describe ya salió de la cola al
 * escribirlo— y el borrado llegaba a dispararse dentro del propio vaciado,
 * porque un 403 de CSRF cierra la sesión desde `api.js` en mitad del bucle.
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

/**
 * Dos avisos son el mismo si hablan del mismo golpe. Y un golpe lleva
 * participante: en una partida rápida se anota a varios jugadores desde un
 * móvil, así que del hoyo 7 hay una entrada POR PARTICIPANTE. Sin mirarlo, el
 * segundo rechazo del mismo hoyo se daba por ya apuntado, `apunta` devolvía
 * true sin escribir nada, y quien llamaba borraba el golpe igualmente: cuatro
 * golpes perdidos y un solo aviso.
 */
const esDelMismo = (aviso, matchId, holeNumber, userId, participantId) =>
  aviso.matchId === matchId
  && aviso.holeNumber === holeNumber
  && (aviso.participantId ?? null) === (participantId ?? null)
  && (aviso.userId ?? null) === (userId ?? null);

/**
 * Apunta que una anotación no se pudo guardar.
 *
 * @param {{matchId: string, matchName: string|null, matchNumber: number|null,
 *   holeNumber: number, participantId: string|null, userId: string|null}} aviso
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
    esDelMismo(a, aviso.matchId, aviso.holeNumber, aviso.userId, aviso.participantId)
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
export const olvidaEl = (matchId, holeNumber, userId = null, participantId = undefined) =>
  guarda(
    leeTodo().filter((a) => {
      if (a.matchId !== matchId || a.holeNumber !== holeNumber) return true;
      if (!esVisiblePara(a, userId)) return true;
      // Sin participante se van todos los de ese hoyo: es lo que quiere una
      // competición, donde no hay más que uno. Con participante, solo el suyo,
      // o reanotar a un jugador borraría el aviso de los otros tres
      if (participantId === undefined) return false;
      return (a.participantId ?? null) !== (participantId ?? null);
    })
  );

/** Retira todos, sea de quien sea. */
export const olvidaTodos = () => {
  try {
    localStorage.removeItem(CLAVE);
    return true;
  } catch {
    return false;
  }
};
