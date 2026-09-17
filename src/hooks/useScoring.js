import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getScoringViewUseCase,
  submitHoleScoreUseCase,
  submitScorecardUseCase,
  concedeMatchUseCase,
} from '../composition';
import { seGuardaParaDespues } from '../utils/politicaDeLaCola';
import { apartaLaRechazada, avisoTrasElVaciado, vaciaAnotaciones } from '../services/vaciaAnotaciones';
import { errorDeGuardado } from '../utils/erroresDeAnotacion';
// Lo último que se supo del partido, para poder anotar sin cobertura al reabrir
// (FE #614). El mismo servicio que usa partida rápida desde la FE #524
import { loQueSeSupo, olvida, recuerda } from '../services/loUltimoConocido';
import { guardaLaCorreccion } from '../utils/guardaLaCorreccion';
import * as golpesPerdidos from '../utils/golpesPerdidos';
import * as offlineQueue from '../utils/scoringOfflineQueue';
import * as sessionLock from '../utils/scoringSessionLock';

const POLL_INTERVAL = 10000; // 10 seconds
const SESSION_REFRESH_INTERVAL = 30000; // 30 seconds

// El golpe de competición es un objeto —propio, marcado y a quién—, no un
// número como en partida rápida: se compara entero
const mismoGolpe = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// La respuesta de un envío trae la vista entera, pero a veces sin hoyos: se
// conservan los que había (resiliencia ante ese fallo del backend). Una sola
// vez, porque la pintan el envío directo y el vaciado
const conHoyosDe = (vista, antes) => ({
  ...vista,
  holes: vista.holes?.length > 0 ? vista.holes : (antes?.holes || []),
});

// Si una anotación guardada queda superada por lo que se acaba de enviar: es
// anterior, o es esa misma. Una posterior es una corrección hecha con la
// petición en vuelo, y esa NO. Una sola regla para retirar lo que llegó y para
// apartar lo rechazado: con dos, una anotación vieja se retiraba en un camino
// y en el otro se quedaba para reenviarse. El empate de reloj lo decide el
// golpe: dos anotaciones caen en el mismo milisegundo más a menudo de lo que
// parece, y comparando solo la hora se borraba la corrección
const estaSuperada = (guardada, loEnviado) => {
  const cuando = guardada.timestamp ?? 0;
  if (cuando < loEnviado.cuando) return true;
  return cuando === loEnviado.cuando && mismoGolpe(guardada.scoreData, loEnviado.scoreData);
};

/**
 * Central hook for live scoring.
 * Manages scoring state, polling, auto-save, offline queue, and session lock.
 *
 * @param {string} matchId
 * @param {string} currentUserId
 * @returns {Object} Scoring state and actions
 */
