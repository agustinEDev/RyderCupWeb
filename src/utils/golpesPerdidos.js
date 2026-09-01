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
  return todos.filter((a) => (a.userId ?? null) === null || a.userId === userId);
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
  guarda(
    leeTodo().filter(
      (a) =>
        a.matchId !== matchId
          ? true
          : !((a.userId ?? null) === null || a.userId === userId)
    )
  );

/** Retira todos. Lo usa el cierre de sesión. */
export const olvidaTodos = () => {
  try {
    localStorage.removeItem(CLAVE);
    return true;
  } catch {
    return false;
  }
};
