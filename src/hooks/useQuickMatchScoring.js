import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getQuickMatchUseCase,
  getGolfCourseUseCase,
  submitQuickMatchHoleScoreUseCase,
  submitQuickMatchProxyHoleScoreUseCase,
  completeQuickMatchUseCase,
  cancelQuickMatchUseCase,
} from '../composition';
import * as golpesPerdidos from '../utils/golpesPerdidos';
import { seGuardaParaDespues } from '../utils/politicaDeLaCola';
import * as offlineQueue from '../utils/scoringOfflineQueue';
import { loQueSeSupo, olvida, recuerda } from '../services/loUltimoConocido';

// Un minuto, y no diez segundos: esto es golf, entre hoyo y hoyo pasan minutos
// y preguntar seis veces por minuto gasta batería y datos para nada. Lo que no
// puede esperar —enviar lo que quedó guardado en el móvil— no depende del
// reloj: se dispara al volver la red y al volver a la aplicación, más abajo
const POLL_INTERVAL = 60000; // 1 minute

/**
 * Rechazos que no mejoran esperando, así que el golpe no se guarda para después.
 *
 * - 404: la partida ya no existe
 * - 403: no eres anotador, o no te toca ese jugador
 * - 409: la partida está terminada o cancelada
 * - 400: el golpe no es válido
 *
 * El 401 NO está: ahí el problema es la sesión, no el golpe, y descartarlo sería
 * tirar una anotación buena por un motivo que se arregla solo.
 */

/**
 * Si lo guardado y lo que hay en el servidor son un DESACUERDO, que es lo unico
 * que el jugador tiene que resolver (FE #528, FE #530).
 *
 * No basta con que los numeros difieran. Para que haya desacuerdo tiene que
 * haber alguien con quien discrepar:
 *
 * - Con un solo anotador no lo hay. Nadie mas ha podido anotar ese hoyo, asi
 *   que lo que hay en el servidor lo puso este mismo movil y lo nuevo es una
 *   correccion. Preguntaba «habla con tu companero y decidid cual vale» en una
 *   partida individual, y el companero era el propio jugador.
 * - Y aunque se comparta la anotacion, lo que anoto uno mismo tampoco se
 *   discute consigo mismo: corregir el 4 que puse por el 5 que jugue es
 *   corregir, no discrepar.
 *
 * Vale para las dos caras del mismo asunto: si se pregunta (la cola) y si se
 * pinta lo guardado encima de lo que hay (la tarjeta). Eran la misma decision
 * tomada en dos sitios, y solo una de ellas miraba quien habia anotado.
 *
 * LO QUE ESTO NO CUBRE: la misma cuenta en dos dispositivos. Si el movil tiene
 * un hoyo guardado sin enviar y desde la tableta se anota otro numero en ese
 * hoyo, lo de la tableta llega al servidor tambien como «lo anote yo», y al
 * volver la cobertura el movil lo pisa sin preguntar. Antes se preguntaba.
 * Compararlo por fecha pide un `recorded_at` que el DTO de hoyos no trae, asi
 * que se acepta a sabiendas: en el mismo dispositivo la cola se vacia al
 * enviar, y dos dispositivos a la vez con la misma cuenta es raro al lado de
 * preguntar «habla con tu companero» en una partida que juega uno solo.
 */
const esDesacuerdo = (enElServidor, entrada, partida, miParticipanteId) => {
  if (!enElServidor) return false;
  if (enElServidor.score === entrada.scoreData.score) return false;
  if ((partida?.scorerIds?.length ?? 0) <= 1) return false;
  // Sin saber quien lo anoto —o sin saber quien soy— se pregunta: es lo que no
  // rompe nada de nadie. Sin el primer termino, dos `undefined` se daban por
  // iguales y lo desconocido pasaba por propio, que es justo lo contrario
  if (miParticipanteId && enElServidor.recordedByParticipantId === miParticipanteId) return false;
  return true;
};

/**
 * Central hook for quick match scoring: fetches the match + course holes,
 * polls for updates, and exposes score submission (own + delegated).
 *
 * Quick match has no dual-validation, session lock or offline queue — a
 * single scorer records each hole directly, so the hook is intentionally
 * simpler than the tournament useScoring().
 */
