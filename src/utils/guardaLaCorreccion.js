import * as offlineQueue from './scoringOfflineQueue';

/** Los campos que son golpes. `markedPlayerId` y `decidido` no se sustituyen. */
const GOLPES = ['ownScore', 'markedScore', 'score'];

/**
 * Guarda una anotación en la cola, y si el móvil no puede, no deja salir lo
 * que sustituía (FE #605).
 *
 * `enqueue` solo quita la anotación anterior de ese hoyo cuando escribe la
 * nueva. Si no puede escribir —sin espacio, ventana privada— la anterior se
 * queda, y el siguiente vaciado la manda: el servidor acaba con un valor que el
 * jugador sustituyó, sin aviso, mientras su pantalla enseña el nuevo. Un hoyo
 * vacío se ve y se pide otra vez; un golpe viejo parece bueno. Quien llama ya
 * avisa de que no se pudo guardar.
 *
 * Sale SOLO lo sustituido: los golpes que la anotación nueva cambia de valor.
 * En competición se mandan los dos golpes del hoyo cada vez, y anotar el del
 * marcado después del propio no cambia el propio; quitarlo entero perdía un
 * golpe que nadie había tocado. Lo que no cambia se reescribe sin lo
 * sustituido —más corto, así que en un móvil lleno cabe mejor que lo que no
 * cupo—, y si no queda ningún golpe, la anotación se quita.
 *
 * No va dentro de `enqueue` a propósito: al resolver un desacuerdo se reencola
 * LA MISMA anotación con la decisión puesta, y si esa escritura falla, quitar
 * la anterior perdería justo el golpe que el jugador eligió conservar. Por eso
 * lo usan los sitios que anotan, y el de resolver no.
 *
 * Se toca comparando con lo que había ANTES de intentar guardar, nunca por la
 * clave del hoyo: si entre medias entró otra corrección, esa se queda. Y si
 * esa escritura también falla no hay nada más que hacer: el aviso de que no se
 * pudo guardar ya está puesto, y es lo que pide volver a anotarlo.
 *
 * @returns {boolean|undefined} Lo que devuelve `enqueue`
 */
export const guardaLaCorreccion = (
  matchId,
  holeNumber,
  scoreData,
  participantId = null,
  userId = null,
  laPartida = {}
) => {
  const laDeEseHoyo = () => offlineQueue
    .getByMatch(matchId, userId)
    .find((e) =>
      e.holeNumber === holeNumber
      && (e.participantId ?? null) === (participantId ?? null)
      && (e.userId ?? null) === (userId ?? null));

  const anterior = laDeEseHoyo();
  const guardado = offlineQueue.enqueue(matchId, holeNumber, scoreData, participantId, userId, laPartida);
  if (guardado !== false || !anterior) return guardado;

  // Como se guarda: una clave sin valor es un golpe que no se ha anotado, no
  // una raya, y no sustituye nada (#609)
  const loNuevo = JSON.parse(JSON.stringify(scoreData ?? {}));
  const loViejo = anterior.scoreData ?? {};
  const sustituidos = GOLPES.filter((g) => g in loViejo && g in loNuevo && loNuevo[g] !== loViejo[g]);
  if (sustituidos.length === 0) return guardado;

  const ahora = laDeEseHoyo();
  const sigueSiendoLaMisma = Boolean(
    ahora
      && ahora.timestamp === anterior.timestamp
      && JSON.stringify(ahora.scoreData) === JSON.stringify(loViejo)
  );
  if (!sigueSiendoLaMisma) return guardado;

  const loQueQueda = Object.fromEntries(
    Object.entries(loViejo).filter(([campo]) => !sustituidos.includes(campo))
  );
  if (GOLPES.some((g) => g in loQueQueda)) {
    offlineQueue.enqueue(matchId, holeNumber, loQueQueda, participantId, userId, laPartida);
  } else {
    offlineQueue.remove(matchId, holeNumber, participantId, userId);
  }
  return guardado;
};
