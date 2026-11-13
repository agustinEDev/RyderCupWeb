import { useCallback, useRef } from 'react';
import { SE_ARREGLA_ESPERANDO, avisoTrasElVaciado, vaciaAnotaciones } from '../services/vaciaAnotaciones';
import { marcadoDe } from '../utils/golpesDelHoyo';
import * as offlineQueue from '../utils/scoringOfflineQueue';
import { conHoyosDe, estaSuperada } from '../utils/vistaDeLaAnotacion';

/**
 * La cola de golpes sin enviar de la anotación de competición, de
 * `useScoring`: qué hay en ella, el vaciado y el cerrojo que comparte con el
 * envío directo. Solo funciones y referencias, sin efectos: los disparadores
 * del vaciado siguen en el hook que la usa.
 */
export const useColaDelPartido = ({
  matchId,
  currentUserId,
  anota,
  esDeOtraPartida,
  marcaEscritura,
  fetchScoringView,
  setScoringView,
  setAvisoDelVaciado,
  setPendingQueueSize,
}) => {
  /**
   * Cuántas anotaciones de esta partida quedan por enviar, contando solo las
   * que este vaciado sabe mandar: las que llevan participante son de una
   * partida rápida y aquí se dejan estar, así que contarlas dejaba el número
   * en algo distinto de cero para siempre (FE #515).
   */
  const pendientesPropias = useCallback(
    () => offlineQueue.getByMatch(matchId, currentUserId).filter((e) => e.participantId == null).length,
    [matchId, currentUserId]
  );

  // Qué hay en la cola, en una cadena: cada hoyo con su hora de guardado, que
  // cambia también al corregirlo. Sirve para saber si la cola es la misma que
  // dejó el último vaciado (FE #625)
  const firmaDeLaCola = useCallback(
    () => offlineQueue.getByMatch(matchId, currentUserId)
      .filter((e) => e.participantId == null)
      .map((e) => `${e.holeNumber}:${e.timestamp}`)
      .sort()
      .join('|'),
    [matchId, currentUserId]
  );

  // --- Un escritor a la vez: el envío o el vaciado (FE #601) ---
  // El golpe se guarda en la cola ANTES de enviarlo, así que un vaciado que
  // arrancara con el envío en vuelo lo leería y lo mandaría otra vez; y un
  // envío lanzado con el vaciado en marcha podía llegar antes que lo viejo del
  // mismo hoyo y quedar pisado por ello. Quien llega con el otro dentro no
  // manda: el envío solo guarda y el vaciado no arranca, y lo dejan apuntado en
  // `aplazadoRef` para que quien lo tiene dé una pasada al terminar. Hace falta
  // porque el sondeo solo vacía si hay algo en la cola y el servidor contesta
  // (FE #625): sin esa pasada, lo aplazado esperaba al siguiente sondeo
  const ocupadoRef = useRef(null);
  const aplazadoRef = useRef(false);
  // La cola tal como la dejó el último vaciado que no se cortó por la red, el
  // servidor o la sesión: lo que quedó ahí lo dejó A PROPÓSITO —el móvil que no
  // escribe, una anotación que no se puede mandar— y el sondeo lo reenviaba
  // cada 10 s el resto de la vuelta (FE #625). Con `esperanASuHora`, si algo de
  // eso solo espera a que el partido abra: eso sí sale en cuanto abre. `null`
  // mientras ningún vaciado haya dejado nada a propósito
  const loQueDejoRef = useRef(null);

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
          const vista = await anota.execute(entrada.matchId, entrada.holeNumber, entrada.scoreData);
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
    return resultado;
  }, [matchId, fetchScoringView, pendientesPropias, currentUserId, marcaEscritura, esDeOtraPartida, anota, setScoringView, setAvisoDelVaciado, setPendingQueueSize]);

  // Un solo vaciado a la vez. Hay cuatro disparadores —montar, `online`, el sondeo y
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
      let esperan;
      do {
        aplazadoRef.current = false;
        ({ paroPor, esperan } = await vaciaLaDeEstaPartida());
        // Lo anotado mientras iba esta pasada solo se guardó, y puede ser un
        // hoyo que la pasada no llegó a leer. Otra más, salvo que se parara
        // por la red o por el disco: eso no se arregla insistiendo
      } while (aplazadoRef.current && paroPor === null && pendientesPropias() > 0);
      // Un paro de red, servidor o sesión no dice nada de lo que quedó: no
      // llegó a intentarlo todo. Así que no toca lo que se sabía, igual que
      // `avisoTrasElVaciado`; si lo borrara, un corte de cobertura le quitaba
      // el freno al disco que no borra, y el sondeo reenviaba lo ya llegado
      if (!SE_ARREGLA_ESPERANDO.has(paroPor)) {
        loQueDejoRef.current = { firma: firmaDeLaCola(), esperanASuHora: esperan > 0 };
      }
    } finally {
      ocupadoRef.current = null;
    }
  }, [vaciaLaDeEstaPartida, pendientesPropias, firmaDeLaCola]);

  // Lo guardado de este jugador para ese hoyo y ese marcado: quien marca a dos
  // tiene una por rival. Sin participante: las que lo llevan son de partida rápida
  const loGuardadoDe = useCallback(
    (holeNumber, marcado = null) => offlineQueue.getByMatch(matchId, currentUserId).find(
      (e) => e.holeNumber === holeNumber
        && e.participantId == null
        && (e.userId ?? null) === (currentUserId ?? null)
        && marcadoDe(e.scoreData) === marcado
    ),
    [matchId, currentUserId]
  );

  // Tras llegar un envío sobra lo que quedaba guardado de ese hoyo y ya está
  // superado: lo anterior —también una huérfana de antes de que la cola
  // guardara dueño— y lo propio. Lo que NO sobra es una corrección hecha con la
  // petición en vuelo, que sale en la pasada siguiente
  // Del mismo marcado: lo de un rival no supera lo del otro (26 oct 2026)
  const borraLoSuperado = useCallback(
    (holeNumber, loEnviado) => {
      const marcado = marcadoDe(loEnviado.scoreData);
      const superadas = offlineQueue
        .getByMatch(matchId, currentUserId)
        .filter((e) => e.holeNumber === holeNumber && e.participantId == null)
        .filter((e) => marcadoDe(e.scoreData) === marcado)
        .filter((e) => estaSuperada(e, loEnviado));
      for (const guardada of superadas) {
        offlineQueue.remove(matchId, holeNumber, null, guardada.userId ?? null, marcado);
      }
    },
    [matchId, currentUserId]
  );

  return {
    ocupadoRef,
    aplazadoRef,
    loQueDejoRef,
    pendientesPropias,
    firmaDeLaCola,
    processQueue,
    loGuardadoDe,
    borraLoSuperado,
  };
};
