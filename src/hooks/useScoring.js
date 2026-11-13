import { useState, useEffect, useCallback, useRef } from 'react';
import { ORIGEN_RYDER } from './origenesDeAnotacion';
import { useAccionesDelPartido } from './useAccionesDelPartido';
import { useCandadoDeLaSesion } from './useCandadoDeLaSesion';
import { useColaDelPartido } from './useColaDelPartido';
import { useNoGuardados } from './useNoGuardados';
import { useVistaDelPartido } from './useVistaDelPartido';
import { seGuardaParaDespues } from '../utils/politicaDeLaCola';
import { abreMasTarde } from '../services/partidosSinCobertura';
import { apartaLaRechazada } from '../services/vaciaAnotaciones';
import { delGolpe } from '../utils/fallosDeLaAnotacion';
import { estadoDelPartido } from '../utils/estadoDelPartido';
import { guardaLaCorreccion } from '../utils/guardaLaCorreccion';
import { conSuRival, golpesQueTrae, marcadoDe } from '../utils/golpesDelHoyo';
import * as golpesPerdidos from '../utils/golpesPerdidos';
import * as offlineQueue from '../utils/scoringOfflineQueue';
import { conHoyosDe, conLaColaEncima, estaSuperada } from '../utils/vistaDeLaAnotacion';

const POLL_INTERVAL = 10000; // 10 seconds

// Un id distinto en cada pantalla de anotación, también entre pestañas
// Aleatorio de verdad (crypto): el candado solo lo compara consigo mismo, pero
// un id adivinable no tiene sitio en nada que decide quién anota
const creaIdDeSesion = () => globalThis.crypto.randomUUID();

/**
 * Central hook for live scoring.
 * Manages scoring state, polling, auto-save, offline queue, and session lock.
 *
 * Por piezas, cada una con su estado: la vista (`useVistaDelPartido`), la cola
 * (`useColaDelPartido`), los hoyos sin guardar (`useNoGuardados`), el candado
 * (`useCandadoDeLaSesion`) y las acciones del partido (`useAccionesDelPartido`).
 * Los efectos corren en el orden en que se declaran, también los de las
 * piezas: el nombre de la partida, el partido vigente, la red, el candado, el
 * sondeo. Cambiar de sitio una llamada cambia ese orden.
 *
 * @param {string} matchId
 * @param {string} currentUserId
 * @returns {Object} Scoring state and actions
 */