export const useScoring = (matchId, currentUserId, isAdmin = false) => {
  const [scoringView, setScoringView] = useState(null);
  const [currentHole, setCurrentHole] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [matchSummary, setMatchSummary] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isSessionBlocked, setIsSessionBlocked] = useState(false);
  const [pendingQueueSize, setPendingQueueSize] = useState(0);
  // Por qué se paró el último vaciado, si fue por el almacenamiento del móvil
  // (ver `PARO`). Estado PROPIO y no `error`: el sondeo pone `error` a null
  // cada diez segundos al cargar bien la vista, así que un aviso puesto ahí
  // duraba lo que tardaba la siguiente respuesta —y en el propio vaciado, ni
  // eso: se ponía y tres líneas después el refetch lo quitaba—. Esto solo lo
  // toca el vaciado, y solo se quita cuando otro vaciado termina sin ese paro
  const [avisoDelVaciado, setAvisoDelVaciado] = useState(null);

  // eslint-disable-next-line react-hooks/purity -- pre-existing pattern surfaced by eslint-plugin-react-hooks 7.1.1 bump; needs dedicated review (tracked in follow-up)
  const sessionIdRef = useRef(`${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const pollIntervalRef = useRef(null);
  const sessionRefreshRef = useRef(null);

  // Determine if user is a player in this match
  const isMatchPlayer = scoringView?.players?.some(p => p.userId === currentUserId) ?? false;

  // Admins can score any match even if not enrolled as a player
  const canScore = isMatchPlayer || isAdmin;

  // Determine if scorecard already submitted by current user
  const hasSubmitted = scoringView?.scorecardSubmittedBy?.includes(currentUserId) ?? false;

  // Find the current user's marker assignment
  const myAssignment = scoringView?.markerAssignments?.find(
    ma => ma.scorerUserId === currentUserId
  );

  // Who do I mark (to check if the person I mark has submitted)
  const markedPlayerId = myAssignment?.marksUserId;
  const markedPlayerHasSubmitted = markedPlayerId
    ? (scoringView?.scorecardSubmittedBy?.includes(markedPlayerId) ?? false)
    : false;

  // Own scores locked after I submit my scorecard
  const isOwnScoreLocked = hasSubmitted;

  // Marker scores locked only when the person I mark has submitted their scorecard
  const isMarkerScoreLocked = markedPlayerHasSubmitted;

  // Fully locked = both my own scores and marker scores are locked.
  // Must use markedPlayerHasSubmitted (the player I mark), not whoever marks ME —
  // in FOURBALL/FOURSOMES marking is a non-reciprocal 4-cycle (A1 marks B1, but is
  // marked by B2), so those are different people and mixing them up read-only-locks
  // the whole input as soon as MY marker submits, even while the player I still mark
  // has an unresolved discrepancy — leaving no one able to fix it.
  const isFullyLocked = isOwnScoreLocked && isMarkerScoreLocked;

  // My line on every hole, in hole order
  const myHoleScores = scoringView?.scores?.map(
    s => s.playerScores?.find(ps => ps.userId === currentUserId)
  ) ?? [];

  // Count validated holes
  const validatedHoles = myHoleScores.filter(ps => ps?.validationStatus === 'match').length;

  // A hole counts as played when EITHER side has put a score on my line: a
  // decided match leaves the rest unplayed on purpose, but a hole my marker
  // scored and I did not is a hole I still owe. Reading `ownSubmitted` alone
  // hid exactly that hole — and once the card is in, `isOwnScoreLocked` makes
  // the input read-only and the API drops a late own score without an error
  // (`submit_hole_score_use_case.py`, `if not own_score_locked`), so the hole
  // would be lost for good and fall out of the match result.
  const playedHoles = myHoleScores.filter(ps => ps?.ownSubmitted || ps?.markerSubmitted);
  const everyPlayedHoleValidated =
    playedHoles.length > 0 && playedHoles.every(ps => ps.validationStatus === 'match');

  // Always allow navigating all 18 holes, even if match decided early
  const totalHoles = 18;

  // A match play match ends as soon as one side is more holes up than there are
  // holes left, and the backend accepts that card: SubmitScorecardUseCase only
  // requires the holes that WERE played to be validated. Asking for all 18 here
  // left the "Partido Decidido" dialog offering a "Continuar para Enviar"
  // button with nothing behind it, so a decided match could never be signed off
  // by its players.
  const canSubmitScorecard =
    canScore &&
    !hasSubmitted &&
    (scoringView?.isDecided ? everyPlayedHoleValidated : validatedHoles >= totalHoles);

  // What the confirmation dialog counts against: in a decided match the card is
  // complete at the hole it ended on, so "12/18" would read as unfinished
  const holesToSubmit = scoringView?.isDecided ? playedHoles.length : totalHoles;

  // --- Fetch scoring view ---
  /**
   * Cuántas anotaciones de esta partida quedan por enviar, contando solo las
   * que este vaciado sabe mandar: las que llevan participante son de una
   * partida rápida y aquí se dejan estar, así que contarlas dejaba el número
   * en algo distinto de cero para siempre (FE #515).
   */
  /**
   * Cómo se identifica esta partida en el aviso de golpes sin enviar (FE #521).
   *
   * El campo Y el número, porque una jornada juega varios partidos en el mismo
   * campo: solo con el nombre del campo el panel enseña dos avisos idénticos.
   * Van como datos crudos y los redacta la traducción — componer aquí un
   * «Partido 3 · La Herrería» congelaría texto español en el almacenamiento,
   * y seguiría en español para quien tenga la aplicación en inglés.
   *
   * Se guarda en una ref y no se deriva de `scoringView`: el sondeo lo
   * reemplaza cada 10 s, y colgar de él un `useCallback` reconstruía
   * `submitScore` seis veces por minuto en la pantalla más caliente.
   */
  const laPartidaRef = useRef({ matchName: null, matchNumber: null });
  useEffect(() => {
    // Solo si la vista ES de esta partida: la ruta no lleva `key` y la vista
    // no se vacía al cambiar de partida, así que al ir de A a B hay un render
    // con `matchId` de B y la vista de A. Sin esta guarda se le ponía a B el
    // nombre de A, y como el nombre no se pisa, para siempre
    const esDeEsta = Boolean(matchId) && scoringView?.matchId === matchId;
    laPartidaRef.current = esDeEsta
      ? {
        matchName: scoringView?.roundInfo?.golfCourseName ?? null,
        matchNumber: scoringView?.matchNumber ?? null,
      }
      : { matchName: null, matchNumber: null };
    // Y se le pone nombre a lo que se guardó sin él: en un arranque en frío
    // sin cobertura esta vista no llega nunca, así que todo lo anotado ese día
    // quedó sin nombre y el panel enseñaba «una partida anterior». En cuanto
    // la vista carga, aunque sea al día siguiente, se rellena (FE #551). A la
    // cola y a los avisos de golpes perdidos: un aviso apartado antes de que
    // llegara la vista ya no está en la cola, y sin esto se quedaba sin nombre
    if (esDeEsta && (laPartidaRef.current.matchName || laPartidaRef.current.matchNumber != null)) {
      offlineQueue.ponleNombre(matchId, laPartidaRef.current);
      golpesPerdidos.ponleNombre(matchId, laPartidaRef.current);
    }
  }, [matchId, scoringView?.matchId, scoringView?.roundInfo?.golfCourseName, scoringView?.matchNumber]);

  const pendientesPropias = useCallback(
    () => offlineQueue.getByMatch(matchId, currentUserId).filter((e) => e.participantId == null).length,
    [matchId, currentUserId]
  );

  /**
   * Lo que se ve de cada hoyo: lo del servidor con lo guardado en la cola encima
   * (FE #606), como `holeScoresVisibles` en partida rápida.
   *
   * Desde la FE #601 el golpe entra en la cola ANTES de enviarse y sale al llegar
   * o al rechazarse, así que la cola es justo «lo anotado que el servidor aún no
   * tiene». Antes lo hacía una copia en la pantalla que nunca se vaciaba: un golpe
   * rechazado seguía pintándose y el servidor no volvía a mandar sobre ese hoyo.
   *
   * Se lee en cada render, como allí: memorizarlo pedía saber cuándo cambia la
   * cola. Lo validado y la entrega de la tarjeta NO salen de aquí sino del
   * servidor: un golpe que no ha llegado no lo ha validado nadie.
   */
  const scoresVisibles = (() => {
    // Solo si la vista ES de este partido: al ir de uno a otro hay renders con el
    // nuevo y la vista del anterior, y juntarla con la cola del nuevo mezclaba los dos
    const delServidor = scoringView?.matchId === matchId
      ? (scoringView.scores ?? [])
      : [];
    if (!matchId) return delServidor;
    // Las que llevan participante son de partida rápida
    const guardadas = offlineQueue
      .getByMatch(matchId, currentUserId)
      .filter((e) => e.participantId == null);
    if (guardadas.length === 0) return delServidor;

    // Qué pone encima cada anotación. Guarda solo lo que se puso: un campo sin
    // valor no tapa lo que tiene el servidor
    const encimas = guardadas.flatMap((entrada) => {
      const { ownScore, markedPlayerId, markedScore } = entrada.scoreData ?? {};
      return [
        ...(ownScore !== undefined && currentUserId
          ? [{ hoyo: entrada.holeNumber, jugador: currentUserId, campo: 'ownScore', valor: ownScore, marca: 'ownSubmitted' }]
          : []),
        ...(markedScore !== undefined && markedPlayerId
          ? [{ hoyo: entrada.holeNumber, jugador: markedPlayerId, campo: 'markerScore', valor: markedScore, marca: 'markerSubmitted' }]
          : []),
      ];
    });
    if (encimas.length === 0) return delServidor;

    // Si la cola dice lo mismo que ya tiene el servidor, su validación sigue
    // valiendo. Y si no, ya no: la coincidencia entre anotadores era con otro
    // golpe. El neto propio, por lo mismo, es del golpe de antes
    const conEncima = (fila, encima) => (
      fila[encima.marca] && fila[encima.campo] === encima.valor
        ? fila
        : {
          ...fila,
          [encima.campo]: encima.valor,
          [encima.marca]: true,
          validationStatus: 'pending',
          ...(encima.campo === 'ownScore' ? { netScore: null } : {}),
        }
    );

    const hoyos = [...new Set([...delServidor.map((s) => s.holeNumber), ...encimas.map((e) => e.hoyo)])];
    return hoyos.map((holeNumber) => {
      const delHoyo = delServidor.find((s) => s.holeNumber === holeNumber) ?? { holeNumber, playerScores: [] };
      const suyas = encimas.filter((e) => e.hoyo === holeNumber);
      if (suyas.length === 0) return delHoyo;
      const filas = delHoyo.playerScores ?? [];
      const jugadores = [...new Set([...filas.map((p) => p.userId), ...suyas.map((e) => e.jugador)])];
      return {
        ...delHoyo,
        playerScores: jugadores.map((userId) =>
          suyas
            .filter((e) => e.jugador === userId)
            .reduce(conEncima, filas.find((p) => p.userId === userId) ?? { userId })
        ),
      };
    });
  })();

  // Una vista más vieja que otra ya aplicada no puede aplicarse después: traería
  // el hoyo como estaba y pisaría lo que acaba de entrar. Cada petición de la
  // vista toma un número al salir; al aplicarse, ese número pasa a ser «lo último
  // aplicado», y lo mismo cuando llega un envío, cuya respuesta ya trae el golpe.
  // Se descarta solo lo más viejo que eso (FE #606; partida rápida, FE #607):
  // - NO «salió otra después», como hace partida rápida: aquí se sondea cada 10 s
  //   sin esperar al anterior y las peticiones no tienen tope, así que con mala
  //   cobertura cada respuesta llegaría con otra ya en camino y la vista no se
  //   movería nunca
  // - NI solo «salió antes del último envío»: con dos sondeos solapados, el viejo
  //   llegando detrás del nuevo hacía retroceder la vista
  const relojRef = useRef(0);
  const ultimaAplicadaRef = useRef(0);
  const marcaEscritura = useCallback(() => {
    ultimaAplicadaRef.current = ++relojRef.current;
  }, []);

  // El partido que está en pantalla AHORA. La ruta no lleva `key`, así que ir de
  // un partido a otro reutiliza este hook con las peticiones del anterior aún en
  // camino: lo que conteste tarde no se pinta en el nuevo, ni cuenta como lo último
  // aplicado, que haría descartar la vista del nuevo. Como `idVigenteRef` en
  // partida rápida
  const partidaVigenteRef = useRef(matchId);
  useEffect(() => {
    partidaVigenteRef.current = matchId;
  }, [matchId]);
  const esDeOtraPartida = useCallback((id) => id !== partidaVigenteRef.current, []);

  // Si lo que hay en pantalla salió de la foto del móvil y no del servidor. La
  // pantalla lo dice en ámbar: sin esto se pintaba la vista entera —resultado,
  // tarjeta, botón de entregar— como si fuera lo de ahora mismo, y con un 5xx eso
  // pasa CON cobertura, donde nadie sospecha nada. Como `pintadoDeMemoria` en
  // partida rápida
  // De qué partido es la foto que se está pintando, o `null` si lo que se ve
  // viene del servidor. Guarda el identificador y no un booleano por lo mismo que
  // `vistaDeRef`: así el aviso del partido anterior no se hereda sin tener que
  // reiniciarlo en un efecto, y la comparación de la que sale se hace entre dos
  // valores normales —estado y prop—, sin leer una referencia en el render, que
  // es lo que prohíbe `react-hooks/refs`
  const [memoriaDe, setMemoriaDe] = useState(null);

  // Si hay algo pintado ya, sea del servidor o de la foto. Lo guardado sirve para
  // ARRANCAR sin señal, no para corregir una pantalla que ya funciona, y con el
  // estado no se puede mirar: meter `scoringView` en las dependencias de la
  // petición la recrearía en cada cambio de vista y reiniciaría el sondeo. Como
  // `hayPartidaRef` en partida rápida
  // De QUÉ partido es lo que hay pintado, no un simple «hay algo». Con un
  // booleano había que reiniciarlo al cambiar de partido —si no, la vista del
  // anterior contaba como pintada y bloqueaba la foto del nuevo, que se quedaba
  // con los hoyos del viejo bajo su URL (CodeRabbit en la PR #616)— y ese
  // reinicio tiene que vivir en un efecto, que es justo lo que
  // `react-hooks/immutability` prohíbe para un valor que también se escribe en
  // la petición. Guardando el identificador no hay nada que sincronizar: la
  // pregunta «¿hay vista de ESTE partido?» se responde comparando
  const vistaDeRef = useRef(null);

  const fetchScoringView = useCallback(async () => {
    if (!matchId) return;
    const salio = ++relojRef.current;
    const esVieja = () => esDeOtraPartida(matchId) || salio < ultimaAplicadaRef.current;
    try {
      const data = await getScoringViewUseCase.execute(matchId);
      if (esVieja()) return;
      ultimaAplicadaRef.current = salio;
      setScoringView(data);
      setError(null);
      setMemoriaDe(null);
      vistaDeRef.current = matchId;
      // La foto de lo último que se supo, para poder anotar al reabrir la
      // aplicación en el campo (FE #614). Va DESPUÉS de la guarda: una respuesta
      // vieja no pinta, así que tampoco puede guardarse. Solo lo que dio el
      // backend, como en partida rápida; aquí basta con una cosa porque esta
      // vista ya trae hoyos, pares, jugadores y golpes en la misma respuesta.
      // Si no cabe, `recuerda` devuelve `false` y no pasa nada más: el sitio es
      // compartido con la cola de golpes sin enviar, y perder eso sí sería grave.
      //
      // Solo las partidas que se juegan: las tres plazas que caben se comparten
      // con partida rápida, y mirar dos partidos ajenos desde el calendario
      // desalojaba la foto de la propia, que es la que hace falta en el campo.
      // Sale de la RESPUESTA y no de `isMatchPlayer`, que se deriva del estado y
      // en la primera carga todavía va vacío
      const laJuego = data.players?.some((p) => p.userId === currentUserId);
      if (laJuego) recuerda(matchId, { partida: data, campo: null });
    } catch (err) {
      const estado = err?.status ?? err?.response?.status;
      // Una respuesta CON estado es una respuesta: si el servidor dice que ese
      // partido no está —o que no es tuyo— pintarlo desde el móvil sería enseñar
      // algo que no existe, y dejar anotar encima
      if ((estado === 404 || estado === 403) && !esVieja()) olvida(matchId);
      // El 401 no borra la foto AQUÍ, pero que sobreviva no se puede prometer: si
      // la sesión ha caducado de verdad, el interceptor cierra sesión antes de que
      // esto corra y `olvidaLoDeEstaCuenta` la borra y cierra el almacén. Esta
      // rama cubre los 401 que llegan sin cierre —sin sesión guardada no se
      // intenta refrescar, y uno que no se clasifica como caducidad se relanza—.
      // Un 5xx no desmiente nada —el backend está mal, el partido sigue ahí— y es
      // justo cuando lo guardado hace falta
      const desmentido = estado === 401 || estado === 403 || estado === 404;
      // Solo si no hay NADA en pantalla: lo guardado sirve para ARRANCAR sin
      // señal, no para corregir una pantalla que ya está funcionando
      if (!desmentido && !esVieja() && vistaDeRef.current !== matchId) {
        const recordado = loQueSeSupo(matchId);
        if (recordado?.partida) {
          setScoringView(recordado.partida);
          vistaDeRef.current = matchId;
          // Y que se sepa: la pantalla lo dice en ámbar. Con un 5xx esto ocurre
          // CON cobertura, donde nadie sospecha que está viendo una foto de antes
          setMemoriaDe(matchId);
        }
      }
      if (!isOffline && !esVieja()) {
        setError(err);
      }
    } finally {
      setIsLoading(false);
    }
    // `currentUserId` entra porque la guarda de arriba lo lee: solo se guarda la
    // foto de las partidas que juegas. Recrea la petición —y reinicia el sondeo—
    // al cambiar de cuenta, que es lo que se quiere: la cola es por dueño desde
    // la FE #521, y la foto también
  }, [matchId, isOffline, esDeOtraPartida, currentUserId]);

  // --- Un escritor a la vez: el envío o el vaciado (FE #601) ---
  // El golpe se guarda en la cola ANTES de enviarlo, así que un vaciado que
  // arrancara con el envío en vuelo lo leería y lo mandaría otra vez; y un
  // envío lanzado con el vaciado en marcha podía llegar antes que lo viejo del
  // mismo hoyo y quedar pisado por ello. Quien llega con el otro dentro no
  // manda: el envío solo guarda y el vaciado no arranca, y lo dejan apuntado en
  // `aplazadoRef` para que quien lo tiene dé una pasada al terminar. Hace falta
  // porque competición no vacía en el sondeo, como partida rápida: sin esa
  // pasada, lo aplazado esperaba a que el jugador saliera y volviera
  const ocupadoRef = useRef(null);
  // Qué anotación no se pudo guardar, y en qué turno (FE #605). Un envío que
  // salió ANTES y acaba sin llegar no puede retirar ese aviso: es de una
  // corrección posterior del mismo hoyo, y lo guardado de antes ya salió de la
  // cola, así que sin aviso el hoyo se quedaba vacío sin que nadie lo dijera.
  // Si llega, no hace falta: la vista que se pide después retira cualquier
  // aviso, como siempre. Un contador y no la hora: la de la cola y la de aquí
  // no son el mismo reloj
  const anotacionRef = useRef(0);
  const noSeGuardoRef = useRef(null);
  const aplazadoRef = useRef(false);

  // --- Process offline queue ---
  const vaciaLaDeEstaPartida = useCallback(async () => {
    // La política —qué se manda, qué se aparta, qué para el bucle— vive en un
    // solo sitio (FE #551). Aquí solo se dice CUÁLES son las de esta pantalla
    // y CÓMO se mandan. Cuando esto era una copia del bucle, le faltaban dos
    // guardas que el de fondo sí tenía, y perdía correcciones del jugador
    const unaPasada = () =>
      vaciaAnotaciones({
        entradas: offlineQueue.getByMatch(matchId, currentUserId),
        // Lo que llega se pinta YA, con su respuesta, antes de que salga de la
        // cola (FE #606): esperar a la vista del final dejaba ese hoyo sin golpe
        // en pantalla —ni en la cola ni en la vista— mientras la pasada seguía
        // con los demás, que con mala cobertura son segundos. Y cuenta como lo
        // último aplicado, para que un sondeo de antes no lo deshaga
        manda: async (entrada) => {
          const vista = await submitHoleScoreUseCase.execute(entrada.matchId, entrada.holeNumber, entrada.scoreData);
          if (!vista?.matchId || esDeOtraPartida(entrada.matchId)) return;
          marcaEscritura();
          setScoringView((prev) => conHoyosDe(vista, prev));
        },
        // Una anotación con participante es de una partida rápida: va por otro
        // endpoint y con otro cuerpo, así que enviarla desde aquí la guardaría
        // mal y la borraría a continuación (FE #515)
        seSalta: (entrada) => entrada.participantId != null,
        // Las huérfanas se rescatan desde aquí, y su aviso tiene que quedar a
        // nombre de quien las rescató: sin dueño lo ve toda cuenta del móvil
        dueñoSiNoLoTiene: currentUserId ?? null,
      });
    let resultado = await unaPasada();
    // Lo que el jugador corrigió MIENTRAS iba la pasada se quedó sin mandar:
    // el bucle no manda un valor que no leyó al empezar. Aquí no hay nada que
    // mirar antes de mandarlo —en competición no se pregunta por desacuerdos—,
    // así que se da una pasada más, que lo relee. Una y no un bucle: cada
    // corrección nueva tendrá su propio disparador, y sin tope un jugador
    // corrigiendo sin parar lo mantenía vivo
    if (resultado.cambiadas > 0 && resultado.paroPor === null) {
      resultado = await unaPasada();
    }
    // Si el vaciado paró porque el móvil no admite escrituras, el resto de la
    // vuelta no ha salido y no hay nadie que lo reintente: el vaciado de fondo
    // deja fuera a propósito la partida que se está anotando. Callarlo deja al
    // jugador mirando un contador que no baja, sin saber por qué. Y no lo
    // quita una pasada que paró por la red: esa no sabe nada del disco
    setAvisoDelVaciado((antes) => avisoTrasElVaciado(antes, resultado.paroPor));
    setPendingQueueSize(pendientesPropias());
    await fetchScoringView();
    return resultado.paroPor;
  }, [matchId, fetchScoringView, pendientesPropias, currentUserId, marcaEscritura, esDeOtraPartida]);

  // Un solo vaciado a la vez. Ahora hay tres disparadores —montar, `online` y
  // volver a la aplicación— y llegan juntos: al entrar desde el aviso del
  // panel, el de montar y el de visibilidad caen en el mismo instante. Sin
  // esto, el segundo lee la cola todavía sin vaciar y reenvía los mismos hoyos
  const processQueue = useCallback(async () => {
    if (ocupadoRef.current) {
      // Otro vaciado ya está leyendo esta cola. Con un envío en vuelo, en
      // cambio, se aplaza: lo relanza él cuando el servidor conteste
      if (ocupadoRef.current === 'envio') aplazadoRef.current = true;
      return;
    }
    ocupadoRef.current = 'vaciado';
    try {
      let paroPor;
      do {
        aplazadoRef.current = false;
        paroPor = await vaciaLaDeEstaPartida();
        // Lo anotado mientras iba esta pasada solo se guardó, y puede ser un
        // hoyo que la pasada no llegó a leer. Otra más, salvo que se parara
        // por la red o por el disco: eso no se arregla insistiendo
      } while (aplazadoRef.current && paroPor === null && pendientesPropias() > 0);
    } finally {
      ocupadoRef.current = null;
    }
  }, [vaciaLaDeEstaPartida, pendientesPropias]);

  // Lo guardado de este jugador para ese hoyo. Sin participante: las que lo
  // llevan son de partida rápida
  const loGuardadoDe = useCallback(
    (holeNumber) => offlineQueue.getByMatch(matchId, currentUserId).find(
      (e) => e.holeNumber === holeNumber
        && e.participantId == null
        && (e.userId ?? null) === (currentUserId ?? null)
    ),
    [matchId, currentUserId]
  );

  // Tras llegar un envío sobra lo que quedaba guardado de ese hoyo y ya está
  // superado: lo anterior —también una huérfana de antes de que la cola
  // guardara dueño— y lo propio. Lo que NO sobra es una corrección hecha con la
  // petición en vuelo, que sale en la pasada siguiente
  const borraLoSuperado = useCallback(
    (holeNumber, loEnviado) => {
      const superadas = offlineQueue
        .getByMatch(matchId, currentUserId)
        .filter((e) => e.holeNumber === holeNumber && e.participantId == null)
        .filter((e) => estaSuperada(e, loEnviado));
      for (const guardada of superadas) {
        offlineQueue.remove(matchId, holeNumber, null, guardada.userId ?? null);
      }
    },
    [matchId, currentUserId]
  );

  // --- Submit hole score ---
  // Allow submission if own scores OR marker scores are still editable
  const submitScore = useCallback(async (holeNumber, scoreData) => {
    if (!matchId || !canScore) return;
    if (isOwnScoreLocked && isMarkerScoreLocked) return;
    const estaAnotacion = ++anotacionRef.current;
    const avisaQueNoSeGuardo = () => {
      noSeGuardoRef.current = { holeNumber, anotacion: estaAnotacion };
      setError(errorDeGuardado(holeNumber));
    };
    const hayUnFalloPosterior = () =>
      noSeGuardoRef.current?.holeNumber === holeNumber && noSeGuardoRef.current.anotacion > estaAnotacion;

    // El aviso de «no se pudo guardar» de este hoyo se retira, pero SOLO
    // cuando el reemplazo está a salvo: enviado, o guardado en la cola. Se
    // hacía aquí arriba y era un error — si el reemplazo lo rechazan también,
    // o el móvil no tiene sitio para encolarlo, el jugador se quedaba sin
    // golpe Y sin aviso, que es justo lo que esta issue existe para impedir
    const yaNoSePierde = () => golpesPerdidos.olvidaEl(matchId, holeNumber, currentUserId);

    // Sin cobertura, o con otro escritor dentro, solo se guarda. Lo segundo
    // queda apuntado para la pasada que dé quien lo tiene al terminar
    if (isOffline || ocupadoRef.current) {
      if (ocupadoRef.current) aplazadoRef.current = true;
      const guardado = guardaLaCorreccion(
        matchId,
        holeNumber,
        scoreData,
        null,
        currentUserId,
        laPartidaRef.current
      );
      setPendingQueueSize(pendientesPropias());
      if (guardado === false) {
        // Sin cobertura Y sin sitio donde guardarlo: el golpe no existe en
        // ninguna parte, y eso hay que decirlo
        avisaQueNoSeGuardo();
      } else {
        // Y se retira el aviso anterior si lo había: sin esto, un hoyo que no
        // se pudo guardar dejaba el cartel puesto el RESTO de la vuelta,
        // mientras los siguientes se guardaban bien. Sin cobertura no hay
        // ninguna otra ocasión de limpiarlo —el sondeo no corre—, así que el
        // jugador reanotaba hoyos creyendo que no se estaban guardando
        setError(null);
        yaNoSePierde();
      }
      return;
    }

    ocupadoRef.current = 'envio';
    setIsSubmitting(true);
    // Se guarda ANTES de enviarlo, no en el `catch`: con cobertura mala la
    // petición tarda unos diez segundos en morir, y si la aplicación se cerraba
    // en ese rato el golpe no estaba ni en el servidor ni en el móvil. Es lo
    // que ya hacía partida rápida (FE #561). Si llega, se retira abajo
    const guardado = guardaLaCorreccion(
      matchId,
      holeNumber,
      scoreData,
      null,
      currentUserId,
      laPartidaRef.current
    );
    // Cuándo quedó guardado, para distinguir después lo que este envío deja
    // superado de una corrección hecha con él en vuelo. Si el móvil NO pudo
    // guardarlo, lo que hay en la cola es una anotación anterior de ese hoyo, y
    // tomarle la hora a esa la hacía pasar por esta: ni se retiraba al llegar
    // —y el siguiente vaciado pisaba la corrección en el servidor— ni se
    // apartaba al rechazarla
    const cuandoSeGuardo = guardado === false
      ? Date.now()
      : loGuardadoDe(holeNumber)?.timestamp ?? Date.now();
    // Si el servidor contestó —acepte o rechace— hay cobertura para lo aplazado
    let contesto = false;
    try {
      const updatedView = await submitHoleScoreUseCase.execute(matchId, holeNumber, scoreData);
      contesto = true;
      // La respuesta trae la vista con el golpe: una pedida antes ya no vale (FE #606).
      // Salvo que ya se esté en otro partido: ni se pinta ni cuenta como aplicada
      if (!esDeOtraPartida(matchId)) {
        marcaEscritura();
        setScoringView((prev) => conHoyosDe(updatedView, prev));
      }
      setError(null);
      borraLoSuperado(holeNumber, { cuando: cuandoSeGuardo, scoreData });
      yaNoSePierde();
    } catch (err) {
      // La misma política que el resto de la aplicación: un 401, un 408 o un
      // 429 NO son culpa del golpe y se guardan. Antes aquí solo se guardaba a
      // partir del 500, así que una sesión caducada tiraba la anotación
      if (seGuardaParaDespues(err)) {
        // Ya está guardado de antes de enviar: solo queda mirar si aquello se
        // pudo. Si el móvil no pudo —sin espacio, ventana privada— hay que
        // decirlo: callarlo deja al jugador creyendo que su golpe está a salvo
        // en algún sitio, y no está en ninguno
        if (guardado === false) avisaQueNoSeGuardo();
        else if (!hayUnFalloPosterior()) setError(null);
        if (guardado !== false) yaNoSePierde();
        // Y si SÍ se guardó, no se enseña error: para el jugador el golpe está
        // anotado, solo que todavía no ha salido del móvil. Decirle que ha
        // fallado le hace reanotarlo, que es como se anota dos veces el mismo
        // hoyo. Es lo que ya hacía la pantalla de partida rápida
      } else {
        contesto = true;
        // Rechazo definitivo: reintentarlo no lo salva, así que sale de la cola
        // por el mismo camino que el vaciado —se apunta como perdido y solo
        // entonces se borra—. Borrarlo a secas lo haría desaparecer en cuanto
        // la siguiente anotación buena retire el error (FE #521). Lo guardado
        // de antes también sale, que está superado; lo que se queda es una
        // corrección hecha con la petición en camino, que no es la rechazada
        const loGuardado = loGuardadoDe(holeNumber);
        const esLaRechazada = !loGuardado
          || estaSuperada(loGuardado, { cuando: cuandoSeGuardo, scoreData });
        if (esLaRechazada) {
          apartaLaRechazada(
            { matchId, holeNumber, participantId: null, userId: currentUserId ?? null, ...laPartidaRef.current },
            currentUserId ?? null
          );
        }
        setError(err);
      }
    } finally {
      setPendingQueueSize(pendientesPropias());
      setIsSubmitting(false);
      ocupadoRef.current = null;
    }
    // Sin respuesta no se insiste: `online` y volver a la aplicación lo harán
    if (contesto && aplazadoRef.current) processQueue();
  }, [matchId, canScore, isOwnScoreLocked, isMarkerScoreLocked, isOffline, pendientesPropias, currentUserId, loGuardadoDe, borraLoSuperado, processQueue, marcaEscritura, esDeOtraPartida]);

  // --- Submit scorecard ---
  const submitScorecard = useCallback(async () => {
    if (!matchId || !canSubmitScorecard) return;

    setIsSubmitting(true);
    try {
      const summary = await submitScorecardUseCase.execute(matchId);
      // Como un golpe que llega: una vista pedida antes ya no vale (FE #606)
      if (!esDeOtraPartida(matchId)) marcaEscritura();
      setMatchSummary(summary);
      setError(null);
      // Refresh view to get updated submittedBy
      await fetchScoringView();
    } catch (err) {
      setError(err);
    } finally {
      setIsSubmitting(false);
    }
  }, [matchId, canSubmitScorecard, fetchScoringView, marcaEscritura, esDeOtraPartida]);

  // --- Concede match ---
  const concedeMatch = useCallback(async (concedingTeam, reason) => {
    if (!matchId) return;

    setIsSubmitting(true);
    try {
      await concedeMatchUseCase.execute(matchId, concedingTeam, reason);
      if (!esDeOtraPartida(matchId)) marcaEscritura();
      await fetchScoringView();
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setIsSubmitting(false);
    }
  }, [matchId, fetchScoringView, marcaEscritura, esDeOtraPartida]);



  // --- Take over session (force-acquire lock) ---
  const takeOverSession = useCallback(() => {
    if (!matchId) return;
    sessionLock.forceRelease(currentUserId);
    sessionLock.acquire(matchId, sessionIdRef.current, currentUserId);
    setIsSessionBlocked(false);

    // Start refresh timer for the new lock
    if (sessionRefreshRef.current) clearInterval(sessionRefreshRef.current);
    sessionRefreshRef.current = setInterval(() => {
      sessionLock.refresh(sessionIdRef.current, currentUserId);
    }, SESSION_REFRESH_INTERVAL);
  }, [matchId, currentUserId]);

  // --- Online/offline listeners ---
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      processQueue();
    };
    const handleOffline = () => setIsOffline(true);
    // iOS no le entrega `online` a una página suspendida: al volver a la
    // aplicación desde el bloqueo, esto es lo único que llega. La pantalla de
    // partida rápida ya lo escuchaba; esta no, y era su gemela sin arreglar
    const alVolver = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) processQueue();
    };

    // Y al entrar: quien llega aquí desde el aviso del panel —«tienes 3 golpes
    // sin enviar»— ya estaba con cobertura, así que `online` no se dispara.
    // Sin esto, seguir la instrucción de ese aviso no enviaba absolutamente
    // nada y la partida quedaba además excluida del vaciado de fondo.
    // Aplazado un tick: así la pantalla pinta antes de empezar a enviar, y no
    // se cambia estado dentro del propio efecto
    if (navigator.onLine) globalThis.queueMicrotask(() => processQueue());

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [processQueue]);

  // --- Session lock (scoped per userId) ---
  useEffect(() => {
    if (!matchId || !isMatchPlayer || !currentUserId) return;

    // Force-release any stale lock before acquiring.
    // Prevents orphaned locks (closed tabs, page reloads, or cookie-shared
    // sessions in same browser) from blocking on mount.
    // Protection is maintained: if another tab is actively open, it receives
    // the LOCK_ACQUIRED event via BroadcastChannel and gets blocked.
    sessionLock.forceRelease(currentUserId);
    sessionLock.acquire(matchId, sessionIdRef.current, currentUserId);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing pattern surfaced by eslint-plugin-react-hooks 7.1.1 bump; needs dedicated review (tracked in follow-up)
    setIsSessionBlocked(false);

    // Refresh lock periodically
    sessionRefreshRef.current = setInterval(() => {
      sessionLock.refresh(sessionIdRef.current, currentUserId);
    }, SESSION_REFRESH_INTERVAL);

    const cleanup = sessionLock.onLockEvent((event) => {
      // Strict filter: only react to events from the SAME user
      // Using !== ensures undefined/null events are also filtered out
      if (event.userId !== currentUserId) return;
      // And only the scoring-screen lock: the same user also holds a scoped
      // one for the background queue drain, which has nothing to block here
      if (event.scope) return;

      if (event.type === 'LOCK_ACQUIRED' && event.sessionId !== sessionIdRef.current) {
        if (event.matchId === matchId) {
          // Verify against localStorage before blocking (don't trust broadcast alone)
          const existing = sessionLock.getSession(currentUserId);
          if (existing && existing.sessionId !== sessionIdRef.current && existing.matchId === matchId) {
            setIsSessionBlocked(true);
          }
        }
      }
      if (event.type === 'LOCK_RELEASED') {
        const acquired = sessionLock.acquire(matchId, sessionIdRef.current, currentUserId);
        if (acquired) setIsSessionBlocked(false);
      }
    });

    const currentSessionId = sessionIdRef.current;
    const currentRefreshTimer = sessionRefreshRef.current;

    return () => {
      cleanup();
      sessionLock.release(currentSessionId, currentUserId);
      if (currentRefreshTimer) {
        clearInterval(currentRefreshTimer);
      }
    };
  }, [matchId, isMatchPlayer, currentUserId]);

  // --- Initial fetch + polling ---
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing pattern surfaced by eslint-plugin-react-hooks 7.1.1 bump; needs dedicated review (tracked in follow-up)
    fetchScoringView();

    pollIntervalRef.current = setInterval(() => {
      if (!isOffline) fetchScoringView();
    }, POLL_INTERVAL);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [fetchScoringView, isOffline]);

  // --- Update pending queue size on mount ---
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing pattern surfaced by eslint-plugin-react-hooks 7.1.1 bump; needs dedicated review (tracked in follow-up)
    setPendingQueueSize(pendientesPropias());
  }, [matchId, pendientesPropias]);

  return {
    // State
    scoringView,
    // Lo que se pinta: el servidor con la cola encima (FE #606)
    scoresVisibles,
    currentHole,
    isLoading,
    error,
    isSubmitting,
    matchSummary,
    isOffline,
    isSessionBlocked,
    pendingQueueSize,
    avisoDelVaciado,
    // Si lo que se ve salió de la foto del móvil y no del servidor (FE #614): la
    // pantalla tiene que decirlo, sobre todo con un 5xx, que ocurre CON cobertura.
    // Derivado por partido: al cambiar de uno a otro, el ámbar del anterior no se
    // hereda, y así no hay que reiniciar nada en un efecto
    pintadoDeMemoria: memoriaDe === matchId,

    // Derived
    isMatchPlayer,
    canScore,
    hasSubmitted,
    isOwnScoreLocked,
    isMarkerScoreLocked,
    isFullyLocked,
    validatedHoles,
    totalHoles,
    holesToSubmit,
    canSubmitScorecard,

    // Actions
    setCurrentHole,
    submitScore,
    submitScorecard,
    concedeMatch,
    takeOverSession,
    refetch: fetchScoringView,
  };
};
