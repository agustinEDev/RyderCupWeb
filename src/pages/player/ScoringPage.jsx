import { useEffect, useState } from 'react';
import { barraDe } from '../../domain/services/muestrasDeLaBarra';
import { useParams, useNavigate, Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import HeaderAuth from '../../components/layout/HeaderAuth';
import { useAuth } from '../../hooks/useAuth';
import { useScoring } from '../../hooks/useScoring';
import { useMapaDelHoyo } from '../../hooks/useMapaDelHoyo';
import BotonMapa from '../../components/scoring/mapa/BotonMapa';
import VentanaDelMapa from '../../components/scoring/mapa/VentanaDelMapa';
import { claveDelAvisoDelVaciado } from '../../utils/erroresDeAnotacion';
import { abreMasTarde, horaDelCampo } from '../../services/partidosSinCobertura';
import { getLeaderboardUseCase } from '../../composition';
import HoleInput from '../../components/scoring/HoleInput';
import HoleSelector from '../../components/scoring/HoleSelector';
import ScorecardTable from '../../components/scoring/ScorecardTable';
import LeaderboardView from '../../components/scoring/LeaderboardView';
import CampoDeLaPartida from '../../components/scoring/CampoDeLaPartida';
import MatchSummaryCard from '../../components/scoring/MatchSummaryCard';
import AnotarSinConexion from '../../components/scoring/AnotarSinConexion';
import SessionBlockedModal from '../../components/scoring/SessionBlockedModal';
import EarlyEndModal from '../../components/scoring/EarlyEndModal';
import BarraDeEntrega from '../../components/scoring/BarraDeEntrega';
import ConcedeMatchModal from '../../components/scoring/ConcedeMatchModal';
import RetiradaDelFourball from '../../components/scoring/RetiradaDelFourball';
import { opcionesDeRetirada, aQuienesMarco } from '../../domain/services/retiradaDelFourball';
import SubmitScorecardModal from '../../components/scoring/SubmitScorecardModal';
import PendientesASalvo from '../../components/scoring/PendientesASalvo';
import BlockLoader from '../../components/ui/BlockLoader';
import { GrupoDePestanas, ListaDePestanas, PanelDePestana } from '../../components/ui/Pestanas';

const TABS = ['input', 'scorecard', 'leaderboard'];

// `setTimeout` no aguanta más de 2^31-1 ms: pasado eso dispara INMEDIATAMENTE y
// en bucle. Una ronda a más de 24 días vista no necesita despertar a nadie
const MAXIMO_TEMPORIZADOR_MS = 2 ** 31 - 1;

const ScoringPage = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('scoring');
  const { t: tSchedule } = useTranslation('schedule');
  const { user, loading: isLoadingUser } = useAuth();

  const [activeTab, setActiveTab] = useState('input');
  const [leaderboard, setLeaderboard] = useState(null);
  const [showConcedeModal, setShowConcedeModal] = useState(false);
  // A quién anota quien marca a dos (F5), y en qué hoyo lo eligió: la elección
  // es del hoyo, y en el siguiente vuelve al primero sin golpe
  const [marcadoElegido, setMarcadoElegido] = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [earlyEndDismissed, setEarlyEndDismissed] = useState(false);
  const [, marcaLaHora] = useState(0);
  const {
    scoringView,
    scoresVisibles,
    currentHole,
    isLoading,
    error,
    origenDelError,
    isSubmitting,
    matchSummary,
    isOffline,
    isSessionBlocked,
    pendingQueueSize,
    noGuardados,
    avisoDelVaciado,
    pintadoDeMemoria,
    isMatchPlayer,
    canScore,
    hasSubmitted,
    isOwnScoreLocked,
    validatedHoles,
    totalHoles,
    holesToSubmit,
    canSubmitScorecard,
    partidoAcabado,
    setCurrentHole,
    submitScore,
    submitScorecard,
    concedeMatch,
    retirarJugador,
    isWithdrawn,
    marcaBloqueadaPara,
    marcadoPendienteEn,
    retirando,
    takeOverSession,
    refetch,
  } = useScoring(matchId, user?.id, user?.is_admin ?? false);

  // Los hoyos que no se pudieron guardar, en orden (FE #622). Los que ya no se
  // pueden anotar —sin permiso, o con bloqueados los golpes que se perdieron— no
  // piden volver a anotarlos, que sería pedir algo imposible: van en otra frase
  const hoyosNoGuardados = Object.keys(noGuardados).map(Number).sort((a, b) => a - b);
  // La marca, con el bloqueo de a quién iba: quien marca a dos puede tener uno
  // entregado y el otro no (/code-review, 26 oct 2026)
  const golpeBloqueado = (g, hoyo) =>
    g === 'ownScore' ? isOwnScoreLocked : marcaBloqueadaPara(
      noGuardados[hoyo].marcado ?? aQuienesMarco(scoringView?.markerAssignments, user?.id)[0]
    );
  const yaNoSeAnota = (hoyo) => !canScore || noGuardados[hoyo].golpes.every((g) => golpeBloqueado(g, hoyo));
  const porAnotar = hoyosNoGuardados.filter((h) => !yaNoSeAnota(h));
  const sinAnotar = hoyosNoGuardados.filter(yaNoSeAnota);

  // Un error del hook puede traer la CLAVE de su texto: la pantalla pintaba
  // `error.message` tal cual, y así salía castellano fijo en la app en inglés
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
  const motivoDe = (err) => {
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
  const falloDeUnaAccion = Boolean(CLAVE_POR_ACCION[origenDelError]);
  const textoDelFallo = (err) => {
    if (!falloDeUnaAccion) return motivoDe(err);
    const texto = err?.i18nKey ? t(err.i18nKey) : t(CLAVE_POR_ACCION[origenDelError]);
    return err?.holeNumber != null ? `${texto} ${t('errors.enElHoyo', { hole: err.holeNumber })}` : texto;
  };

  // Load leaderboard when tab changes to leaderboard
  useEffect(() => {
    if (activeTab === 'leaderboard' && scoringView?.competitionId) {
      getLeaderboardUseCase.execute(scoringView.competitionId)
        .then(setLeaderboard)
        .catch(() => {});
    }
  }, [activeTab, scoringView?.competitionId]);

  // Confirmar la entrega deja de ser posible si el marcador anota mientras el
  // diálogo está abierto. Ocultarlo no basta: `showSubmitModal` seguiría a true
  // y el diálogo reaparecería solo en cuanto la entrega volviera a ser posible,
  // sin que el jugador lo hubiera pedido otra vez. Se ajusta durante el render
  // —el patrón que documenta React para reaccionar a un cambio de valor— porque
  // hacerlo desde un efecto encadena renders y el lint del repo lo prohíbe
  // (react-hooks/set-state-in-effect).
  const [wasSubmittable, setWasSubmittable] = useState(canSubmitScorecard);
  if (wasSubmittable !== canSubmitScorecard) {
    setWasSubmittable(canSubmitScorecard);
    if (!canSubmitScorecard) {
      setShowSubmitModal(false);
    }
  }

  // Derived: show early end modal when match is decided and user hasn't dismissed.
  // Not shown once the player has already submitted — the "continue to submit" CTA
  // no longer applies, and re-showing it on every revisit is just noise.
  // El resultado de un partido ya decidido, con el nombre del equipo que gana
  const ganadorDecidido = scoringView?.decidedResult?.winner;
  const resultadoDecidido =
    ganadorDecidido === 'A' || ganadorDecidido === 'B'
      ? {
        team: ganadorDecidido === 'A' ? scoringView.teamAName : scoringView.teamBName,
        score: scoringView.decidedResult.score,
      }
      : null;
  // Cerrado sin jugarlo hasta el final —concedido o walkover—: ya no queda
  // nada que anotar ni que entregar, y se dice como en la clasificación (#732)
  const cerradoSinJugar =
    scoringView?.matchStatus === 'CONCEDED' || scoringView?.matchStatus === 'WALKOVER';
  const claveDelCierre = scoringView?.matchStatus === 'WALKOVER' ? 'walkover' : 'conceded';
  const cierre = cerradoSinJugar && resultadoDecidido ? { team: resultadoDecidido.team } : null;
  // Solo quien juega tiene una tarjeta que entregar: al que mira un partido
  // ajeno el aviso le pedía «Continuar para Enviar» (FE #740)
  const showEarlyEnd =
    !!scoringView?.isDecided &&
    isMatchPlayer &&
    !cerradoSinJugar &&
    !earlyEndDismissed &&
    !matchSummary &&
    !hasSubmitted;

  const currentUserId = user?.id;

  // El marcador de la cabecera, que repite la barra de entregar (FE #745).
  // Decidido, su resultado y no el marcador del último hoyo jugado: un 4&2 que
  // siguió hasta el 18 decía «4UP» (#710)
  const textoDelMarcador = cierre
    ? t(`leaderboard.${claveDelCierre}`, cierre)
    : cerradoSinJugar
    // Sin ganador (un backend anterior): cerrado, sin el marcador de los
    // hoyos, que puede dar por ganador a quien concedió
    ? t('closed.title')
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
  const estadoDeEntrega = !isMatchPlayer || isWithdrawn
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

  // Fourball con un retirado (F5): su pareja marca también al rival que él
  // marcaba, y elige a quién anota. Por defecto, al primero sin su golpe en este
  // hoyo; con uno solo, como siempre
  const misMarcados = aQuienesMarco(scoringView?.markerAssignments, currentUserId);
  const filaDelHoyo = scoresVisibles.find((s) => s.holeNumber === currentHole);
  const sinGolpeAqui = misMarcados.find(
    (id) => !filaDelHoyo?.playerScores?.find((ps) => ps.userId === id)?.markerSubmitted
  );
  // Lo que queda sin enviar del hoyo manda: la cola guarda una entrada por
  // hoyo, y cambiar de marcado la pisaría (25 oct 2026: uno cada vez)
  const pendienteAqui = marcadoPendienteEn(currentHole);
  const fijadoPorLaCola = misMarcados.length > 1 && misMarcados.includes(pendienteAqui);
  const elegidoAqui = marcadoElegido?.hoyo === currentHole ? marcadoElegido.id : null;
  const marcadoActivo = fijadoPorLaCola
    ? pendienteAqui
    : misMarcados.includes(elegidoAqui) ? elegidoAqui : (sinGolpeAqui ?? misMarcados[0]);
  const nombreDe = (id) => scoringView?.players?.find((p) => p.userId === id)?.userName ?? id;
  // Quien no marca a nadie no tiene asignación propia de la que sacarlo
  const quienMeMarcaId = scoringView?.markerAssignments?.find((ma) => ma.marksUserId === currentUserId)?.scorerUserId;
  const quienMeMarca = quienMeMarcaId ? nombreDe(quienMeMarcaId) : null;
  const markerAssignment = scoringView?.markerAssignments?.find(
    (ma) => ma.scorerUserId === currentUserId && ma.marksUserId === marcadoActivo
  );
  // Con el marcado elegido: con dos, el primero no dice nada del otro. Sin
  // marcado (el rival que marcaba al retirado) no hay marca que guardar
  const marcaBloqueada = marcaBloqueadaPara(markerAssignment?.marksUserId);

  // A quién marco, para «Anotas a …» del hoyo. En foursomes hay una bola por
  // pareja y se marca a la pareja rival (#710): «Luna / Óscar», no solo Luna.
  // Lo decía la tarjeta «Info del Partido», que se quitó para que la
  // navegación se viera sin desplazar la pantalla (16 oct)
  const formato = scoringView?.matchFormat;
  const jugadores = scoringView?.players;
  const marcoAId = markerAssignment?.marksUserId;
  // (sin useMemo: el compilador de React ya lo memoriza)
  const equipoMarcado = formato === 'FOURSOMES' && marcoAId ? jugadores?.find((p) => p.userId === marcoAId)?.team : null;
  const parejaMarcada = equipoMarcado
    ? jugadores.filter((p) => p.team === equipoMarcado).map((p) => p.userName).join(' / ')
    : '';
  const aQuienMarco = parejaMarcada || markerAssignment?.marksName || null;

  // Players who still need to submit their scorecard for the match to complete
  const esFoursomes = scoringView?.matchFormat === 'FOURSOMES';
  // El retirado no entrega: no se le espera (F4)
  const retirados = scoringView?.withdrawnPlayerIds ?? [];
  const pendingPlayers = scoringView?.players?.filter(
    (p) => !scoringView?.scorecardSubmittedBy?.includes(p.userId) && !retirados.includes(p.userId)
  ) ?? [];
  const opcionesDeLaRetirada = opcionesDeRetirada(scoringView, currentUserId);

  // El par, el índice y los metros son de la barra de CADA jugador: en 56 de
  // los 800 campos federados el índice cambia entre barras y en 25 el par.
  // El backend ya manda la tarjeta resuelta por jugador (RyderCupAm#213); esta
  // pantalla leía `holes`, que es la del campo, y le pintaba a quien no juega
  // la primera barra un par que no era el suyo. Ver RyderCupWeb#417.
  //
  // Reserva a la tarjeta del campo para quien venga sin la suya, que es lo que
  // manda el backend cuando no pudo cargar el campo.
  const holeCardOf = (userId) =>
    scoringView?.players?.find((p) => p.userId === userId)?.holeCard ?? [];
  const holeFor = (userId) =>
    holeCardOf(userId).find((h) => h.holeNumber === currentHole) ?? null;

  // Get current hole data
  const courseHoleData = scoringView?.holes?.find((h) => h.holeNumber === currentHole);
  const currentHoleData = holeFor(currentUserId) ?? courseHoleData;
  // Mi barra (color y sexo), como en stroke play: con ella la Ryder marca y
  // envía muestras del mapa (#880). Quien no juega el partido no tiene barra:
  // solo mide. En foursomes, la mía, no la del compañero
  const yo = scoringView?.players?.find((p) => p.userId === currentUserId);
  const miBarra = barraDe(yo);

  // La anotación de un partido programado abre sola a una hora (BE #305). Antes
  // de esa hora no se ofrecen casillas: el servidor las rechazaría y el golpe
  // se quedaría esperando en la cola sin que el jugador entienda por qué
  const aunNoAbre = abreMasTarde({
    status: scoringView?.matchStatus,
    scoringOpensAt: scoringView?.scoringOpensAt,
  });
  // El mapa del hoyo (BE #532): «Mapa» en la tarjeta lo abre a pantalla completa
  const mapaDelHoyo = useMapaDelHoyo({
    golfCourseId: scoringView?.roundInfo?.golfCourseId ?? null,
    cerrarSi: isSessionBlocked,
    // Su país: solo hay imagen en España (19 oct)
    pais: scoringView?.roundInfo?.golfCourseCountryCode ?? null,
  });
  // La hora del CAMPO, que es la que el servidor va a aplicar, no la del móvil:
  // `Intl` sin `timeZone` formatea en el huso del aparato, y un torneo canario
  // mirado desde la península anunciaba una hora que no era la suya. La cadena
  // del servidor ya trae su desfase, así que se toma la hora TAL CUAL viene
  const horaDeApertura = aunNoAbre
    ? horaDelCampo(scoringView?.scoringOpensAt, i18n.language)
    : null;

  // Y que el aviso caduque solo: se calcula en el render, así que sin algo que
  // vuelva a pintar se queda puesto. Con cobertura lo resuelve el sondeo, pero
  // sin ella no corre —y es justo cuando el jugador está esperando a que abra
  // para anotar en la cola—, así que se despierta a la hora en punto
  useEffect(() => {
    if (!aunNoAbre) return undefined;
    const falta = aunNoAbre.getTime() - Date.now();
    if (falta <= 0 || falta > MAXIMO_TEMPORIZADOR_MS) return undefined;
    const aviso = setTimeout(() => marcaLaHora((n) => n + 1), falta + 1000);
    return () => clearTimeout(aviso);
  }, [aunNoAbre]);
  // Lo que se ve del hoyo: el servidor con lo que está en la cola encima, que lo
  // compone el hook (FE #606). La pantalla ya no guarda su propia copia de lo
  // anotado: nunca se vaciaba, así que un golpe rechazado seguía pintándose
  const currentHoleScore = scoresVisibles.find((s) => s.holeNumber === currentHole);
  const currentPlayerScore = currentHoleScore?.playerScores?.find(
    (ps) => ps.userId === currentUserId
  );
  // Score entry for the player the current user marks (to read what current user entered as marker)
  const markedPlayerScore = currentHoleScore?.playerScores?.find(
    (ps) => ps.userId === markerAssignment?.marksUserId
  );

  const handleScoreChange = (scoreData, tocado) => {
    if (!markerAssignment) {
      // Sin nadie a quien marcar, su bola sola (RyderCupAM#666). Solo quien
      // juega —un admin mirando no tiene bola— y solo si la tocó
      if (isMatchPlayer && canScore && scoreData.ownScore !== undefined) {
        submitScore(currentHole, { ownScore: scoreData.ownScore }, { tocado });
      }
      return;
    }
    submitScore(currentHole, {
      ownScore: scoreData.ownScore,
      markedPlayerId: markerAssignment.marksUserId,
      markedScore: scoreData.markedScore,
    }, { tocado });
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handlePrevHole = () => {
    if (currentHole > 1) {
      setCurrentHole(currentHole - 1);
    }
  };

  const handleNextHole = () => {
    if (currentHole < totalHoles) {
      setCurrentHole(currentHole + 1);
    }
  };

  const handleHoleSelect = (hole) => {
    setCurrentHole(hole);
  };

  const handleConcede = async (reason) => {
    try {
      const playerTeam = scoringView?.players?.find((p) => p.userId === currentUserId)?.team;
      if (playerTeam) {
        await concedeMatch(playerTeam, reason);
      }
    } finally {
      setShowConcedeModal(false);
    }
  };

  const handleSubmitScorecard = async () => {
    try {
      await submitScorecard();
    } finally {
      setShowSubmitModal(false);
    }
  };

  const handleSessionTakeOver = () => {
    takeOverSession();
  };

  if (isLoadingUser || isLoading) {
    // La cabecera se queda puesta durante la espera: aparecer de golpe al
    // terminar es un salto, y de eso va justamente FE #495
    return (
      <div className="min-h-screen bg-gray-50">
        <HeaderAuth user={user} />
        <BlockLoader texto={t('loading')} />
      </div>
    );
  }

  // No hay nada que pintar: ni hoyos, ni pares, ni quién juega. Una sola pantalla
  // para los dos motivos por los que se llega aquí (FE #617), porque al jugador
  // le pasa lo mismo en ambos y lo que necesita saber es igual:
  //
  // - sin cobertura la petición muere sin respuesta y el hook NO pone error a
  //   propósito;
  // - con cobertura y el servidor caído —un club con señal y la API abajo, o un
  //   5xx— el hook SÍ lo pone, y antes esta rama era inalcanzable: ganaba la de
  //   error y salía el mensaje crudo de `fetch` («Failed to fetch (host:puerto)»),
  //   sin una palabra de los golpes que seguían en la cola.
  //
  // Con la foto del partido (FE #614) esto solo se ve si nunca se abrió aquí
  if (!scoringView) {
    // ¿Contestó el servidor? Preguntado por `=== undefined` y no por verdadero/
    // falso, como en partida rápida: lo que importa es si hubo respuesta, y un
    // `status` 0 —que algún proxy expone en una petición abortada— no lo es
    const estado = error?.status ?? error?.response?.status;
    const contestoElServidor = estado !== undefined;

    // El motivo sale de `motivoDe`, la misma regla que usa el recuadro de abajo
    return (
      <div className="min-h-screen bg-gray-50">
        <HeaderAuth user={user} />

        {/* Sin conexión, su aviso: se perdía cuando la cola estaba vacía, que es
            el caso más común al llegar al campo con un partido nunca abierto aquí */}
        {/* Sin vista aún no se sabe quién juega: el aviso de anotar, por si acaso */}
        {isOffline && <AnotarSinConexion pendingCount={pendingQueueSize} />}

        {/* Y con cobertura, los golpes pendientes se cuentan aparte: el banner de
            arriba afirma «estás sin conexión», y aquí sí la hay —lo caído es el
            servidor—, así que usarlo para esto sería decirle algo falso */}
        {!isOffline && <PendientesASalvo count={pendingQueueSize} />}

        <div className="max-w-4xl mx-auto px-4 py-6 text-center" data-testid="sin-nada-guardado">
          <p className="text-gray-700">
            {error ? motivoDe(error) : t('offline.nothingCached')}
          </p>
          {/* La pista se esconde solo si el servidor contestó —si el partido no
              está o no es tuyo, abrirlo con cobertura no arregla nada—. Con un
              fallo sin respuesta, que es lo que da un portal cautivo, es justo el
              consejo que hace falta */}
          {!contestoElServidor && (
            <p className="mt-2 text-sm text-gray-500">{t('offline.nothingCachedHint')}</p>
          )}
          <button onClick={refetch} className="mt-4 px-4 py-2 bg-primary text-white rounded-lg">
            {t('retry')}
          </button>
        </div>
      </div>
    );
  }

  // Match summary screen
  if (matchSummary) {
    const winnerTeam = matchSummary.result?.winner;
    const winnerTeamName = winnerTeam === 'A'
      ? scoringView?.teamAName
      : winnerTeam === 'B'
        ? scoringView?.teamBName
        : null;
    const winnerPlayerNames = (winnerTeam === 'A' || winnerTeam === 'B')
      ? scoringView?.players?.filter((p) => p.team === winnerTeam).map((p) => p.userName).join(' y ')
      : null;
    const winnerName = winnerTeamName && winnerPlayerNames
      ? `${winnerTeamName} (${winnerPlayerNames})`
      : winnerTeamName;

    return (
      <div className="min-h-screen bg-gray-50">
        <HeaderAuth user={user} />
        <div className="max-w-lg mx-auto px-4 py-6">
          <MatchSummaryCard summary={matchSummary} winnerName={winnerName} />
          <button
            onClick={() => navigate(-1)}
            className="mt-4 w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
          >
            {t('summary.back')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderAuth user={user} />

      {/* Solo quien anota (también un administrador): al organizador que no juega no le vale «lo que anotes se guarda» */}
      {isOffline && canScore && <AnotarSinConexion pendingCount={pendingQueueSize} />}

      {/* El gemelo de la pantalla sin nada pintado (FE #625): con cobertura y el
          servidor caído, la casilla enseña el golpe y nada decía que el otro
          jugador no lo ve. Sale solo mientras el servidor no contesta: con
          respuesta, el sondeo vacía la cola */}
      {/* Salvo con el aviso del almacenamiento: esos golpes no se van a enviar
          al responder el servidor, y prometerlo sería falso */}
      {!isOffline && !avisoDelVaciado && <PendientesASalvo count={pendingQueueSize} />}

      {/* Los hoyos que no se pudieron guardar (FE #622). Aparte del recuadro de
          errores, que lo limpia cada sondeo: este solo se va al guardar su
          hoyo, y dice cuáles, porque hay que volver a anotarlos */}
      {hoyosNoGuardados.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 pt-4">
          <div
            role="alert"
            data-testid="no-guardados"
            className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm space-y-1"
          >
            {porAnotar.length > 0 && (
              <p>{t('offline.noGuardados', { count: porAnotar.length, holes: porAnotar.join(', ') })}</p>
            )}
            {sinAnotar.length > 0 && (
              <p>{t('offline.noGuardadosSinAnotar', { count: sinAnotar.length, holes: sinAnotar.join(', ') })}</p>
            )}
          </div>
        </div>
      )}

      {/* El vaciado se paró porque el móvil no admite escrituras. Aparte del
          error general: ese lo limpia cada sondeo, y esto tiene que durar
          hasta que un vaciado termine bien (FE #551) */}
      {avisoDelVaciado && (
        <div className="max-w-4xl mx-auto px-4 pt-4">
          <p
            role="status"
            className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
          >
            {t(claveDelAvisoDelVaciado(avisoDelVaciado))}
          </p>
        </div>
      )}
      
      {/* Lo que se ve salió de la foto del móvil, no del servidor (FE #614). Hay
          que decirlo, y en ámbar y no en rojo: con un 5xx esto pasa CON cobertura,
          y sin avisar se lee como si fuera lo de ahora mismo —con su resultado, su
          tarjeta y su botón de entregar— cuando puede ser de hace rato */}
      {/* Sin conexión ya lo dice su aviso: dos casi iguales sobraban (QA del 11 oct 2026) */}
      {pintadoDeMemoria && scoringView && !isOffline && (
        <div className="max-w-4xl mx-auto px-4 pt-4">
          <p
            data-testid="pintado-de-memoria"
            className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-sm"
          >
            {t('offline.noSeActualiza')}
          </p>
        </div>
      )}

      {/* Inline error banner for post-load errors. Si la pantalla viene de la
          foto, el fallo AL CARGAR ya está contado arriba y el rojo encima sobra;
          el de una acción no: callarlo dejaba una casilla vaciada sin decir que
          el golpe no se pudo guardar (FE #626) */}
      {error && scoringView && (!pintadoDeMemoria || falloDeUnaAccion) && (
        <div className="max-w-4xl mx-auto px-4 pt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between">
            <p className="text-sm text-red-600">{textoDelFallo(error)}</p>
            <button
              onClick={refetch}
              className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
            >
              {t('retry')}
            </button>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-4">
        {/* Back to schedule */}
        {scoringView?.competitionId && (
          <Link
            to={`/competitions/${scoringView.competitionId}/schedule`}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-3"
          >
            &larr; {t('summary.backToSchedule')}
          </Link>
        )}

        {/* Match header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          {/* min-w-0: sin él, un nombre de campo largo no se recorta y la cabecera se sale */}
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-gray-900">
              {t('matchHeader', { number: scoringView?.matchNumber })}
            </h1>
            {/* El formato, traducido («Foursomes», no «FOURSOMES») */}
            <p className="text-sm text-gray-500">{scoringView?.matchFormat && tSchedule(`formats.${scoringView.matchFormat}`)}</p>
            <CampoDeLaPartida nombre={scoringView?.roundInfo?.golfCourseName} />
          </div>
          {(resultadoDecidido || cerradoSinJugar || scoringView?.matchStanding) && (
            <div className="shrink-0 text-right" data-testid="marcador-del-partido">
              <p className="text-lg font-bold text-primary">{textoDelMarcador}</p>
              {scoringView?.matchStanding && (
                <p className="text-xs text-gray-500">
                  {t('holesPlayed', { count: scoringView.matchStanding.holesPlayed })}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <GrupoDePestanas actual={activeTab} onElegir={handleTabChange}>
          <ListaDePestanas
            etiqueta={t('tabsLabel')}
            className="flex border-b border-gray-200 mb-4"
            data-testid="scoring-tabs"
            pestanas={TABS.map((tab) => ({ id: tab, contenido: t(`tabs.${tab}`), testId: `tab-${tab}` }))}
            claseDePestana={(abierta) =>
              `flex-1 py-2 text-sm font-medium text-center border-b-2 transition-colors ${
                abierta
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`
            }
          />

          {/* Tab: Input */}
          <PanelDePestana id="input" className="space-y-4">
            <HoleSelector
              currentHole={currentHole}
              onSelect={handleHoleSelect}
              scores={scoresVisibles}
              totalHoles={totalHoles}
              noGuardados={hoyosNoGuardados}
              retirados={retirados}
            />

            {aunNoAbre && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
                <p className="font-medium text-amber-900">{t('notOpenYet.title')}</p>
                <p className="mt-1 text-amber-800">
                  {t('notOpenYet.opensAt', { hora: horaDeApertura })}
                </p>
                <p className="mt-1 text-amber-800">{t('notOpenYet.meanwhile')}</p>
                {/* A quién vas a marcar (16 oct): lo decía «Info del Partido» */}
                {aQuienMarco && (
                  <p data-testid="anotaras-a" className="mt-1 font-medium text-amber-900">
                    {t(scoringView?.matchFormat === 'FOURSOMES' ? 'notOpenYet.youWillMarkPair' : 'notOpenYet.youWillMark', { nombre: aQuienMarco })}
                  </p>
                )}
              </div>
            )}

            {cerradoSinJugar && (
              <p
                data-testid="partido-cerrado"
                className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700"
              >
                {cierre ? t(`closed.${claveDelCierre}`, cierre) : t('closed.generic')}
              </p>
            )}

            {currentHoleData && !aunNoAbre && !cerradoSinJugar && (
              <>
                {canScore && misMarcados.length > 1 && (
                  <fieldset
                    data-testid="a-quien-anoto"
                    disabled={fijadoPorLaCola}
                    className="flex flex-wrap items-center gap-2 text-sm"
                  >
                    <legend className="sr-only">{t('withdraw.markingWho')}</legend>
                    <span aria-hidden="true" className="text-gray-600">{t('withdraw.markingWho')}</span>
                    {misMarcados.map((id) => (
                      <label
                        key={id}
                        className={`min-h-11 inline-flex items-center rounded-full border px-3 cursor-pointer focus-within:ring-2 focus-within:ring-primary ${
                          id === marcadoActivo ? 'border-primary bg-primary/10 font-medium' : 'border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="a-quien-anoto"
                          className="sr-only"
                          checked={id === marcadoActivo}
                          onChange={() => setMarcadoElegido({ hoyo: currentHole, id })}
                        />
                        {nombreDe(id)}
                      </label>
                    ))}
                    {fijadoPorLaCola && (
                      <p className="w-full text-xs text-amber-800">
                        {t('withdraw.oneAtATime', { nombre: nombreDe(pendienteAqui) })}
                      </p>
                    )}
                  </fieldset>
                )}
                <HoleInput
                  // Un partido de torneo es match play: recoger es conceder el
                  // hoyo, y la raya se permite. Solo si la vista lo dice (23 oct
                  // 2026: se dice dónde sí)
                  allowPickedUp={scoringView?.matchFormat != null}
                  // Y otra vez cada vez que su hoyo no se puede guardar (FE #622):
                  // la casilla guarda su propia selección y solo adopta la vista
                  // cuando esta cambia, así que enseñaba un golpe que no estaba en
                  // ningún sitio. Al montarse de nuevo, enseña lo que hay guardado
                  key={`${currentHole}-${noGuardados[currentHole]?.turno ?? ''}`}
                  matchFormat={scoringView?.matchFormat}
                  holeNumber={currentHole}
                  par={currentHoleData.par}
                  markedPar={holeFor(markerAssignment?.marksUserId)?.par ?? courseHoleData?.par ?? null}
                  markedName={aQuienMarco}
                  markerName={markerAssignment?.markedByName ?? quienMeMarca}
                  marksSomeone={Boolean(markerAssignment)}
                  markedPlayerId={markerAssignment?.marksUserId}
                  strokeIndex={currentHoleData.strokeIndex}
                  playerScore={currentPlayerScore}
                  markedPlayerScore={markedPlayerScore}
                  validationStatus={currentPlayerScore?.validationStatus}
                  markedValidationStatus={markedPlayerScore?.validationStatus}
                  netScore={currentPlayerScore?.netScore}
                  strokesReceived={currentPlayerScore?.strokesReceivedThisHole}
                  holeResult={currentHoleScore?.holeResult}
                  standing={currentHoleScore?.holeResult?.standing}
                  isReadOnly={!canScore || (isOwnScoreLocked && marcaBloqueada) || isSessionBlocked}
                  isOwnScoreLocked={isOwnScoreLocked || !canScore || isSessionBlocked}
                  isMarkerScoreLocked={marcaBloqueada || !canScore || isSessionBlocked}
                  onScoreChange={handleScoreChange}
                  teamAName={scoringView?.teamAName}
                  teamBName={scoringView?.teamBName}
                />
                <VentanaDelMapa
                  mapaDelHoyo={mapaDelHoyo}
                  golfCourseId={scoringView?.roundInfo?.golfCourseId ?? null}
                  numeroDeHoyo={currentHole}
                  par={currentHoleData.par}
                  metros={currentHoleData.meters ?? null}
                  userId={currentUserId ?? null}
                  barra={miBarra}
                />
              </>
            )}

            {/* Prev/Next navigation */}
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={handlePrevHole}
                disabled={currentHole <= 1}
                className="min-h-11 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-40"
              >
                {t('input.prevHole')}
              </button>
              {/* «Mapa», entre Anterior y Siguiente (Agustín, 16 oct): ni dentro de la tarjeta del hoyo ni en una fila más, que empujaba la navegación fuera de la pantalla */}
              {/* Solo con el hoyo a la vista: la ventana del mapa va con él. Y en España, la única con imagen (19 oct) */}
              {currentHoleData && !aunNoAbre && !cerradoSinJugar && mapaDelHoyo.disponible && <BotonMapa onAbrir={mapaDelHoyo.abrir} />}
              <button
                onClick={handleNextHole}
                disabled={currentHole >= totalHoles}
                className="min-h-11 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-40"
              >
                {t('input.nextHole')}
              </button>
            </div>

            {/* Concede button. Decidido, no queda nada que conceder (#710); con
                todos los hoyos anotados, tampoco: solo falta validar (16 oct) */}
            {canScore &&
              !hasSubmitted &&
              scoringView?.matchStatus === 'IN_PROGRESS' &&
              !scoringView?.isDecided &&
              !partidoAcabado && (
              <button
                onClick={() => setShowConcedeModal(true)}
                className="w-full px-4 py-2 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-50"
              >
                {t('concede.button')}
              </button>
            )}

            {/* Fourball: retirarse, retirar a la pareja o volver (F2, F3) */}
            <RetiradaDelFourball
              opciones={opcionesDeLaRetirada}
              yo={currentUserId}
              onRetirar={retirarJugador}
              enviando={retirando}
            />
          </PanelDePestana>

          {/* Tab: Scorecard */}
          <PanelDePestana id="scorecard" enfocable className="space-y-4">
            <ScorecardTable
              holes={scoringView?.holes}
              scores={scoresVisibles}
              players={scoringView?.players}
              currentUserId={currentUserId}
              teamAName={scoringView?.teamAName}
              teamBName={scoringView?.teamBName}
              matchFormat={scoringView?.matchFormat}
              retirados={retirados}
            />
          </PanelDePestana>

          {/* Tab: Leaderboard (abrirla la pide: el efecto de arriba) */}
          <PanelDePestana id="leaderboard" enfocable>
            <LeaderboardView leaderboard={leaderboard} />
          </PanelDePestana>
        </GrupoDePestanas>

        {estadoDeEntrega && (
          <>
            {/* Lo que ocupa la barra fija, para que no tape lo último */}
            <div data-testid="hueco-de-la-barra" className="h-36" aria-hidden="true" />
            <BarraDeEntrega
              estado={estadoDeEntrega}
              marcador={textoDelMarcador}
              onEntregar={() => setShowSubmitModal(true)}
              enviando={isSubmitting}
              esFoursomes={esFoursomes}
              pendientes={pendingPlayers.map((p) => p.userName)}
              // Concedido o walkover también lo terminan: ya no se espera a nadie
              completado={scoringView?.matchStatus === 'COMPLETED' || cerradoSinJugar}
              // Todo anotado y sin validar, sin decidir: no «Partido terminado»
              soloAnotado={estadoDeEntrega === 'faltaValidar' && !scoringView?.isDecided}
              // Decidido no es acabado: se puede seguir jugando hasta el 18
              sePuedeSeguir={Boolean(scoringView?.isDecided) && holesToSubmit < totalHoles}
            />
          </>
        )}
      </div>

      {/* Modals */}
      <SessionBlockedModal
        isOpen={isSessionBlocked}
        onTakeOver={handleSessionTakeOver}
        onGoBack={() => navigate(-1)}
      />

      <EarlyEndModal
        isOpen={showEarlyEnd}
        listaParaEnviar={canSubmitScorecard}
        decidedResult={scoringView?.decidedResult ? {
          ...scoringView.decidedResult,
          winner: scoringView.decidedResult.winner === 'A'
            ? (scoringView.teamAName || 'A')
            : scoringView.decidedResult.winner === 'B'
              ? (scoringView.teamBName || 'B')
              : scoringView.decidedResult.winner,
        } : null}
        onConfirm={() => {
          setEarlyEndDismissed(true);
          // A la tarjeta, para repasarla antes de entregar: el botón está en la
          // barra de abajo en todas las pestañas (FE #745), pero lo que se firma
          // se lee en esta
          setActiveTab('scorecard');
        }}
        onClose={() => setEarlyEndDismissed(true)}
      />

      <ConcedeMatchModal
        // Cerrado mientras estaba abierto, ya no hay nada que conceder ni que
        // entregar, aunque llegue sin ganador (CodeRabbit en la #735)
        isOpen={showConcedeModal && !scoringView?.isDecided && !cerradoSinJugar}
        onConfirm={handleConcede}
        onClose={() => setShowConcedeModal(false)}
      />

      <SubmitScorecardModal
        isOpen={showSubmitModal && canSubmitScorecard && !cerradoSinJugar}
        validatedHoles={validatedHoles}
        totalHoles={holesToSubmit}
        isSubmitting={isSubmitting}
        onConfirm={handleSubmitScorecard}
        onClose={() => setShowSubmitModal(false)}
      />
    </div>
  );
};

export default ScoringPage;