export const useScoring = (matchId, currentUserId, isAdmin = false, origen = ORIGEN_RYDER) => {
  const [scoringView, setScoringView] = useState(null);
  const [currentHole, setCurrentHole] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [fallo, setFallo] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingQueueSize, setPendingQueueSize] = useState(0);
  const { noGuardados, seguimientoDe } = useNoGuardados(matchId);
  // Por qué se paró el último vaciado, si fue por el almacenamiento del móvil
  // (ver `PARO`). Estado PROPIO y no `error`: el sondeo pone `error` a null
  // cada diez segundos al cargar bien la vista, así que un aviso puesto ahí
  // duraba lo que tardaba la siguiente respuesta —y en el propio vaciado, ni
  // eso: se ponía y tres líneas después el refetch lo quitaba—. Esto solo lo
  // toca el vaciado, y solo se quita cuando otro vaciado termina sin ese paro
  const [avisoDelVaciado, setAvisoDelVaciado] = useState(null);

  // El id de esta pantalla para el candado de la sesión: uno por montaje y el
  // mismo en cada pintado (el sondeo repinta cada 10 s). Con `useState` se
  // crea una sola vez; NO `useId()`, que sale igual en dos pestañas y la otra
  // tomaría el candado de esta por suyo (no la bloquearía)
  const [sessionId] = useState(creaIdDeSesion);
  const sessionIdRef = useRef(sessionId);
  const pollIntervalRef = useRef(null);

  const {
    isMatchPlayer,
    isWithdrawn,
    canScore,
    hasSubmitted,
    isOwnScoreLocked,
    isMarkerScoreLocked,
    isFullyLocked,
    validatedHoles,
    totalHoles,
    canSubmitScorecard,
    partidoAcabado,
    holesToSubmit,
  } = estadoDelPartido(scoringView, currentUserId, isAdmin);

  // Quien marca a dos (fourball con un retirado) bloquea por marcado: entregó
  // uno, al otro se le sigue marcando. Sin marcado, no hay marca que guardar
  const entregadas = scoringView?.scorecardSubmittedBy;
  const marcaBloqueadaPara = useCallback(
    (id) => !id || (entregadas?.includes(id) ?? false),
    [entregadas]
  );

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
  const laPartidaRef = useRef({ matchName: null, matchNumber: null, ...(origen.tipo ? { tipo: origen.tipo } : {}) });
  useEffect(() => {
    // Solo si la vista ES de esta partida: la ruta no lleva `key` y la vista
    // no se vacía al cambiar de partida, así que al ir de A a B hay un render
    // con `matchId` de B y la vista de A. Sin esta guarda se le ponía a B el
    // nombre de A, y como el nombre no se pisa, para siempre
    const esDeEsta = Boolean(matchId) && scoringView?.matchId === matchId;
    // Y de qué es, para que el vaciado de fondo la mande a su endpoint (PR 7).
    // La Ryder no lleva tipo, como siempre
    const deQue = origen.tipo ? { tipo: origen.tipo } : {};
    laPartidaRef.current = esDeEsta
      ? {
        matchName: scoringView?.roundInfo?.golfCourseName ?? null,
        matchNumber: scoringView?.matchNumber ?? null,
        ...deQue,
      }
      : { matchName: null, matchNumber: null, ...deQue };
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
  }, [matchId, scoringView?.matchId, scoringView?.roundInfo?.golfCourseName, scoringView?.matchNumber, origen.tipo]);

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
    return conLaColaEncima(delServidor, guardadas, currentUserId);
  })();

  // La petición de la vista. Aquí y no antes: su efecto —el partido vigente—
  // corre detrás del del nombre de la partida, como siempre
  const { fetchScoringView, marcaEscritura, esDeOtraPartida, memoriaDe } = useVistaDelPartido({
    matchId,
    currentUserId,
    isOffline,
    leeLaVista: origen.leeLaVista,
    setScoringView,
    setFallo,
    setIsLoading,
  });

  const {
    ocupadoRef,
    aplazadoRef,
    loQueDejoRef,
    pendientesPropias,
    firmaDeLaCola,
    processQueue,
    loGuardadoDe,
    borraLoSuperado,
  } = useColaDelPartido({
    matchId,
    currentUserId,
    anota: origen.anota,
    esDeOtraPartida,
    marcaEscritura,
    fetchScoringView,
    setScoringView,
    setAvisoDelVaciado,
    setPendingQueueSize,
  });

  // Los golpes pendientes de este partido y esta cuenta, contados al pintar
  // cuando cambia de quién es la pantalla: el aviso de «N golpes» sale ya en
  // el primer pintado, también al reabrir sin cobertura. Después lo mantienen
  // a mano el envío, el vaciado y las acciones. Se guarda el partido y la
  // cuenta, comparados cada uno por su lado (no la función: `setState(fn)` la
  // ejecutaría como actualizador)
  const [contadaPara, setContadaPara] = useState(null);
  if (contadaPara === null || contadaPara.matchId !== matchId || contadaPara.currentUserId !== currentUserId) {
    setContadaPara({ matchId, currentUserId });
    setPendingQueueSize(pendientesPropias());
  }

  // El turno de cada anotación (FE #605). Un envío que salió ANTES y acaba —con
  // o sin llegar— no puede retirar el aviso de una corrección posterior del
  // mismo hoyo que no se pudo guardar: esa corrección no está en ningún sitio
  // (FE #622). Un contador y no la hora: la de la cola y la de aquí no son el
  // mismo reloj
  const anotacionRef = useRef(0);

  // --- Submit hole score ---
  // Allow submission if own scores OR marker scores are still editable
  // `tocado` dice qué golpe acaba de elegir el jugador: el envío lleva los dos,
  // y solo ese cuenta como vuelto a anotar (FE #622). Sin él, los que trae
  const submitScore = useCallback(async (holeNumber, scoreData, { tocado } = {}) => {
    if (!matchId || !canScore) return;
    // Con el marcado de ESTE golpe: con dos, el primero no dice nada del otro
    if (isOwnScoreLocked && marcaBloqueadaPara(scoreData?.markedPlayerId)) return;
    const estaAnotacion = ++anotacionRef.current;
    const marcado = marcadoDe(scoreData);
    // Cada marca, con su rival: quien marca a dos tiene dos en el mismo hoyo, y
    // el nombre no cambia si deja de marcar a dos (26 oct 2026, CodeRabbit)
    const nombra = (golpes) => conSuRival(golpes, marcado);
    const golpesTocados = nombra(tocado ? [tocado] : golpesQueTrae(scoreData));
    // Los avisos de golpes que no se guardaron, siempre en el partido de ESTE
    // envío (`useNoGuardados`)
    const { avisaQueNoSeGuardo, hayUnFalloPosterior, yaNoSePierde } = seguimientoDe({
      matchId,
      holeNumber,
      currentUserId,
      estaAnotacion,
      golpesTocados,
    });

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
        laPartidaRef.current,
        golpesTocados
      );
      setPendingQueueSize(pendientesPropias());
      if (guardado === false) {
        // Sin cobertura Y sin sitio donde guardarlo: el golpe no existe en
        // ninguna parte, y eso hay que decirlo
        avisaQueNoSeGuardo();
      } else {
        // Y se retira el aviso anterior si lo había: sin cobertura no hay otra
        // ocasión de limpiarlo —el sondeo no corre—. El de un hoyo que no se
        // pudo guardar no va aquí: ese solo se va al guardar su hoyo (FE #622)
        setFallo(null);
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
      laPartidaRef.current,
      golpesTocados
    );
    // Cuándo quedó guardado, para distinguir después lo que este envío deja
    // superado de una corrección hecha con él en vuelo. Si el móvil NO pudo
    // guardarlo, lo que hay en la cola es una anotación anterior de ese hoyo, y
    // tomarle la hora a esa la hacía pasar por esta: ni se retiraba al llegar
    // —y el siguiente vaciado pisaba la corrección en el servidor— ni se
    // apartaba al rechazarla
    const cuandoSeGuardo = guardado === false
      ? Date.now()
      : loGuardadoDe(holeNumber, marcado)?.timestamp ?? Date.now();
    // Si el servidor contestó —acepte o rechace— hay cobertura para lo aplazado
    let contesto = false;
    try {
      const updatedView = await origen.anota.execute(matchId, holeNumber, scoreData);
      contesto = true;
      // La respuesta trae la vista con el golpe: una pedida antes ya no vale (FE #606).
      // Salvo que ya se esté en otro partido: ni se pinta ni cuenta como aplicada
      if (!esDeOtraPartida(matchId)) {
        marcaEscritura();
        setScoringView((prev) => conHoyosDe(updatedView, prev));
        setFallo(null);
      }
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
        else if (!hayUnFalloPosterior() && !esDeOtraPartida(matchId)) setFallo(null);
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
        const loGuardado = loGuardadoDe(holeNumber, marcado);
        const esLaRechazada = !loGuardado
          || estaSuperada(loGuardado, { cuando: cuandoSeGuardo, scoreData });
        if (esLaRechazada) {
          // Lo que sale de la cola es la entrada del hoyo ENTERA, y puede llevar
          // una corrección anterior del otro golpe, sin enviar: el aviso nombra
          // los golpes de las dos, o ese se pierde sin decirlo (FE #813). De una
          // entrada de antes, sin ese dato, los golpes que trae
          const deLaCola = loGuardado ? nombra(loGuardado.tocados ?? golpesQueTrae(loGuardado.scoreData)) : [];
          const loMandado = Object.fromEntries(Object.entries(scoreData ?? {}).filter(([, v]) => v !== undefined));
          apartaLaRechazada(
            {
              matchId,
              holeNumber,
              participantId: null,
              userId: currentUserId ?? null,
              scoreData: { ...loGuardado?.scoreData, ...loMandado },
              tocados: [...new Set([...golpesTocados, ...deLaCola])],
              ...laPartidaRef.current,
            },
            currentUserId ?? null
          );
        }
        // Con su hoyo, para poder decir cuál: el error del servidor no lo trae.
        // Como partida rápida
        err.holeNumber = holeNumber;
        if (!esDeOtraPartida(matchId)) setFallo(delGolpe(err, matchId));
      }
    } finally {
      setPendingQueueSize(pendientesPropias());
      setIsSubmitting(false);
      ocupadoRef.current = null;
    }
    // Sin respuesta no se insiste: `online` y volver a la aplicación lo harán
    if (contesto && aplazadoRef.current) processQueue();
  }, [matchId, canScore, isOwnScoreLocked, marcaBloqueadaPara, isOffline, pendientesPropias, currentUserId, loGuardadoDe, borraLoSuperado, processQueue, marcaEscritura, esDeOtraPartida, origen.anota, seguimientoDe, ocupadoRef, aplazadoRef]);

  const { matchSummary, retirando, submitScorecard, concedeMatch, retirarJugador } = useAccionesDelPartido({
    matchId,
    currentUserId,
    canSubmitScorecard,
    entrega: origen.entrega,
    concede: origen.concede,
    retira: origen.retira,
    fetchScoringView,
    marcaEscritura,
    esDeOtraPartida,
    pendientesPropias,
    processQueue,
    setFallo,
    setIsSubmitting,
  });

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

  // El candado de la sesión. Aquí: su efecto va entre el de la red y el sondeo
  const { isSessionBlocked, takeOverSession } = useCandadoDeLaSesion({
    matchId,
    currentUserId,
    isMatchPlayer,
    isWithdrawn,
    sessionIdRef,
  });

  // --- Initial fetch + polling ---
  useEffect(() => {
    fetchScoringView();

    // Y si el servidor contesta y hay golpes guardados, se vacían (FE #625). Con
    // cobertura y el servidor caído, `online` no salta nunca: el sondeo es lo
    // único que se entera de que ha vuelto. Por `processQueue`, que no deja dos
    // escritores ni apila pasadas, y solo con algo en la cola: el vaciado pide
    // la vista al terminar, y cada 10 s sería una petición de más para nada. Ni
    // si la cola es la que dejó a propósito el último vaciado: reintentarla no
    // cambia nada, y era reenviar el mismo golpe toda la vuelta
    let sigue = true;
    pollIntervalRef.current = setInterval(async () => {
      if (isOffline) return;
      const vista = await fetchScoringView();
      // La pantalla puede haberse cerrado con la petición en camino: entonces
      // la cola es del vaciado de fondo, y mandarla desde aquí la duplicaría
      if (!sigue || !vista || pendientesPropias() === 0) return;
      const dejo = loQueDejoRef.current;
      if (dejo && dejo.firma === firmaDeLaCola()) {
        // Lo que espera a que el partido abra sale en cuanto abre; antes, cada
        // intento sería un rechazo seguro. La hora la dice el servidor
        const yaAbre = !abreMasTarde({ status: vista.matchStatus, scoringOpensAt: vista.scoringOpensAt });
        if (!dejo.esperanASuHora || !yaAbre) return;
      }
      processQueue();
    }, POLL_INTERVAL);

    return () => {
      sigue = false;
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [fetchScoringView, isOffline, pendientesPropias, firmaDeLaCola, processQueue, loQueDejoRef]);

  return {
    // State
    scoringView,
    // Lo que se pinta: el servidor con la cola encima (FE #606)
    scoresVisibles,
    currentHole,
    isLoading,
    // Solo el de este partido: al cambiar de uno a otro, el del anterior no se
    // hereda, sin tener que limpiarlo en un efecto (como `pintadoDeMemoria`)
    error: fallo?.matchId === matchId ? fallo.err : null,
    // Cada hoyo con el turno de su último fallo y qué golpes faltan (FE #622)
    noGuardados,
    origenDelError: fallo?.matchId === matchId ? fallo.origen : null,
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
    isWithdrawn,
    canScore,
    hasSubmitted,
    isOwnScoreLocked,
    isMarkerScoreLocked,
    marcaBloqueadaPara,
    retirando,
    isFullyLocked,
    validatedHoles,
    totalHoles,
    holesToSubmit,
    canSubmitScorecard,
    partidoAcabado,

    // Actions
    setCurrentHole,
    submitScore,
    submitScorecard,
    concedeMatch,
    retirarJugador,
    takeOverSession,
    refetch: fetchScoringView,
  };
};
