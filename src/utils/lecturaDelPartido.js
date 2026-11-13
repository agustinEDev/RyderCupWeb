// Lo que la pantalla de anotación de competición (`ScoringPage`) cuenta del
// partido entero: sus fallos, su marcador, su cierre y la entrega. Las que
// devuelven texto reciben la `t` de la pantalla (espacio `scoring`).

// Lo que se le cuenta al jugador cuando algo falla, con NUESTRAS palabras.
//
// El `message` del error no sirve para esto: `api.js` lo rellena con el
// `detail` del backend —que viene en inglés— o compone «HTTP 503: Service
// Unavailable» cuando no hay cuerpo que parsear; y un fallo sin respuesta trae
// el texto interno de `fetch`. Nada de eso significa nada para quien lo lee.
//
// Una sola regla para los DOS sitios donde se enseña un fallo —la pantalla sin
// vista y el recuadro con el partido ya pintado—: arreglar solo el primero
// dejaba el mismo texto crudo saliendo por el otro (CodeRabbit en la PR #618)
const CLAVE_POR_ESTADO = { 403: 'errors.forbidden', 404: 'errors.notFound' };
export const motivoDe = (t, err) => {
  const clave = CLAVE_POR_ESTADO[err?.status ?? err?.response?.status];
  return clave ? t(clave) : t('offline.noSePudoCargar');
};

// Pero esa regla es la de NO HABER PODIDO CARGAR, y el recuadro enseña también
// lo que falla al anotar, entregar o conceder: con ella un golpe rechazado, o
// que no cupo en el móvil, se contaba como «no se ha podido cargar el
// partido» (FE #626). Lo de una acción dice primero lo suyo, si trae clave
// —el móvil lleno, que no tiene estado HTTP—, y si no, qué acción falló.
// Nunca el `message`, por lo mismo que arriba. Lo que no dice de dónde viene
// se sigue tomando por un fallo de carga, que es lo que era siempre
const CLAVE_POR_ACCION = {
  golpe: 'errors.failedToSubmitScore',
  tarjeta: 'errors.failedToSubmitScorecard',
  concesion: 'errors.failedToConcede',
  retirada: 'withdraw.failed',
};
export const esFalloDeUnaAccion = (origenDelError) =>
  Boolean(CLAVE_POR_ACCION[origenDelError]);
// Un error del hook puede traer la CLAVE de su texto: la pantalla pintaba
// `error.message` tal cual, y así salía castellano fijo en la app en inglés
export const textoDelFallo = (t, err, origenDelError) => {
  if (!esFalloDeUnaAccion(origenDelError)) return motivoDe(t, err);
  const texto = err?.i18nKey
    ? t(err.i18nKey)
    : t(CLAVE_POR_ACCION[origenDelError]);
  return err?.holeNumber != null
    ? `${texto} ${t('errors.enElHoyo', { hole: err.holeNumber })}`
    : texto;
};

/**
 * Cómo acabó el partido, si acabó: decidido (con el nombre del equipo que
 * gana) y cerrado sin jugarlo hasta el final.
 */
export const cierreDelPartido = (scoringView) => {
  // El resultado de un partido ya decidido, con el nombre del equipo que gana
  const ganadorDecidido = scoringView?.decidedResult?.winner;
  const resultadoDecidido =
    ganadorDecidido === 'A' || ganadorDecidido === 'B'
      ? {
          team:
            ganadorDecidido === 'A'
              ? scoringView.teamAName
              : scoringView.teamBName,
          score: scoringView.decidedResult.score,
        }
      : null;
  // Cerrado sin jugarlo hasta el final —concedido o walkover—: ya no queda
  // nada que anotar ni que entregar, y se dice como en la clasificación (#732)
  const cerradoSinJugar =
    scoringView?.matchStatus === 'CONCEDED' ||
    scoringView?.matchStatus === 'WALKOVER';
  const claveDelCierre =
    scoringView?.matchStatus === 'WALKOVER' ? 'walkover' : 'conceded';
  const cierre =
    cerradoSinJugar && resultadoDecidido
      ? { team: resultadoDecidido.team }
      : null;
  return { resultadoDecidido, cerradoSinJugar, claveDelCierre, cierre };
};

// El marcador de la cabecera, que repite la barra de entregar (FE #745).
// Decidido, su resultado y no el marcador del último hoyo jugado: un 4&2 que
// siguió hasta el 18 decía «4UP» (#710)
export const textoDelMarcador = (
  t,
  scoringView,
  { cierre, claveDelCierre, cerradoSinJugar, resultadoDecidido },
) =>
  cierre
    ? t(`leaderboard.${claveDelCierre}`, cierre)
    : cerradoSinJugar
      ? // Sin ganador (un backend anterior): cerrado, sin el marcador de los
        // hoyos, que puede dar por ganador a quien concedió
        t('closed.title')
      : resultadoDecidido
        ? t('leaderboard.wins', resultadoDecidido)
        : !scoringView?.matchStanding
          ? null
          : scoringView.matchStanding.status === 'AS'
            ? t('input.allSquare')
            : `${scoringView.matchStanding.status} ${scoringView.matchStanding.leadingTeam === 'A' ? scoringView.teamAName : scoringView.teamBName}`;

// La barra de entregar la tarjeta, en las tres pestañas (FE #745): el botón
// vivía solo en Tarjeta y la pantalla abre en Anotar, así que quien acababa
// el 18 no veía nada. Solo para quien juega. En un partido cerrado sin
// jugar no se pide entregar —ya tiene su aviso—, pero quien entregó antes del
// cierre sí lee que está entregada y que ya no se espera a nadie
// El retirado del fourball no entrega: terminan los demás (RyderCupAM#665)
export const estadoDeEntrega = ({
  isMatchPlayer,
  isWithdrawn,
  hasSubmitted,
  cerradoSinJugar,
  canSubmitScorecard,
  partidoAcabado,
}) =>
  !isMatchPlayer || isWithdrawn
    ? null
    : hasSubmitted
      ? 'entregada'
      : cerradoSinJugar
        ? null
        : canSubmitScorecard
          ? 'entregar'
          : partidoAcabado
            ? 'faltaValidar'
            : null;

// Quién ganó, para la pantalla del resumen: el equipo y sus jugadores
export const ganadorDelResumen = (matchSummary, scoringView) => {
  const winnerTeam = matchSummary.result?.winner;
  const winnerTeamName =
    winnerTeam === 'A'
      ? scoringView?.teamAName
      : winnerTeam === 'B'
        ? scoringView?.teamBName
        : null;
  const winnerPlayerNames =
    winnerTeam === 'A' || winnerTeam === 'B'
      ? scoringView?.players
          ?.filter((p) => p.team === winnerTeam)
          .map((p) => p.userName)
          .join(' y ')
      : null;
  return winnerTeamName && winnerPlayerNames
    ? `${winnerTeamName} (${winnerPlayerNames})`
    : winnerTeamName;
};

// El resultado decidido para el aviso de partido decidido, con el nombre del
// equipo en vez de su letra
export const resultadoParaElAviso = (scoringView) =>
  scoringView?.decidedResult
    ? {
        ...scoringView.decidedResult,
        winner:
          scoringView.decidedResult.winner === 'A'
            ? scoringView.teamAName || 'A'
            : scoringView.decidedResult.winner === 'B'
              ? scoringView.teamBName || 'B'
              : scoringView.decidedResult.winner,
      }
    : null;
