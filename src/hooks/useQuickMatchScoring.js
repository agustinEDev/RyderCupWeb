import { useState, useEffect, useCallback, useRef } from 'react';
import {
  submitQuickMatchHoleScoreUseCase,
  submitQuickMatchProxyHoleScoreUseCase,
} from '../composition';
import { useCargaDePartidaRapida } from './useCargaDePartidaRapida';
import { useCierreDePartidaRapida } from './useCierreDePartidaRapida';
import { useVaciadoDePartidaRapida } from './useVaciadoDePartidaRapida';
import * as golpesPerdidos from '../utils/golpesPerdidos';
import { apartaLaRechazada } from '../services/vaciaAnotaciones';
import { conLoGuardadoEncima, sobraTrasEnviar } from '../utils/colaDePartidaRapida';
import { errorDeGuardado } from '../utils/erroresDeAnotacion';
import { seGuardaParaDespues } from '../utils/politicaDeLaCola';
import * as offlineQueue from '../utils/scoringOfflineQueue';
import { guardaLaCorreccion } from '../utils/guardaLaCorreccion';

/**
 * Central hook for quick match scoring: fetches the match + course holes,
 * polls for updates, and exposes score submission (own + delegated).
 *
 * Quick match has no dual-validation, session lock or offline queue — a
 * single scorer records each hole directly, so the hook is intentionally
 * simpler than the tournament useScoring().
 *
 * Por piezas: la carga y el sondeo (`useCargaDePartidaRapida`), el vaciado de
 * lo guardado (`useVaciadoDePartidaRapida`) y el cierre
 * (`useCierreDePartidaRapida`). Los efectos corren en el orden en que se
 * declaran, también los de las piezas: limpiar al cambiar de partida, la red,
 * el sondeo, el vaciado y el nombre de la partida. Cambiar de sitio una
 * llamada cambia ese orden.
 */
