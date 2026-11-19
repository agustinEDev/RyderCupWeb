// Lo que la anotación de partida rápida (`QuickMatchScoringPage`) deduce de la
// partida en cada pintado. Funciones puras, sin interfaz: se llaman igual que
// antes se calculaba dentro de la página.
import { barraDe } from '../domain/services/muestrasDeLaBarra';
import { isFreePlay } from '../domain/value_objects/ScoringFormat';

/**
 * Mi barra, si es juego libre y si faltan datos de otros para la
 * clasificación.
 *
 * Si el grupo entero se anota desde este móvil —lo normal en un cuarteto con
 * invitados— no falta nada de nadie: la clasificación está completa, así que
 * ni se avisa ni se le quita el puesto a nadie.
 *
 * @param {{ quickMatch: any, userId: any, coveredParticipantIds: Array<any>, pendientes: any }} datos
 */
export const participacionEnLaRapida = ({
  quickMatch,
  userId,
  coveredParticipantIds,
  pendientes,
}) => {
  // Mi barra (color y sexo): las muestras del mapa de hoyos van por barra (16 oct)
  const yoEnLaPartida = (quickMatch?.participants ?? []).find(
    (p) => p.userId && p.userId === userId,
  );
  const miBarra = barraDe(yoEnLaPartida);
  const hayQuienNoAnoto = (quickMatch?.participants ?? []).some(
    (p) => !coveredParticipantIds.includes(p.participantId),
  );
  const esJuegoLibre = isFreePlay(quickMatch?.scoringFormat);
  const faltanDatosDeOtros = pendientes > 0 && hayQuienNoAnoto;
  return { miBarra, esJuegoLibre, faltanDatosDeOtros };
};

/**
 * El desacuerdo que se enseña ahora, si se enseña, y lo que dice su aviso.
 *
 * De una en una: dos avisos superpuestos no se pueden usar, y la siguiente no
 * se pierde porque el hook la mantiene en la lista hasta resolverla. El
 * conflicto lo destapa el sondeo, no un toque del jugador, así que puede
 * aparecer con otro aviso ya abierto. Espera su turno: dos ventanas a la misma
 * altura se tapan, y el foco guardado para volver se perdería.
 *
 * @param {{
 *   discrepancias: Array<any> | null | undefined,
 *   quickMatch: any,
 *   showCancelConfirm: boolean,
 *   showFinishConfirm: boolean,
 *   t: (clave: string) => string,
 * }} datos
 */
export const discrepanciaEnPantalla = ({
  discrepancias,
  quickMatch,
  showCancelConfirm,
  showFinishConfirm,
  t,
}) => {
  const discrepancia = discrepancias?.[0] ?? null;
  const hayDiscrepancia =
    discrepancia != null && !showCancelConfirm && !showFinishConfirm;
  const jugadorEnDisputa = discrepancia
    ? quickMatch?.participants?.find(
        (p) => p.participantId === discrepancia.participantId,
      )
    : null;
  // Una bola recogida llega sin número y significa lo contrario que no tener
  // anotación: sin esto los botones leían «Poner el mío ()»
  const comoSeLee = (valor) =>
    valor === null || valor === undefined
      ? t('scoring.offline.pickedUp')
      : valor;
  const nombreDelAnotador = discrepancia
    ? quickMatch?.participants?.find(
        (p) => p.participantId === discrepancia.anotadoPor,
      )?.name
    : null;
  return {
    discrepancia,
    hayDiscrepancia,
    jugadorEnDisputa,
    comoSeLee,
    nombreDelAnotador,
  };
};

/**
 * Los hoyos que el servidor rechazó, cada uno una vez y en orden.
 *
 * @param {Array<{ holeNumber: number }> | null | undefined} perdidos
 * @returns {number[]}
 */
export const hoyosPerdidosDe = (perdidos) =>
  [...new Set((perdidos ?? []).map((x) => x.holeNumber))].sort((a, b) => a - b);

/**
 * Si la partida ya no admite anotaciones.
 *
 * `isCancelled` cuenta igual que `isCompleted`: la partida ya no admite
 * anotaciones. Sin él, la pantalla seguía viva y cada guardado se estrellaba
 * contra un 409 que se traduce como «vuelve a cargarla» —y recargar no la
 * resucita, así que el usuario se queda reintentando para siempre—.
 * `isSubmitting` NO entra aquí: dejaba la casilla de solo lectura mientras el
 * golpe estaba de camino, y sin cobertura eso son los diez segundos que el
 * móvil tarda en rendirse. El jugador que anotaba un hoyo no podía anotar el
 * siguiente hasta que la petición del anterior muriera (FE #564). Bloquear ya
 * no protege de nada: el golpe se guarda antes de enviarse (FE #561) y el hook
 * serializa los envíos, así que una anotación que llega con otra en vuelo se
 * guarda y sale en el vaciado siguiente.
 *
 * `yaCerrada`: el sondeo puede cerrar la partida mientras el aviso está
 * abierto.
 *
 * @param {any} quickMatch
 * @param {any} isScorer
 */
export const cierreDeLaRapida = (quickMatch, isScorer) => ({
  isReadOnly: !isScorer || quickMatch?.isCompleted || quickMatch?.isCancelled,
  yaCerrada: !!quickMatch?.isCompleted || !!quickMatch?.isCancelled,
});
