// Lo que pinta la anotación de competición (`useScoring`): la vista del
// servidor, la cola encima y los hoyos que no se pudieron guardar.
import { GOLPES_DEL_HOYO, golpeBase } from './golpesDelHoyo';

// El golpe de competición es un objeto —propio, marcado y a quién—, no un
// número como en partida rápida: se compara entero
export const mismoGolpe = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Ningún hoyo sin guardar. Uno solo y congelado, para no dar un objeto nuevo en
// cada render a quien lo use de dependencia
export const SIN_HOYOS = Object.freeze({});

// La respuesta de un envío trae la vista entera, pero a veces sin hoyos: se
// conservan los que había (resiliencia ante ese fallo del backend). Una sola
// vez, porque la pintan el envío directo y el vaciado
export const conHoyosDe = (vista, antes) => ({
  ...vista,
  holes: vista.holes?.length > 0 ? vista.holes : antes?.holes || [],
});

// Si una anotación guardada queda superada por lo que se acaba de enviar: es
// anterior, o es esa misma. Una posterior es una corrección hecha con la
// petición en vuelo, y esa NO. Una sola regla para retirar lo que llegó y para
// apartar lo rechazado: con dos, una anotación vieja se retiraba en un camino
// y en el otro se quedaba para reenviarse. El empate de reloj lo decide el
// golpe: dos anotaciones caen en el mismo milisegundo más a menudo de lo que
// parece, y comparando solo la hora se borraba la corrección
export const estaSuperada = (guardada, loEnviado) => {
  const cuando = guardada.timestamp ?? 0;
  if (cuando < loEnviado.cuando) return true;
  return (
    cuando === loEnviado.cuando &&
    mismoGolpe(guardada.scoreData, loEnviado.scoreData)
  );
};

/**
 * Los hoyos del servidor con lo guardado en la cola encima (FE #606). Recibe
 * solo las anotaciones de esta pantalla (sin participante: las que lo llevan
 * son de partida rápida). Sin nada que poner encima devuelve `delServidor` tal
 * cual, el mismo objeto.
 */
export const conLaColaEncima = (delServidor, guardadas, currentUserId) => {
  if (guardadas.length === 0) return delServidor;

  // Qué pone encima cada anotación. Guarda solo lo que se puso: un campo sin
  // valor no tapa lo que tiene el servidor
  const encimas = guardadas.flatMap((entrada) => {
    const { ownScore, markedPlayerId, markedScore } = entrada.scoreData ?? {};
    return [
      ...(ownScore !== undefined && currentUserId
        ? [
            {
              hoyo: entrada.holeNumber,
              jugador: currentUserId,
              campo: 'ownScore',
              valor: ownScore,
              marca: 'ownSubmitted',
            },
          ]
        : []),
      ...(markedScore !== undefined && markedPlayerId
        ? [
            {
              hoyo: entrada.holeNumber,
              jugador: markedPlayerId,
              campo: 'markerScore',
              valor: markedScore,
              marca: 'markerSubmitted',
            },
          ]
        : []),
    ];
  });
  if (encimas.length === 0) return delServidor;

  // Si la cola dice lo mismo que ya tiene el servidor, su validación sigue
  // valiendo. Y si no, ya no: la coincidencia entre anotadores era con otro
  // golpe. El neto propio, por lo mismo, es del golpe de antes
  const conEncima = (fila, encima) =>
    fila[encima.marca] && fila[encima.campo] === encima.valor
      ? fila
      : {
          ...fila,
          [encima.campo]: encima.valor,
          [encima.marca]: true,
          validationStatus: 'pending',
          // Para que el selector no lo dé por cerrado aunque el servidor ya
          // tenga resultado del hoyo: este golpe aún no ha llegado
          enCola: true,
          ...(encima.campo === 'ownScore' ? { netScore: null } : {}),
          // Lo de la cola es de quien anota aquí: ya no es del marcador de antes
          ...(encima.campo === 'markerScore'
            ? { markerBy: null, markerByName: null }
            : {}),
        };

  const hoyos = [
    ...new Set([
      ...delServidor.map((s) => s.holeNumber),
      ...encimas.map((e) => e.hoyo),
    ]),
  ];
  return hoyos.map((holeNumber) => {
    const delHoyo = delServidor.find((s) => s.holeNumber === holeNumber) ?? {
      holeNumber,
      playerScores: [],
    };
    const suyas = encimas.filter((e) => e.hoyo === holeNumber);
    if (suyas.length === 0) return delHoyo;
    const filas = delHoyo.playerScores ?? [];
    const jugadores = [
      ...new Set([
        ...filas.map((p) => p.userId),
        ...suyas.map((e) => e.jugador),
      ]),
    ];
    return {
      ...delHoyo,
      playerScores: jugadores.map((userId) =>
        suyas
          .filter((e) => e.jugador === userId)
          .reduce(
            conEncima,
            filas.find((p) => p.userId === userId) ?? { userId },
          ),
      ),
    };
  });
};

// Hacia fuera, los de un partido: cada hoyo con el turno de su último fallo
// —la pantalla lo usa para volver a montar su casilla— y qué golpes faltan,
// para saber si todavía se pueden anotar (FE #622)
export const turnosDeLosNoGuardados = (hoyos) => {
  if (!hoyos) return SIN_HOYOS;
  return Object.fromEntries(
    Object.entries(hoyos).map(([hoyo, { turno, golpes }]) => [
      hoyo,
      // En el orden de siempre; las marcas de quien marca a dos, por rival
      {
        turno,
        golpes: Object.keys(golpes).sort(
          (a, b) =>
            GOLPES_DEL_HOYO.indexOf(golpeBase(a)) -
              GOLPES_DEL_HOYO.indexOf(golpeBase(b)) || a.localeCompare(b),
        ),
      },
    ]),
  );
};
