// Las casillas del hoyo en pantalla de la anotación de partida rápida
// (`QuickMatchScoringPage`): la tarjeta de cada barra y una casilla por jugador
// cubierto, o por bando en foursomes.
import {
  groupParticipantsBySide,
  sideCardHolder,
  sideEntryOf,
} from '../domain/services/FoursomesSides';
import MatchPlayStrokeAllocator from '../domain/services/MatchPlayStrokeAllocator';
import { conMiNombrePrimero } from './ordenDeLasTarjetas';

export const casillasDelHoyo = ({
  quickMatch,
  holes,
  tees,
  currentHole,
  myParticipant,
  coveredParticipantIds,
  holeScoresVisibles,
}) => {
  // El par, el índice y los metros son de la barra de CADA jugador, no de una
  // común: en 56 de los 800 campos federados el índice cambia entre barras y en
  // 25 el par, y quien anota puede estar anotando a alguien de otra barra. Con
  // una sola tarjeta se le pintaba —y se le dibujaba la figura— contra un par
  // que no era el suyo, mientras sus golpes sí venían resueltos por su barra.
  const holeFor = (participant) =>
    MatchPlayStrokeAllocator.holeCardFor(participant, holes, tees).find(
      (h) => h.holeNumber === currentHole,
    ) ?? null;

  // Reserva para quien no traiga el hoyo en su barra. No es neutra —`holes` es
  // la tarjeta de la PRIMERA barra—, pero es la misma para todos y la que ya
  // elige `holeCardFor` cuando una barra viene sin tarjeta. Lo que no vale es
  // caer a la barra de quien anota: eso le pinta a un jugador un par distinto
  // segun quien le este anotando.
  //
  // OJO: el reparto de golpes NO usa esta reserva. `holeCardFor` es todo o
  // nada —con que la barra traiga un hoyo, usa su tarjeta y descarta la del
  // campo—, asi que en una tarjeta parcial la pantalla enseña el indice del
  // campo y el reparto no cuenta ese hoyo. El backend hace lo mismo
  // (`TeeContextBuilder._card_for`), asi que hoy los dos calculos coinciden y
  // completar los huecos solo aqui los separaria. Ver RyderCupAm#215.
  const courseHoleData =
    holes.find((h) => h.holeNumber === currentHole) ?? null;

  const currentHoleData = holeFor(myParticipant) ?? courseHoleData;

  const participantOf = (participantId) =>
    quickMatch?.participants?.find((p) => p.participantId === participantId);

  // La ANOTACIÓN del hoyo, no el número: es lo único que separa el hoyo
  // recogido —entrada con `score` nulo— del que está sin anotar, donde no hay
  // entrada. Los dos dan `score` nulo y significan lo contrario.
  const entryOf = (participantId) =>
    holeScoresVisibles.find(
      (hs) =>
        hs.holeNumber === currentHole && hs.participantId === participantId,
    ) ?? null;

  const playerEntries = () =>
    coveredParticipantIds.map((participantId) => {
      const participant = participantOf(participantId);
      const entry = entryOf(participantId);
      return {
        participantId,
        scoreIds: [participantId],
        name: participant?.name ?? '',
        score: entry?.score ?? null,
        isPickedUp: entry != null && entry.score == null,
        hole: holeFor(participant) ?? courseHoleData,
      };
    });

  // Foursomes se juega a golpes alternos con UNA bola por bando: una casilla
  // por equipo, no una por jugador. Con cuatro casillas, anotar como se juega
  // —cada hoyo a nombre de quien golpeó— dejaba media tarjeta a nombre del
  // compañero, el total del bando perdía esos hoyos y el partido se quedaba sin
  // un solo hoyo válido. Ver RyderCupWeb#420 y RyderCupAm#216.
  //
  // La casilla se guarda a nombre del participante del bando que este anotador
  // cubre: así la rellena cualquiera de los dos —quien tenga el móvil— sin
  // depender de cómo se hayan repartido los anotadores.
  const sideEntries = () =>
    groupParticipantsBySide(quickMatch?.participants ?? [])
      .map((members) => {
        // Una bola, una fila: se guarda a nombre del primer jugador del bando
        // la anote quien la anote. A nombre de quien tuviera el móvil, los dos
        // anotadores escribían filas distintas del mismo golpe.
        //
        // Con la anotación cruzada del backend todos cubren a los cuatro, así
        // que esa fila siempre se puede escribir. Si no —un backend aún sin ese
        // reparto, o un detalle sin `scoringAssignments`— se escribe bajo el
        // primer miembro que sí se cubra: preferible a dejar al compañero con
        // la pantalla en blanco y sin poder anotar.
        const cardHolder = sideCardHolder(members);
        const writable = coveredParticipantIds.includes(
          cardHolder.participantId,
        )
          ? cardHolder
          : members.find((m) =>
              coveredParticipantIds.includes(m.participantId),
            );
        if (!writable) return null;
        // Lo que se lee tiene que ser lo que se escribe. Cuando el respaldo
        // manda, la casilla seguía enseñando la fila del titular: corriges el
        // golpe, se guarda bajo otro, y la pantalla te devuelve el viejo como
        // si la corrección se hubiera perdido.
        const readOrder =
          writable === cardHolder ? members : [writable, ...members];
        const entry = sideEntryOf(readOrder, entryOf);
        return {
          participantId: writable.participantId,
          scoreIds: members.map((m) => m.participantId),
          // El mismo bando se llama igual aquí que en la tarjeta: quien mira va
          // delante (FE #550). Se ordena SOLO el texto —`scoreIds`, `side` y el
          // participante bajo el que se escribe salen de `members` sin tocar—,
          // que es lo que mantiene la bola a nombre del titular del bando.
          name: conMiNombrePrimero(
            members,
            (m) => m.participantId === myParticipant?.participantId,
          )
            .map((m) => m.name)
            .join(' & '),
          score: entry?.score ?? null,
          isPickedUp: entry != null && entry.score == null,
          // Comparten bola, así que comparten tarjeta: la del primero del bando,
          // la misma para los dos y no la de quien tenga el móvil.
          hole: holeFor(cardHolder) ?? courseHoleData,
          side: cardHolder.participantId,
        };
      })
      .filter(Boolean);

  const isFoursomes = quickMatch?.matchFormat === 'FOURSOMES';
  const entries = isFoursomes ? sideEntries() : playerEntries();

  return { currentHoleData, entries };
};