export const useQuickMatchScoring = (quickMatchId, currentUserId) => {
  const [quickMatch, setQuickMatch] = useState(null);
  const [holes, setHoles] = useState([]);
  const [tees, setTees] = useState([]);
  const [courseName, setCourseName] = useState(null);
  const [currentHole, setCurrentHole] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  // Dos errores y no uno: el mismo status significa cosas distintas según de
  // dónde venga. Un 403 al cargar es "no juegas esta partida"; un 403 al anotar
  // es "no eres el anotador de ese jugador". Con un solo estado no había forma
  // de distinguirlos, y mirar si ya había partida en pantalla no vale: el
  // sondeo cada 10 s puede fallar mucho después de que la partida cargara, y
  // `fetchQuickMatch` conserva la anterior a propósito para no vaciar la
  // pantalla por un fallo de red pasajero.
  const [loadError, setLoadError] = useState(null);
  const [saveError, setSaveError] = useState(null);
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
  // Si lo que se está viendo sale de la memoria del móvil. Lo mira la pantalla
  // para avisar: sin esto, con un 5xx salía la partida entera bajo un error
  // rojo y sin decir que era una foto de antes
  const [pintadoDeMemoria, setPintadoDeMemoria] = useState(false);
  // Hoyos donde lo guardado no coincide con lo que hay: los resuelve el jugador
  const [discrepancias, setDiscrepancias] = useState([]);
  // Un solo cerrojo para las DOS escrituras —el vaciado y el envío directo—,
  // porque las dos escriben en el mismo sitio y el orden de llegada no lo
  // decide nadie: si el golpe viejo sale primero y llega el último, el servidor
  // se queda con el viejo y la corrección no está en ninguna parte, ni en la
  // cola —ya vaciada— ni en el servidor. Sin solaparse, el orden deja de
  // importar. Guardar en la cola no cuenta como escritura: no sale del móvil.
  const escribiendoRef = useRef(false);
  // El vaciado se declara más abajo y el sondeo está más arriba: la ref evita
  // reordenarlo todo y el ciclo de dependencias entre los dos
  const vaciarRef = useRef(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const holesLoadedRef = useRef(false);
  // El campo tal y como lo dio el backend, para poder volver a guardarlo sin
  // releerlo del almacenamiento
  const campoRef = useRef(null);
  // Si hay ya una partida pintada. Por referencia y no por estado: ponerlo en
  // las dependencias del sondeo lo reiniciaba en cada cambio de la partida
  const hayPartidaRef = useRef(false);
  // Numero de orden del estado: lo toman tanto el sondeo como las acciones que
  // cierran la partida. Un sondeo que salio ANTES del POST podia resolver
  // DESPUES y volver a aplicar su `IN_PROGRESS`, borrando el cierre: la
  // pantalla volvia a dejar anotar y cada guardado se estrellaba con un 409.
  const estadoSeqRef = useRef(0);
  // La partida que se está mirando AHORA. `estadoSeqRef` es un contador global
  // que no distingue de quién es cada respuesta: al ir de una partida a otra,
  // una petición de la anterior que siga en vuelo se aplicaba sobre la nueva
  const idVigenteRef = useRef(quickMatchId);
  const pollIntervalRef = useRef(null);

  const fetchQuickMatch = useCallback(async () => {
    if (!quickMatchId) {
      setIsLoading(false);
      return;
    }
    const miSeq = ++estadoSeqRef.current;
    try {
      const data = await getQuickMatchUseCase.execute(quickMatchId);
      // Si mientras tanto se cerro la partida —o entro otro sondeo—, esta
      // respuesta ya no es la ultima palabra y aplicarla retrocederia el estado
      if (miSeq !== estadoSeqRef.current || quickMatchId !== idVigenteRef.current) return;
      setQuickMatch(data);
      hayPartidaRef.current = true;
      setLoadError(null);

      // El sondeo ha respondido, así que hay conexión: es el momento de enviar
      // lo que quedó guardado. Se le pasan los hoyos que el servidor ya tiene,
      // que vienen en esta misma respuesta, para poder comparar sin pedir nada
      vaciarRef.current?.(data);

      if (!holesLoadedRef.current) {
        holesLoadedRef.current = true;
        try {
          const course = await getGolfCourseUseCase.execute(data.golfCourseId);
          // El campo tarda más que la partida, así que es el que más fácil
          // llega tarde. Y `holes` no se vuelve a escribir nunca: aplicarlo
          // aquí dejaba la partida nueva con los pares y los índices de la
          // anterior el resto de la sesión, y el siguiente sondeo los guardaba
          if (quickMatchId !== idVigenteRef.current) return;
          setHoles(course.holes || []);
          setTees(course.tees || []);
          setCourseName(course.name ?? null);
          // La partida Y su campo: sin hoyos no hay par ni índice, y la
          // pantalla no se puede dibujar aunque se sepa quién juega
          campoRef.current = course;
          recuerda(quickMatchId, { partida: data, campo: course });
        } catch {
          if (quickMatchId !== idVigenteRef.current) return;
          holesLoadedRef.current = false;
          recuerda(quickMatchId, { partida: data, campo: campoRef.current });
        }
      } else {
        // Desde lo que ya se tiene, y NO releyendo lo que se va a sobrescribir:
        // si la entrada se hubiera desalojado, esa relectura daba `null` y el
        // sondeo dejaba sin campo la partida que está en pantalla, con lo que
        // la siguiente vez sin señal no había hoyos con los que pintar nada
        recuerda(quickMatchId, { partida: data, campo: campoRef.current });
      }
      setPintadoDeMemoria(false);
    } catch (err) {
      const estado = err?.status ?? err?.response?.status;

      // Una respuesta CON estado es una respuesta: si el servidor dice que esa
      // partida ya no está —o que no es nuestra— pintarla desde el móvil sería
      // enseñar algo que no existe, y dejar anotar encima
      if (estado === 404 || estado === 403) olvida(quickMatchId);

      // Se pinta lo último que se supo, que es lo que permite seguir anotando
      // al volver a abrir la aplicación en el campo. `loadError` se queda
      // puesto a propósito: es lo que la pantalla mira para decir que puede no
      // estar al día.
      //
      // Salvo que el servidor haya dicho algo que lo desmienta: que la partida
      // no está o no es nuestra (404, 403), o que no hemos entrado (401). Un
      // 5xx no desmiente nada —el backend está mal, la partida sigue ahí— y con
      // él tampoco se puede anotar, así que ahí lo guardado hace falta igual
      const desmentido = estado === 401 || estado === 403 || estado === 404;
      // Y solo cuando no hay NADA en pantalla. Lo guardado sirve para arrancar
      // sin señal, no para corregir a una pantalla que ya está funcionando:
      // cerrar la partida se aplica en local a propósito —para que un corte
      // justo después del POST no la deje viva— y reponer aquí la foto de
      // antes la devolvía a «en curso», con la pantalla dejando anotar otra vez
      const recordado = desmentido || hayPartidaRef.current ? null : loQueSeSupo(quickMatchId);
      if (recordado && miSeq === estadoSeqRef.current && quickMatchId === idVigenteRef.current) {
        setQuickMatch(recordado.partida);
        hayPartidaRef.current = true;
        setPintadoDeMemoria(true);
        if (recordado.campo) {
          campoRef.current = recordado.campo;
          setHoles(recordado.campo.holes || []);
          setTees(recordado.campo.tees || []);
          setCourseName(recordado.campo.name ?? null);
          holesLoadedRef.current = true;
        }
      }

      if (quickMatchId === idVigenteRef.current) setLoadError(err);
    } finally {
      // Si no, una respuesta rezagada de la partida anterior quitaba la espera
      // de la nueva estando todavía sin datos, y la pantalla pintaba la tarjeta
      // vacía —sin nombre, sin jugadores y con dieciocho «Anotar»—
      if (quickMatchId === idVigenteRef.current) setIsLoading(false);
    }
  }, [quickMatchId]);

  // La ruta no lleva `key`, así que ir de una partida a otra reutiliza este
  // hook: sin limpiar, el aviso rojo y el conflicto de la partida anterior se
  // quedarían en pantalla contra los hoyos de la nueva
  useEffect(() => {
    idVigenteRef.current = quickMatchId;
    hayPartidaRef.current = false;
    campoRef.current = null;
    holesLoadedRef.current = false;
    // Y lo que se está viendo: si la nueva no llega a cargar —y no hay nada
    // guardado de ella— se quedaba en pantalla la partida ANTERIOR, con sus
    // hoyos y su campo, lista para anotar encima
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset on match change, same pattern as the fetch effect below
    setQuickMatch(null);
    setHoles([]);
    setTees([]);
    setCourseName(null);
    setPintadoDeMemoria(false);
    setIsLoading(true);
    setLoadError(null);
    setPerdidos([]);
    setDiscrepancias([]);
    setPendientes(quickMatchId ? offlineQueue.size(quickMatchId, currentUserId) : 0);
  }, [quickMatchId, currentUserId]);

  // Los dos momentos en los que de verdad importa preguntar, y que el reloj no
  // ve: cuando el navegador dice que vuelve la red, y cuando el jugador vuelve
  // a la aplicación —saca el móvil del bolsillo al llegar al hoyo—. El aviso
  // del navegador no vale como verdad —en un campo con dos barras dice que hay
  // conexión sin haberla— pero sí como excusa para probar: si el intento sale,
  // es que había
  useEffect(() => {
    // La vuelta de la red se aprovecha SIEMPRE, se esté mirando o no: es una
    // ocasión de sacar del móvil lo que quedó guardado, y desaprovecharla
    // porque la pantalla esté en segundo plano no le ahorra nada a nadie
    const alVolverLaRed = () => fetchQuickMatch();
    // La visibilidad, en cambio, solo cuando se vuelve: el mismo evento avisa
    // de que la aplicación se va al fondo, y ahí no hay nada que preguntar
    const alVolverALaApp = () => {
      if (document.visibilityState !== 'visible') return;
      fetchQuickMatch();
    };
    window.addEventListener('online', alVolverLaRed);
    document.addEventListener('visibilitychange', alVolverALaApp);

    return () => {
      window.removeEventListener('online', alVolverLaRed);
      document.removeEventListener('visibilitychange', alVolverALaApp);
    };
  }, [fetchQuickMatch]);

  useEffect(() => {
    holesLoadedRef.current = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch + polling, same pattern as useScoring.js
    fetchQuickMatch();
    pollIntervalRef.current = setInterval(fetchQuickMatch, POLL_INTERVAL);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [fetchQuickMatch]);

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
    if (guardados.length === 0) return delServidor;

    const salida = [...delServidor];
    for (const entrada of guardados) {
      const i = salida.findIndex(
        (hs) => hs.holeNumber === entrada.holeNumber && hs.participantId === entrada.participantId
      );
      const mio = {
        holeNumber: entrada.holeNumber,
        participantId: entrada.participantId,
        score: entrada.scoreData.score,
        recordedByParticipantId: null,
      };
      if (i === -1) salida.push(mio);
      // En un desacuerdo manda el del servidor hasta que el jugador decida: lo
      // suyo está en cuestión, y elegirlo por él es justo lo que no se hace.
      // Fuera de ahí se pinta lo guardado, que es lo que el jugador acaba de
      // anotar: sin esto, corregir un hoyo sin cobertura no se veía —la casilla
      // seguía con el número de antes— y se anotaba dos veces (FE #530)
      else if (
        entrada.scoreData.decidido ||
        !esDesacuerdo(salida[i], entrada, quickMatch, myParticipant?.participantId)
      ) {
        salida[i] = mio;
      }
    }
    return salida;
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

  /**
   * Envía un golpe guardado. Devuelve qué hacer con él.
   */
  const enviaGuardado = useCallback(
    async (entrada, miParticipanteId) => {
      const { holeNumber, participantId, scoreData } = entrada;
      try {
        if (participantId === miParticipanteId) {
          await submitQuickMatchHoleScoreUseCase.execute(quickMatchId, holeNumber, scoreData.score);
        } else {
          await submitQuickMatchProxyHoleScoreUseCase.execute(quickMatchId, participantId, holeNumber, scoreData.score);
        }
        return 'enviado';
      } catch (err) {
        // Mismo criterio que al anotar: lo que no mejora esperando se descarta,
        // y lo demás para el vaciado entero para reintentarlo luego
        return seGuardaParaDespues(err) ? 'para' : 'descartar';
      }
    },
    [quickMatchId]
  );

  /**
   * Vacía lo guardado. Lo dispara el sondeo al responder: si responde, hay
   * conexión, y no hace falta deducir un estado global de la red.
   */
  const vaciaLoGuardado = useCallback(
    async (partida) => {
      if (!quickMatchId) return;
      // Una vez a la vez: un golpe no puede enviarse por duplicado
      if (escribiendoRef.current) return;
      escribiendoRef.current = true;

      try {
        // Todo sale de la respuesta, no del estado: cuando el primer sondeo
        // dispara el vaciado, `quickMatch` todavia es null y `myParticipant`
        // seria null, asi que un golpe propio se enviaria como proxy
        const anotadosEnElServidor = partida?.holeScores ?? [];
        const miParticipanteId = partida?.participants?.find(
          (p) => p.userId === currentUserId
        )?.participantId;

        // Primero se clasifica la cola ENTERA, y solo despues se envia. Al
        // reves, un envio que se atasca corta el bucle antes de mirar los
        // hoyos que vienen detras, y el aviso de un conflicto que el jugador
        // estaba leyendo se cerraria solo
        const enConflicto = [];
        const porEnviar = [];
        for (const entrada of offlineQueue.getByMatch(quickMatchId, currentUserId)) {
          const enElServidor = anotadosEnElServidor.find(
            (hs) => hs.holeNumber === entrada.holeNumber && hs.participantId === entrada.participantId
          );

          // Ya está en el servidor con ese mismo resultado: enviarlo otra vez
          // no añade nada, y sí puede restar —un 409 lo daría por perdido y le
          // pediría al jugador que volviera a anotar lo que ya está anotado
          if (enElServidor && enElServidor.score === entrada.scoreData.score) {
            offlineQueue.remove(quickMatchId, entrada.holeNumber, entrada.participantId, entrada.userId ?? null);
            continue;
          }

          // Hay desacuerdo con OTRO anotador: no se envía. La aplicación no
          // sabe quién tiene razón, así que lo decide el jugador. Salvo que ya
          // lo haya decidido: entonces no se le vuelve a preguntar lo mismo.
          // Lo que no es desacuerdo —una corrección propia, o una partida que
          // anota una sola persona— se envía sin preguntar nada (FE #528)
          if (!entrada.scoreData.decidido && esDesacuerdo(enElServidor, entrada, partida, miParticipanteId)) {
            enConflicto.push({
              holeNumber: entrada.holeNumber,
              participantId: entrada.participantId,
              mio: entrada.scoreData.score,
              enElServidor: enElServidor.score,
              anotadoPor: enElServidor.recordedByParticipantId,
            });
            continue;
          }

          porEnviar.push(entrada);
        }
        setDiscrepancias(enConflicto);

        let algoLlegoAlServidor = false;
        for (const apuntada of porEnviar) {
          // Se relee justo antes de mandarla: entre el reparto de arriba y
          // este momento hay envios en vuelo, y el jugador puede haber
          // decidido sobre ella. Mandar la copia vieja seria enviar un golpe
          // que acaba de descartar
          const entrada = offlineQueue
            .getByMatch(quickMatchId, currentUserId)
            .find((e) => e.holeNumber === apuntada.holeNumber && e.participantId === apuntada.participantId);
          if (!entrada) continue;

          const queHacer = await enviaGuardado(entrada, miParticipanteId);
          if (queHacer === 'para') break;

          if (queHacer === 'descartar') {
            // En la pantalla, para poder decir qué hoyos repetir. Y TAMBIÉN en
            // el almacén, que sobrevive a salir de aquí: sin eso, el jugador
            // que navega o cierra la aplicación se queda sin el aviso y sin el
            // golpe, que ya se borró de la cola (FE #521)
            if (
              !golpesPerdidos.apunta({
                matchId: quickMatchId,
                matchName: laPartidaRef.current.matchName,
                matchNumber: null,
                holeNumber: entrada.holeNumber,
                userId: entrada.userId ?? currentUserId ?? null,
              })
            ) {
              // Sin aviso no se borra: preferible reintentarlo mil veces
              continue;
            }
            setPerdidos((antes) =>
              antes.some((x) => x.holeNumber === entrada.holeNumber && x.participantId === entrada.participantId)
                ? antes
                : [...antes, { holeNumber: entrada.holeNumber, participantId: entrada.participantId }]
            );
          } else {
            algoLlegoAlServidor = true;
          }
          // Se borra solo si sigue siendo la que se envió: mientras estaba en
          // vuelo, el jugador ha podido reanotar ese mismo hoyo y guardar otro
          // resultado. Borrar «el hoyo 5» a secas se lleva la corrección, el
          // servidor se queda con lo viejo, y nadie se entera
          const ahora = offlineQueue
            .getByMatch(quickMatchId, currentUserId)
            .find((e) => e.holeNumber === entrada.holeNumber && e.participantId === entrada.participantId);
          if (ahora && ahora.scoreData.score === entrada.scoreData.score) {
            offlineQueue.remove(quickMatchId, entrada.holeNumber, entrada.participantId, entrada.userId ?? null);
          }
        }

        setPendientes(offlineQueue.size(quickMatchId, currentUserId));

        // Lo enviado ya no esta en la cola, y la foto que hay en memoria es de
        // ANTES del envio, asi que tampoco lo trae: sin volver a pedirla, la
        // casilla vuelve a decir «Anotar» durante diez segundos y el jugador
        // anota el mismo hoyo dos veces. El cerrojo sigue puesto, de modo que
        // este sondeo no vuelve a vaciar y no hay vuelta sin fin
        if (algoLlegoAlServidor) await fetchQuickMatch();
      } finally {
        escribiendoRef.current = false;
      }
    },
    [quickMatchId, currentUserId, enviaGuardado, fetchQuickMatch]
  );

  // La ref se asigna en un efecto, no durante el render. El sondeo la lee
  // despues de su `await`, para entonces este efecto ya ha corrido
  useEffect(() => {
    vaciarRef.current = vaciaLoGuardado;
  }, [vaciaLoGuardado]);

  /**
   * El jugador decide, tras hablar con su compañero, qué anotación vale.
   */
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
  useEffect(() => {
    laPartidaRef.current = { matchName: quickMatch?.name ?? null, matchNumber: null };
  }, [quickMatch?.name]);

  const borraLoGuardadoDe = useCallback(
    (holeNumber, participantId) => {
      const guardada = offlineQueue
        .getByMatch(quickMatchId, currentUserId)
        .find((e) => e.holeNumber === holeNumber && e.participantId === participantId);
      if (!guardada) return;
      offlineQueue.remove(quickMatchId, holeNumber, participantId, guardada.userId ?? null);
    },
    [quickMatchId, currentUserId]
  );

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

      // Con un vaciado en marcha no se manda: se guarda, y sale en el
      // siguiente sondeo detrás de lo que ya iba. Mandarlo ahora es la carrera
      // de arriba, y ahí lo que se pierde es la corrección del jugador
      if (escribiendoRef.current) {
        if (offlineQueue.enqueue(quickMatchId, holeNumber, { score }, participantId, currentUserId, laPartidaRef.current) === false) {
          const fallo = new Error('No se pudo guardar el golpe en el dispositivo');
          fallo.holeNumber = holeNumber;
          setSaveError(fallo);
          return;
        }
        setPendientes(offlineQueue.size(quickMatchId, currentUserId));
        setSaveError(null);
        golpesPerdidos.olvidaEl(quickMatchId, holeNumber, currentUserId);
        setPerdidos((antes) =>
          antes.filter((x) => !(x.holeNumber === holeNumber && x.participantId === participantId))
        );
        return;
      }

      escribiendoRef.current = true;
      setIsSubmitting(true);
      // El aviso rojo pedía volver a anotarlo: ya está hecho. Se retira aquí y
      // no en la rama del envío bueno, porque si el golpe se queda otra vez en
      // el móvil sigue habiendo anotación —lo que ya no hay es nada perdido—, y
      // dejarlo puesto pediría repetir un hoyo que la tarjeta ya enseña
      golpesPerdidos.olvidaEl(quickMatchId, holeNumber, currentUserId);
      setPerdidos((antes) =>
        antes.filter((x) => !(x.holeNumber === holeNumber && x.participantId === participantId))
      );
      try {
        if (participantId === myParticipant?.participantId) {
          await submitQuickMatchHoleScoreUseCase.execute(quickMatchId, holeNumber, score);
        } else {
          await submitQuickMatchProxyHoleScoreUseCase.execute(quickMatchId, participantId, holeNumber, score);
        }
        setSaveError(null);
        // El servidor ya tiene lo bueno, así que lo que quedaba guardado de
        // ese mismo hoyo sobra. Dejarlo hace que el siguiente vaciado compare
        // lo viejo con lo que acaba de entrar, no coincidan, y se le pregunte
        // al jugador si quiere recuperar el resultado que él mismo corrigió
        borraLoGuardadoDe(holeNumber, participantId);
        setPendientes(offlineQueue.size(quickMatchId, currentUserId));
        await fetchQuickMatch();
      } catch (err) {
        if (seGuardaParaDespues(err)) {
          // Se guarda en el móvil y NO se enseña error: para el jugador el
          // golpe está anotado, solo que todavía no ha salido de aquí
          // Puede negarse: un iPhone sin espacio, o una ventana privada. Ahí
          // el golpe no está en ninguna parte, y callarlo es lo peor de todo
          if (offlineQueue.enqueue(quickMatchId, holeNumber, { score }, participantId, currentUserId, laPartidaRef.current) === false) {
            err.holeNumber = holeNumber;
            setSaveError(err);
          } else {
            setPendientes(offlineQueue.size(quickMatchId, currentUserId));
            setSaveError(null);
          }
        } else {
          // El servidor lo rechaza por algo que no cambia con el tiempo. Se
          // dice, y se dice DE QUÉ HOYO: el caso realista es anotar sin
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
    [quickMatchId, isScorer, myParticipant, fetchQuickMatch, currentUserId, borraLoGuardadoDe]
  );

  // Espejo de `completeMatch`: el backend exige creador para las dos
  // (`NotQuickMatchCreatorError`), asi que el boton vive donde el de terminar.
  const cancelMatch = useCallback(async () => {
    if (!quickMatchId || !isCreator) return { ok: false };

    setIsSubmitting(true);
    try {
      // Del DTO que devuelve la accion se toma SOLO el estado: es el DTO base
      // —sin `holeScores`, `standing` ni `participantStrokes`—, y aplicarlo
      // entero borraba la tarjeta y recalculaba el neto con cero golpes, es
      // decir numeros equivocados, no huecos. Se aplica igualmente y no se
      // espera al refetch porque si este falla —se cae la red justo despues
      // del POST— la pantalla seguiria creyendo la partida viva, editable y
      // anotando contra 409 en bucle.
      const actualizada = await cancelQuickMatchUseCase.execute(quickMatchId);
      // Invalida cualquier sondeo en vuelo: su foto es anterior al cierre
      estadoSeqRef.current += 1;
      if (actualizada) {
        setQuickMatch((previa) =>
          previa
            ? {
                ...previa,
                status: actualizada.status,
                isPending: actualizada.isPending,
                isInProgress: actualizada.isInProgress,
                isCompleted: actualizada.isCompleted,
                isCancelled: actualizada.isCancelled,
              }
            : actualizada
        );
      }
      setSaveError(null);
      await fetchQuickMatch();
      return { ok: true };
    } catch (err) {
      // El error NO va a `saveError`: ese banner lo traduce el mapa de errores
      // de anotar —«no se ha podido guardar el resultado»— y se queda pegado
      // hasta el siguiente guardado bueno. Se devuelve para que el dialogo
      // distinga un 409 —ya estaba cerrada— de quedarse sin cobertura.
      return { ok: false, error: err };
    } finally {
      setIsSubmitting(false);
    }
  }, [quickMatchId, isCreator, fetchQuickMatch]);

  const completeMatch = useCallback(async () => {
    if (!quickMatchId || !isCreator) return { ok: false };

    setIsSubmitting(true);
    try {
      // Del DTO que devuelve la accion se toma SOLO el estado: es el DTO base
      // —sin `holeScores`, `standing` ni `participantStrokes`—, y aplicarlo
      // entero borraba la tarjeta y recalculaba el neto con cero golpes, es
      // decir numeros equivocados, no huecos. Se aplica igualmente y no se
      // espera al refetch porque si este falla —se cae la red justo despues
      // del POST— la pantalla seguiria creyendo la partida viva, editable y
      // anotando contra 409 en bucle.
      const actualizada = await completeQuickMatchUseCase.execute(quickMatchId);
      estadoSeqRef.current += 1;
      if (actualizada) {
        setQuickMatch((previa) =>
          previa
            ? {
                ...previa,
                status: actualizada.status,
                isPending: actualizada.isPending,
                isInProgress: actualizada.isInProgress,
                isCompleted: actualizada.isCompleted,
                isCancelled: actualizada.isCancelled,
              }
            : actualizada
        );
      }
      setSaveError(null);
      await fetchQuickMatch();
      return { ok: true };
    } catch (err) {
      // Mismo motivo que en `cancelMatch`: su fallo no es un fallo de anotar.
      return { ok: false, error: err };
    } finally {
      setIsSubmitting(false);
    }
  }, [quickMatchId, isCreator, fetchQuickMatch]);

  return {
    quickMatch,
    holes,
    tees,
    courseName,
    currentHole,
    isLoading,
    loadError,
    saveError,
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
