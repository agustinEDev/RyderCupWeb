// Las reglas de la anotación de partida rápida (`useQuickMatchScoring`) con lo
// guardado en el móvil: qué es un desacuerdo, qué se pinta y qué se envía.

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
export const esDesacuerdo = (
  enElServidor,
  entrada,
  partida,
  miParticipanteId,
) => {
  if (!enElServidor) return false;
  if (enElServidor.score === entrada.scoreData.score) return false;
  if ((partida?.scorerIds?.length ?? 0) <= 1) return false;
  // Sin saber quien lo anoto —o sin saber quien soy— se pregunta: es lo que no
  // rompe nada de nadie. Sin el primer termino, dos `undefined` se daban por
  // iguales y lo desconocido pasaba por propio, que es justo lo contrario
  if (
    miParticipanteId &&
    enElServidor.recordedByParticipantId === miParticipanteId
  )
    return false;
  return true;
};

// La partida con ese golpe dentro, tal y como lo devolvió el envío. El envío de
// partida rápida contesta con el hoyo y no con la partida entera, así que se
// mete en su sitio —o se añade— y lo demás —clasificación, golpes recibidos—
// espera a la partida que se pide después
export const conGolpe = (partida, golpe) => {
  const mismo = (hs) =>
    hs.holeNumber === golpe.holeNumber &&
    hs.participantId === golpe.participantId;
  const antes = partida.holeScores ?? [];
  const holeScores = antes.some(mismo)
    ? antes.map((hs) => (mismo(hs) ? golpe : hs))
    : [...antes, golpe];
  return { ...partida, holeScores };
};

/**
 * Los golpes del servidor con lo guardado en la cola encima. Sin nada guardado
 * devuelve `delServidor` tal cual, el mismo objeto.
 */
export const conLoGuardadoEncima = (
  delServidor,
  guardados,
  partida,
  miParticipanteId,
) => {
  if (guardados.length === 0) return delServidor;

  const salida = [...delServidor];
  for (const entrada of guardados) {
    const i = salida.findIndex(
      (hs) =>
        hs.holeNumber === entrada.holeNumber &&
        hs.participantId === entrada.participantId,
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
      !esDesacuerdo(salida[i], entrada, partida, miParticipanteId)
    ) {
      salida[i] = mio;
    }
  }
  return salida;
};

/**
 * Clasifica la cola ENTERA antes de enviar nada: lo que ya está en el servidor
 * se borra con `borra` (que devuelve `false` si el disco no lo admite), lo que
 * es un desacuerdo con otro anotador va a `enConflicto` y el resto a
 * `porEnviar`, en el orden de la cola.
 */
export const clasificaLaCola = ({
  entradas,
  anotadosEnElServidor,
  partida,
  miParticipanteId,
  borra,
}) => {
  const enConflicto = [];
  const porEnviar = [];
  let elDiscoNoBorra = false;
  for (const entrada of entradas) {
    const enElServidor = anotadosEnElServidor.find(
      (hs) =>
        hs.holeNumber === entrada.holeNumber &&
        hs.participantId === entrada.participantId,
    );

    // Ya está en el servidor con ese mismo resultado: enviarlo otra vez
    // no añade nada, y sí puede restar —un 409 lo daría por perdido y le
    // pediría al jugador que volviera a anotar lo que ya está anotado
    if (enElServidor && enElServidor.score === entrada.scoreData.score) {
      // Si el borrado no entra, este disco no admite escrituras: mandar
      // el resto lo enviaría y lo dejaría en la cola, para volver a
      // enviarlo en el siguiente sondeo. Se avisa y no se manda nada;
      // se sigue clasificando para no cerrar un desacuerdo que el
      // jugador esté leyendo
      if (!borra(entrada)) {
        elDiscoNoBorra = true;
      }
      continue;
    }

    // Hay desacuerdo con OTRO anotador: no se envía. La aplicación no
    // sabe quién tiene razón, así que lo decide el jugador. Salvo que ya
    // lo haya decidido: entonces no se le vuelve a preguntar lo mismo.
    // Lo que no es desacuerdo —una corrección propia, o una partida que
    // anota una sola persona— se envía sin preguntar nada (FE #528)
    if (
      !entrada.scoreData.decidido &&
      esDesacuerdo(enElServidor, entrada, partida, miParticipanteId)
    ) {
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
  return { enConflicto, porEnviar, elDiscoNoBorra };
};

// Si una anotación guardada sobra tras enviar `loEnviado` ({ cuando, score }):
// sin decir qué se envió, todas. Si no, solo lo que ya está superado: lo
// anterior —una anotación vieja del mismo hoyo, o la huérfana de una versión
// sin dueño— sí se va, y una corrección hecha con la petición en vuelo se
// queda para el vaciado siguiente (FE #564).
//
// El empate de reloj se decide por el valor, no por el tiempo: dos
// anotaciones seguidas caen en el MISMO milisegundo más a menudo de lo
// que parece —lo cazó el CI, no esta máquina—, y comparando solo el
// reloj se borraba la corrección
export const sobraTrasEnviar = (guardada, loEnviado) => {
  if (loEnviado === null) return true;
  const cuando = guardada.timestamp ?? 0;
  if (cuando < loEnviado.cuando) return true;
  return (
    cuando === loEnviado.cuando && guardada.scoreData?.score === loEnviado.score
  );
};

// Del DTO que devuelve cerrar o cancelar se toma SOLO el estado: es el DTO
// base —sin `holeScores`, `standing` ni `participantStrokes`—, y aplicarlo
// entero borraba la tarjeta y recalculaba el neto con cero golpes. Sin partida
// previa, el DTO tal cual
export const conElEstadoDe = (previa, actualizada) =>
  previa
    ? {
        ...previa,
        status: actualizada.status,
        isPending: actualizada.isPending,
        isInProgress: actualizada.isInProgress,
        isCompleted: actualizada.isCompleted,
        isCancelled: actualizada.isCancelled,
      }
    : actualizada;
