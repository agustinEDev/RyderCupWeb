import { useRef, useState } from 'react';
import { anotadoresAlVolver } from './anotadoresAlVolver';
import {
  MAX_SCORERS,
  oppositeTeam,
  firmaDeLosAnotadores,
  formaDeAnotar,
} from './createQuickMatchModalConstants';

// Con qué jugadores se eligieron los anotadores: si al volver al paso 3 son
// los mismos, se conservan (al repetir se perdían los copiados en silencio;
// pasada del Kind, 4 nov 2026). Si cambia alguien, se conserva lo elegido
// con quien juega ahora (`anotadoresAlVolver`)
// Sin jugadores copiados (el campo ya no valía), la primera entrada al paso
// 3 es la primera vez (revisor). La pareja elegida en foursomes, en cambio,
// sí se copia: es de la partida, no de sus jugadores (A5)
const elegidosAlCopiar = (copia) =>
  copia?.participants?.length
    ? {
        jugadores: copia.participants,
        modo: copia.mode,
        formato: copia.matchFormat,
      }
    : null;

const firmaDe = (f) => firmaDeLosAnotadores(f.jugadores, f.modo, f.formato);

/**
 * Quién anota en el borrador de partida rápida (paso 3): los anotadores
 * elegidos, lo que se conserva al volver a entrar y, en foursomes, la elección
 * de parejas.
 *
 * Los jugadores, el formato, el paso y el aviso son del asistente y llegan de
 * fuera.
 */
export const useAnotadoresDelBorrador = ({
  copia,
  currentUser,
  participants,
  registeredParticipants,
  mode,
  matchFormat,
  isFoursomes,
  setStep,
  setError,
}) => {
  const [scorerIds, setScorerIds] = useState(copia?.scorerIds ?? []);
  const anotadoresElegidosCon = useRef(elegidosAlCopiar(copia));
  // En foursomes, si quien crea eligió «las dos parejas» o «solo la mía» (o
  // la copiada al repetir). Lo que la app pone sola no cuenta como elección
  const parejasElegidas = useRef(copia?.parejasDeAnotadores ?? null);

  // En foursomes la pareja juega UNA bola, asi que no se elige quien anota a
  // quien jugador a jugador: se elige si apuntan las dos parejas —cada una
  // marca a la otra, como se juega— o solo la de quien crea la partida, que
  // entonces lleva las dos tarjetas. Dentro de una pareja puede apuntar
  // cualquiera de los dos, asi que entran todos sus registrados.
  const myTeam = () =>
    participants.find((p) => p.userId === currentUser.id)?.team ?? null;

  const registeredOfTeam = (team) =>
    registeredParticipants.filter((p) => (p.team ?? null) === team);

  const rivalCanScore = () =>
    isFoursomes && registeredOfTeam(oppositeTeam(myTeam())).length > 0;

  // Dentro de una pareja puede apuntar cualquiera de los dos, asi que aqui solo
  // importa si hay ALGUN registrado mas en mi bando.
  const partnerCanScore = () =>
    isFoursomes &&
    registeredOfTeam(myTeam()).some((p) => p.userId !== currentUser.id);

  // `choice` y no `mode`: `mode` es el estado del modal (MATCH_PLAY/FREE_PLAY).
  const chooseScoringSides = (choice) => {
    const mine = registeredOfTeam(myTeam());
    if (choice === 'MINE') {
      setScorerIds(mine.map((p) => p.participantId));
      return;
    }
    // Los DOS bandos, no todos los registrados: un registrado sin equipo no
    // juega en ninguna de las dos parejas y se colaba como anotador.
    setScorerIds(
      [...mine, ...registeredOfTeam(oppositeTeam(myTeam()))].map(
        (p) => p.participantId,
      ),
    );
  };

  // Lo que elige quien crea en el paso (no lo que pone la app sola)
  const eligeParejas = (eleccion) => {
    parejasElegidas.current = eleccion;
    chooseScoringSides(eleccion);
  };

  const eligeLosAnotadoresDePorDefecto = (creatorParticipant) => {
    if (isFoursomes) {
      // Las dos parejas por defecto; si enfrente no hay ninguna cuenta con la
      // que anotar, esa opcion ni se ofrece y se queda la del creador. Con los
      // mismos helpers que usa el paso: escrito aparte, "rival" era aqui todo
      // el que no fuera de mi bando —un registrado sin equipo incluido— y el
      // paso acababa ofreciendo una cosa distinta de la que quedaba marcada.
      chooseScoringSides(rivalCanScore() ? 'BOTH' : 'MINE');
    } else {
      setScorerIds(
        creatorParticipant ? [creatorParticipant.participantId] : [],
      );
    }
  };

  // Con otros jugadores (o modo/formato) que la última vez: se conserva lo
  // que se pueda y, si no, lo de por defecto
  const ajustaLosAnotadores = (antes, ahora, creatorParticipant) => {
    // Con otra forma de anotar, lo de por defecto, también en foursomes: una
    // pareja elegida antes ya no se ha visto (`/code-review`)
    if (
      antes &&
      formaDeAnotar(antes.modo, antes.formato) !==
        formaDeAnotar(mode, matchFormat)
    ) {
      parejasElegidas.current = null;
    }
    anotadoresElegidosCon.current = ahora;
    const conservados =
      !isFoursomes && creatorParticipant
        ? anotadoresAlVolver({
            antes,
            ahora,
            anotadores: scorerIds,
            yo: creatorParticipant.participantId,
          })
        : null;
    if (conservados) setScorerIds(conservados);
    else if (isFoursomes && parejasElegidas.current)
      chooseScoringSides(parejasElegidas.current);
    else eligeLosAnotadoresDePorDefecto(creatorParticipant);
  };

  const goToScorers = () => {
    const creatorParticipant = participants.find(
      (p) => p.userId === currentUser.id,
    );
    const antes = anotadoresElegidosCon.current;
    const ahora = { jugadores: participants, modo: mode, formato: matchFormat };
    if (!antes || firmaDe(antes) !== firmaDe(ahora)) {
      ajustaLosAnotadores(antes, ahora, creatorParticipant);
    }
    setError(null);
    setStep(3);
  };

  const toggleScorer = (participantId) => {
    setScorerIds((prev) => {
      if (prev.includes(participantId))
        return prev.filter((id) => id !== participantId);
      if (prev.length >= MAX_SCORERS) return prev;
      return [...prev, participantId];
    });
  };

  const goToSummary = () => {
    if (scorerIds.length === 0) {
      setError('create.scorers.errorMinScorers');
      return;
    }
    setError(null);
    setStep(4);
  };

  const handleBackToParticipants = () => {
    setError(null);
    setStep(2);
  };

  const handleBackToScorers = () => {
    setError(null);
    setStep(3);
  };

  return {
    scorerIds,
    toggleScorer,
    rivalCanScore,
    partnerCanScore,
    eligeParejas,
    goToScorers,
    goToSummary,
    handleBackToParticipants,
    handleBackToScorers,
  };
};