export const useQuickMatchScoring = (quickMatchId, currentUserId) => {
  const [currentHole, setCurrentHole] = useState(1);
  // El error de ANOTAR; el de cargar lo lleva `useCargaDePartidaRapida`. Dos
  // errores y no uno: un 403 al cargar es "no juegas esta partida" y un 403 al
  // anotar es "no eres el anotador de ese jugador"
  const [saveError, setSaveError] = useState(null);
  // El vaciado se paró porque el móvil no admite escrituras (ver `PARO`).
  // Estado propio y no dentro de `saveError`: ese lo pisa cada anotación que
  // sale bien y cada sondeo, y el aviso duraba lo que tardaba el siguiente
  const [avisoDelVaciado, setAvisoDelVaciado] = useState(null);
  // Arranca contando lo que ya hay guardado: si empezara en cero, al volver a
  // la app sin cobertura el aviso no saldría hasta el primer vaciado, que sin
  // cobertura no llega, y los golpes del jugador parecerían no existir
  const [pendientes, setPendientes] = useState(() =>
    quickMatchId ? offlineQueue.size(quickMatchId, currentUserId) : 0
  );
  // Hoyos que el servidor rechazó para siempre, para poder decir cuáles fueron
  const [perdidos, setPerdidos] = useState([]);
  /**
   * Cómo se identifica esta partida en el aviso del panel (FE #521). En una
   * partida rápida no hay número, así que va solo el nombre que le puso quien
   * la creó. En una ref y no derivado del objeto: el sondeo lo reemplaza cada
   * 10 s, y colgar de él un `useCallback` reconstruía `submitScore` seis veces
   * por minuto en la pantalla que más se usa.
   */
  const laPartidaRef = useRef({ matchName: null, matchNumber: null });
  // Hoyos donde lo guardado no coincide con lo que hay: los resuelve el jugador
  const [discrepancias, setDiscrepancias] = useState([]);
  // Un solo cerrojo para las DOS escrituras —el vaciado y el envío directo—,
  // porque las dos escriben en el mismo sitio y el orden de llegada no lo
  // decide nadie: si el golpe viejo sale primero y llega el último, el servidor
  // se queda con el viejo y la corrección no está en ninguna parte, ni en la
  // cola —ya vaciada— ni en el servidor. Sin solaparse, el orden deja de
  // importar. Guardar en la cola no cuenta como escritura: no sale del móvil.
  const escribiendoRef = useRef(false);
  // Qué anotación no se pudo guardar, y en qué turno (FE #605). Un envío que
  // salió ANTES y acaba después no puede retirar ese aviso: es de una
  // corrección posterior del mismo hoyo, y lo guardado de antes ya salió de la
  // cola, así que sin aviso el hoyo se quedaba vacío sin que nadie lo dijera.
  // Un contador y no la hora: la de la cola y la de aquí no son el mismo reloj
  const anotacionRef = useRef(0);
  const noSeGuardoRef = useRef(null);
  // El vaciado se declara más abajo y el sondeo está más arriba: la ref evita
  // reordenarlo todo y el ciclo de dependencias entre los dos
  const vaciarRef = useRef(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // La carga, primero: sus efectos —limpiar, la red y el sondeo— corren antes
  // que los de abajo, como siempre
  const {
    quickMatch,
    setQuickMatch,
    holes,
    tees,
    courseName,
    courseCountryCode,
    isLoading,
    loadError,
    pintadoDeMemoria,
    idVigenteRef,
    marcaEscritura,
    fetchQuickMatch,
    pintaElGolpe,
  } = useCargaDePartidaRapida({
    quickMatchId,
    currentUserId,
    vaciarRef,
    setPerdidos,
    setDiscrepancias,
    setPendientes,
  });

  // Quién soy yo en esta partida. Arriba de la lista porque de ahí sale si lo
  // que hay en el servidor lo anoté yo
  const myParticipant = quickMatch?.participants?.find((p) => p.userId === currentUserId) ?? null;

  // La tarjeta, el selector y la clasificación salen todos de esta lista, y la
  // clasificación se calcula aquí mismo: sumándole la cola, los tres ven el
  // golpe. Sin esto la casilla seguiría diciendo «Anotar» después de anotar.
  // Se lee en cada render a propósito: memorizarlo pedía saber cuándo cambia la
  // cola, y decidir a mi favor la cambia sin cambiarle el tamaño.
  const holeScoresVisibles = (() => {
    const delServidor = quickMatch?.holeScores ?? [];
    if (!quickMatchId) return delServidor;

    const guardados = offlineQueue.getByMatch(quickMatchId, currentUserId);
    return conLoGuardadoEncima(delServidor, guardados, quickMatch, myParticipant?.participantId);
  })();

  const isCreator = quickMatch?.creatorId === currentUserId;
  const isScorer = myParticipant ? quickMatch.scorerIds.includes(myParticipant.participantId) : false;

  const myAssignment = quickMatch?.scoringAssignments?.find(
    (sa) => sa.scorerParticipantId === myParticipant?.participantId
  );
  // The backend's assignment for a scorer already includes themselves in
  // covered_participant_ids (self-coverage), plus any delegated non-scorers.
  const coveredParticipantIds = isScorer
    ? myAssignment?.coveredParticipantIds ?? [myParticipant.participantId]
    : [];

  const totalHoles = holes.length || 18;

  // El vaciado de lo guardado: lo dispara el sondeo por `vaciarRef`, que se
  // rellena en su efecto, detrás de los de la carga
  useVaciadoDePartidaRapida({
    quickMatchId,
    currentUserId,
    escribiendoRef,
    vaciarRef,
    idVigenteRef,
    fetchQuickMatch,
    pintaElGolpe,
    setDiscrepancias,
    setPerdidos,
    setPendientes,
    setAvisoDelVaciado,
  });

  useEffect(() => {
    // Solo si la partida cargada ES esta: el efecto que limpia al cambiar de
    // ruta pone `quickMatch` a null, pero eso aterriza un render después, y en
    // este todavía se ve la anterior. Sin la guarda, a la nueva se le ponía
    // el nombre de la vieja, y como no se pisa, para siempre
    const esDeEsta = Boolean(quickMatchId) && quickMatch?.id === quickMatchId;
    laPartidaRef.current = { matchName: esDeEsta ? quickMatch?.name ?? null : null, matchNumber: null };
    // Y se le pone nombre a lo que se guardó sin él: en un arranque en frío
    // sin cobertura la partida no llega nunca, así que todo lo anotado quedó
    // sin nombre y el panel enseñaba «una partida anterior» —dos avisos
    // idénticos con dos partidas—. A la cola y a los avisos ya apartados, que
    // ya no están en la cola: el gemelo de competición hace lo mismo
    if (esDeEsta && quickMatch?.name) {
      offlineQueue.ponleNombre(quickMatchId, { matchName: quickMatch.name });
      golpesPerdidos.ponleNombre(quickMatchId, { matchName: quickMatch.name });
    }
  }, [quickMatchId, quickMatch?.id, quickMatch?.name]);

  /**
   * Quita de la cola lo guardado de un hoyo, sea de quien sea.
   *
   * Con el dueño REAL de la entrada y no con el de quien está mirando: una
   * guardada por una versión anterior a FE #521 no tiene dueño, y borrarla a
   * nombre de alguien concreto no la borraría en absoluto. Aquí eso significa
   * que el siguiente vaciado compararía lo viejo con lo que acaba de entrar y
   * le preguntaría al jugador si quiere recuperar el resultado que él mismo
   * corrigió.
   */
  const borraLoGuardadoDe = useCallback(
    (holeNumber, participantId, loEnviado = null) => {
      // TODAS las que haya de ese hoyo, no la primera: una anotación huérfana
      // —de antes de que la cola guardara dueño— y la de ahora son entradas
      // distintas, porque el dueño es parte de la identidad. Borrando solo la
      // primera se iba la huérfana y quedaba la recién creada, y la pantalla
      // decía «1 golpe guardado» justo después de un envío que sí llegó
      const guardadas = offlineQueue
        .getByMatch(quickMatchId, currentUserId)
        .filter((e) => e.holeNumber === holeNumber && e.participantId === participantId)
        // Y solo lo que ya está superado por lo que se acaba de enviar, cuando
        // se dice qué se envió (`sobraTrasEnviar`). Desde que la pantalla no se
        // bloquea mientras el golpe va de camino (FE #564), el jugador puede
        // corregir ese mismo hoyo con la petición todavía en vuelo: eso se
        // queda, para salir en el vaciado siguiente. Dejar lo anterior haría
        // que el vaciado pisara con ello lo que acaba de entrar
        .filter((e) => sobraTrasEnviar(e, loEnviado));
      for (const guardada of guardadas) {
        offlineQueue.remove(quickMatchId, holeNumber, participantId, guardada.userId ?? null);
      }
    },
    [quickMatchId, currentUserId]
  );

  /**
   * El jugador decide, tras hablar con su compañero, qué anotación vale.
   */
  const resuelveDiscrepancia = useCallback(
    (holeNumber, participantId, cual) => {
      // No se envía aquí: se deja la decisión tomada y la envía el vaciado del
      // siguiente sondeo. Enviar en este punto abría tres agujeros —si no
      // llegaba no se enteraba nadie, el sondeo podía estar vaciando a la vez y
      // mandarlo dos veces, y la decisión se perdía al cerrar la aplicación.
      if (cual === 'mio') {
        // Con el dueño, como las demás lecturas: sin él, en un móvil
        // compartido se recogía la anotación de la otra cuenta y se
        // reencolaba a nombre de quien estuviera dentro
        const entrada = offlineQueue
          .getByMatch(quickMatchId, currentUserId)
          .find((e) => e.holeNumber === holeNumber && e.participantId === participantId);
        // Si ya no está —el vaciado la mandó, o el móvil no pudo guardarla— no
        // hay nada que decidir, pero el aviso tiene que cerrarse igual: es un
        // velo a pantalla completa sin salida, y quedarse debajo deja la
        // partida sin poder anotar, ni terminar, ni cancelar
        if (entrada) {
          offlineQueue.enqueue(
            quickMatchId,
            holeNumber,
            { ...entrada.scoreData, decidido: true },
            participantId,
            entrada.userId ?? currentUserId,
            laPartidaRef.current
          );
        }
      } else if (cual === 'elQueHay') {
        borraLoGuardadoDe(holeNumber, participantId);
      } else {
        // Las dos ramas hacen lo contrario la una de la otra y una descarta la
        // anotación del jugador: un tercer valor no cae en ninguna
        return;
      }

      setDiscrepancias((antes) =>
        antes.filter((d) => !(d.holeNumber === holeNumber && d.participantId === participantId))
      );
      setPendientes(offlineQueue.size(quickMatchId, currentUserId));
    },
    [quickMatchId, currentUserId, borraLoGuardadoDe]
  );

  const submitScore = useCallback(
    async (holeNumber, participantId, score) => {
      if (!quickMatchId || !isScorer) return;
      const estaAnotacion = ++anotacionRef.current;
      const avisaQueNoSeGuardo = () => {
        noSeGuardoRef.current = { holeNumber, participantId, anotacion: estaAnotacion };
        setSaveError(errorDeGuardado(holeNumber));
        // Lo sustituido ha podido salir de la cola, y el contador tiene que
        // decirlo ya: el siguiente sondeo tarda un minuto (CodeRabbit, PR #620)
        setPendientes(offlineQueue.size(quickMatchId, currentUserId));
      };
      const hayUnFalloPosterior = () => {
        const fallo = noSeGuardoRef.current;
        return Boolean(fallo)
          && fallo.holeNumber === holeNumber
          && fallo.participantId === participantId
          && fallo.anotacion > estaAnotacion;
      };

      // Con un vaciado en marcha no se manda: se guarda, y sale en el
      // siguiente sondeo detrás de lo que ya iba. Mandarlo ahora es la carrera
      // de arriba, y ahí lo que se pierde es la corrección del jugador
      if (escribiendoRef.current) {
        if (guardaLaCorreccion(quickMatchId, holeNumber, { score }, participantId, currentUserId, laPartidaRef.current) === false) {
          avisaQueNoSeGuardo();
          return;
        }
        setPendientes(offlineQueue.size(quickMatchId, currentUserId));
        setSaveError(null);
        // Aquí sí se puede retirar el aviso: el `enqueue` de arriba devolvió
        // bien, así que el reemplazo está guardado en el móvil
        golpesPerdidos.olvidaEl(quickMatchId, holeNumber, currentUserId, participantId);
        setPerdidos((antes) =>
          antes.filter((x) => !(x.holeNumber === holeNumber && x.participantId === participantId))
        );
        return;
      }

      escribiendoRef.current = true;
      setIsSubmitting(true);
      // Se guarda ANTES de intentar enviarlo, no después de que el envío
      // falle. Guardarlo es lo que hace que el golpe exista: lo que se pinta
      // en la casilla sale de la cola, así que esperando a que muriera la
      // petición la casilla decía «Anotar» los diez segundos que el móvil
      // tarda en rendirse sin cobertura, y si la aplicación se cerraba en ese
      // rato el golpe no estaba en ninguna parte (FE #561). Si el envío sale
      // bien se retira unas líneas más abajo, que es lo que ya se hacía
      const seGuardo = guardaLaCorreccion(
        quickMatchId, holeNumber, { score }, participantId, currentUserId, laPartidaRef.current
      );
      // Cuándo quedó guardado esto, para saber después qué es anterior —y hay
      // que borrar— y qué llegó DESPUÉS, que es una corrección del jugador y
      // se respeta. Si el móvil NO pudo guardarlo, lo que hay en la cola es una
      // anotación anterior de ese hoyo, y tomarle la hora a esa la hacía pasar
      // por esta: no se borraba al llegar el envío y el siguiente vaciado la
      // mandaba encima (FE #605, gemelo del 6b de la #604 en competición)
      const cuandoSeGuardo = seGuardo === false
        ? Date.now()
        : offlineQueue
          .getByMatch(quickMatchId, currentUserId)
          .find((e) => e.holeNumber === holeNumber && e.participantId === participantId
            && (e.userId ?? null) === (currentUserId ?? null))
          ?.timestamp ?? Date.now();
      // El contador de pendientes NO se toca aquí: con cobertura buena el
      // envío tarda un suspiro, y actualizarlo ya enseñaría «1 golpe guardado
      // en el móvil» en cada anotación para retirarlo acto seguido. Se pone
      // abajo, cuando se sabe cómo acabó. La casilla, en cambio, se pinta sola:
      // sale de la cola, y el render que provoca `setIsSubmitting` ya la lee
      // El aviso rojo pedía volver a anotarlo, y ya está hecho — pero NO se
      // retira todavía: si este reemplazo lo rechazan también, o
      // el móvil no puede encolarlo, el jugador se quedaría sin golpe y sin
      // aviso. Se retira abajo, cuando conste que está a salvo
      const yaNoSePierde = () => {
        golpesPerdidos.olvidaEl(quickMatchId, holeNumber, currentUserId, participantId);
        setPerdidos((antes) =>
          antes.filter((x) => !(x.holeNumber === holeNumber && x.participantId === participantId))
        );
      };
      try {
        const golpe = participantId === myParticipant?.participantId
          ? await submitQuickMatchHoleScoreUseCase.execute(quickMatchId, holeNumber, score)
          : await submitQuickMatchProxyHoleScoreUseCase.execute(quickMatchId, participantId, holeNumber, score);
        // Antes de quitarlo de la cola: si no, hasta que llega la partida ese
        // hoyo sale vacío, o con el número de antes (FE #607)
        pintaElGolpe(golpe);
        if (!hayUnFalloPosterior()) setSaveError(null);
        // El servidor ya tiene lo bueno, así que lo que quedaba guardado de
        // ese mismo hoyo sobra. Dejarlo hace que el siguiente vaciado compare
        // lo viejo con lo que acaba de entrar, no coincidan, y se le pregunte
        // al jugador si quiere recuperar el resultado que él mismo corrigió
        borraLoGuardadoDe(holeNumber, participantId, { cuando: cuandoSeGuardo, score });
        setPendientes(offlineQueue.size(quickMatchId, currentUserId));
        yaNoSePierde();
        await fetchQuickMatch();
      } catch (err) {
        if (seGuardaParaDespues(err)) {
          // Ya está guardado de antes de enviar, así que aquí no hay nada que
          // hacer salvo mirar si aquello se pudo. NO se enseña error: para el
          // jugador el golpe está anotado, solo que todavía no ha salido de
          // aquí. Puede haberse negado —un iPhone sin espacio, o una ventana
          // privada—, y entonces el golpe no está en ninguna parte: callarlo
          // es lo peor de todo
          if (seGuardo === false) {
            // El error de red no es lo que hay que contar: lo que ha pasado es
            // que el móvil no lo ha podido guardar
            avisaQueNoSeGuardo();
          } else {
            setPendientes(offlineQueue.size(quickMatchId, currentUserId));
            if (!hayUnFalloPosterior()) setSaveError(null);
            // Guardado en el móvil también cuenta: sigue habiendo anotación,
            // lo que ya no hay es nada perdido
            yaNoSePierde();
          }
        } else {
          // El servidor lo rechaza por algo que no cambia con el tiempo:
          // reintentarlo no lo va a salvar, así que sale de la cola. Sin esto,
          // lo que se guardó antes de enviar se quedaría dentro y el vaciado
          // lo reenviaría en cada sondeo para que lo rechazaran otra vez.
          //
          // Por el mismo camino que el vaciado, y no borrando a secas: escribe
          // el aviso primero y solo borra si quedó escrito. El recuadro rojo
          // se lo lleva la siguiente anotación que salga bien, y entonces del
          // golpe no quedaría constancia en ninguna parte —ni en la lista de
          // hoyos que repetir, ni en el panel—. Y si el disco no admite la
          // escritura, la anotación se queda: mejor reintentada mil veces que
          // desaparecida sin que nadie lo sepa (FE #521)
          apartaLaRechazada(
            { matchId: quickMatchId, holeNumber, participantId, userId: currentUserId ?? null,
              ...laPartidaRef.current },
            currentUserId ?? null
          );
          setPerdidos((antes) =>
            antes.some((x) => x.holeNumber === holeNumber && x.participantId === participantId)
              ? antes
              : [...antes, { holeNumber, participantId }]
          );
          setPendientes(offlineQueue.size(quickMatchId, currentUserId));
          // Se dice, y se dice DE QUÉ HOYO: el caso realista es anotar sin
          // cobertura y que alguien termine la partida mientras tanto, y ahí lo
          // menos que se puede hacer es decir cuál se perdió
          err.holeNumber = holeNumber;
          setSaveError(err);
        }
      } finally {
        escribiendoRef.current = false;
        setIsSubmitting(false);
      }
    },
    [quickMatchId, isScorer, myParticipant, fetchQuickMatch, currentUserId, borraLoGuardadoDe, pintaElGolpe]
  );

  const { cancelMatch, completeMatch } = useCierreDePartidaRapida({
    quickMatchId,
    isCreator,
    idVigenteRef,
    marcaEscritura,
    fetchQuickMatch,
    setQuickMatch,
    setSaveError,
    setIsSubmitting,
  });

  return {
    quickMatch,
    holes,
    tees,
    courseName,
    courseCountryCode,
    currentHole,
    isLoading,
    loadError,
    saveError,
    avisoDelVaciado,
    isSubmitting,

    myParticipant,
    isCreator,
    isScorer,
    coveredParticipantIds,
    totalHoles,

    setCurrentHole,
    submitScore,
    holeScoresVisibles,
    pintadoDeMemoria,
    pendientes,
    perdidos,
    discrepancias,
    resuelveDiscrepancia,
    completeMatch,
    cancelMatch,
    refetch: fetchQuickMatch,
  };
};
