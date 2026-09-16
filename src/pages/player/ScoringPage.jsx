import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import HeaderAuth from '../../components/layout/HeaderAuth';
import { useAuth } from '../../hooks/useAuth';
import { useScoring } from '../../hooks/useScoring';
import { claveDelAvisoDelVaciado } from '../../utils/erroresDeAnotacion';
import { getLeaderboardUseCase } from '../../composition';
import HoleInput from '../../components/scoring/HoleInput';
import HoleSelector from '../../components/scoring/HoleSelector';
import ScorecardTable from '../../components/scoring/ScorecardTable';
import LeaderboardView from '../../components/scoring/LeaderboardView';
import PreMatchInfo from '../../components/scoring/PreMatchInfo';
import MatchSummaryCard from '../../components/scoring/MatchSummaryCard';
import OfflineBanner from '../../components/scoring/OfflineBanner';
import SessionBlockedModal from '../../components/scoring/SessionBlockedModal';
import EarlyEndModal from '../../components/scoring/EarlyEndModal';
import ConcedeMatchModal from '../../components/scoring/ConcedeMatchModal';
import SubmitScorecardModal from '../../components/scoring/SubmitScorecardModal';
import BlockLoader from '../../components/ui/BlockLoader';

const TABS = ['input', 'scorecard', 'leaderboard'];

const ScoringPage = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation('scoring');
  const { user, loading: isLoadingUser } = useAuth();

  const [activeTab, setActiveTab] = useState('input');
  const [leaderboard, setLeaderboard] = useState(null);
  const [showConcedeModal, setShowConcedeModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [earlyEndDismissed, setEarlyEndDismissed] = useState(false);
  const {
    scoringView,
    scoresVisibles,
    currentHole,
    isLoading,
    error,
    isSubmitting,
    matchSummary,
    isOffline,
    isSessionBlocked,
    pendingQueueSize,
    avisoDelVaciado,
    pintadoDeMemoria,
    canScore,
    hasSubmitted,
    isOwnScoreLocked,
    isMarkerScoreLocked,
    isFullyLocked,
    validatedHoles,
    totalHoles,
    holesToSubmit,
    canSubmitScorecard,
    setCurrentHole,
    submitScore,
    submitScorecard,
    concedeMatch,
    takeOverSession,
    refetch,
  } = useScoring(matchId, user?.id, user?.is_admin ?? false);

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
  const showEarlyEnd = !!scoringView?.isDecided && !earlyEndDismissed && !matchSummary && !hasSubmitted;

  const currentUserId = user?.id;

  // Find current user's marker assignment
  const markerAssignment = scoringView?.markerAssignments?.find(
    (ma) => ma.scorerUserId === currentUserId
  );

  // Players who still need to submit their scorecard for the match to complete
  const pendingPlayers = scoringView?.players?.filter(
    (p) => !scoringView?.scorecardSubmittedBy?.includes(p.userId)
  ) ?? [];

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

  const handleScoreChange = (scoreData) => {
    if (!markerAssignment) return;
    submitScore(currentHole, {
      ownScore: scoreData.ownScore,
      markedPlayerId: markerAssignment.marksUserId,
      markedScore: scoreData.markedScore,
    });
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
        {isOffline && <OfflineBanner pendingCount={pendingQueueSize} />}

        {/* Y con cobertura, los golpes pendientes se cuentan aparte: el banner de
            arriba afirma «estás sin conexión», y aquí sí la hay —lo caído es el
            servidor—, así que usarlo para esto sería decirle algo falso */}
        {!isOffline && pendingQueueSize > 0 && (
          <div className="max-w-4xl mx-auto px-4 pt-4">
            <p
              data-testid="pendientes-a-salvo"
              className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-sm"
            >
              {t('offline.pendientesASalvo')} {t('offline.pendingScores', { count: pendingQueueSize })}
            </p>
          </div>
        )}

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

      {isOffline && <OfflineBanner pendingCount={pendingQueueSize} />}

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
      {pintadoDeMemoria && scoringView && (
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
          foto, el fallo ya está contado arriba: el recuadro rojo encima sobra */}
      {error && scoringView && !pintadoDeMemoria && (
        <div className="max-w-4xl mx-auto px-4 pt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between">
            <p className="text-sm text-red-600">{motivoDe(error)}</p>
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
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {t('matchHeader', { number: scoringView?.matchNumber })}
            </h1>
            <p className="text-sm text-gray-500">{scoringView?.matchFormat}</p>
          </div>
          {scoringView?.matchStanding && (
            <div className="text-right">
              <p className="text-lg font-bold text-primary">
                {scoringView.matchStanding.status === 'AS'
                  ? t('input.allSquare')
                  : `${scoringView.matchStanding.status} ${scoringView.matchStanding.leadingTeam === 'A' ? scoringView.teamAName : scoringView.teamBName}`}
              </p>
              <p className="text-xs text-gray-500">
                {t('holesPlayed', { count: scoringView.matchStanding.holesPlayed })}
              </p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-4" data-testid="scoring-tabs">
          {TABS.map((tab) => (
            <button
              key={tab}
              data-testid={`tab-${tab}`}
              onClick={() => handleTabChange(tab)}
              className={`flex-1 py-2 text-sm font-medium text-center border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t(`tabs.${tab}`)}
            </button>
          ))}
        </div>

        {/* Tab: Input */}
        {activeTab === 'input' && (
          <div className="space-y-4">
            {/* Pre-match info (first time) */}
            {markerAssignment && (
              <PreMatchInfo
                markerAssignment={markerAssignment}
                matchFormat={scoringView?.matchFormat}
                currentUserId={currentUserId}
              />
            )}

            <HoleSelector
              currentHole={currentHole}
              onSelect={handleHoleSelect}
              scores={scoresVisibles}
              totalHoles={totalHoles}
            />

            {currentHoleData && (
              <HoleInput
                key={currentHole}
                holeNumber={currentHole}
                par={currentHoleData.par}
                markedPar={holeFor(markerAssignment?.marksUserId)?.par ?? courseHoleData?.par ?? null}
                strokeIndex={currentHoleData.strokeIndex}
                playerScore={currentPlayerScore}
                markedPlayerScore={markedPlayerScore}
                validationStatus={currentPlayerScore?.validationStatus}
                markedValidationStatus={markedPlayerScore?.validationStatus}
                netScore={currentPlayerScore?.netScore}
                strokesReceived={currentPlayerScore?.strokesReceivedThisHole}
                holeResult={currentHoleScore?.holeResult}
                standing={currentHoleScore?.holeResult?.standing}
                isReadOnly={!canScore || isFullyLocked || isSessionBlocked}
                isOwnScoreLocked={isOwnScoreLocked || !canScore || isSessionBlocked}
                isMarkerScoreLocked={isMarkerScoreLocked || !canScore || isSessionBlocked}
                onScoreChange={handleScoreChange}
                teamAName={scoringView?.teamAName}
                teamBName={scoringView?.teamBName}
              />
            )}

            {/* Prev/Next navigation */}
            <div className="flex justify-between">
              <button
                onClick={handlePrevHole}
                disabled={currentHole <= 1}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
              >
                {t('input.prevHole')}
              </button>
              <button
                onClick={handleNextHole}
                disabled={currentHole >= totalHoles}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
              >
                {t('input.nextHole')}
              </button>
            </div>

            {/* Concede button */}
            {canScore && !hasSubmitted && scoringView?.matchStatus === 'IN_PROGRESS' && (
              <button
                onClick={() => setShowConcedeModal(true)}
                className="w-full px-4 py-2 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-50"
              >
                {t('concede.button')}
              </button>
            )}
          </div>
        )}

        {/* Tab: Scorecard */}
        {activeTab === 'scorecard' && (
          <div className="space-y-4">
            <ScorecardTable
              holes={scoringView?.holes}
              scores={scoresVisibles}
              players={scoringView?.players}
              currentUserId={currentUserId}
              teamAName={scoringView?.teamAName}
              teamBName={scoringView?.teamBName}
              matchFormat={scoringView?.matchFormat}
            />

            {canSubmitScorecard && (
              <button
                onClick={() => setShowSubmitModal(true)}
                disabled={isSubmitting}
                className="w-full px-4 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {t('submit.button')}
              </button>
            )}

            {/* Un partido decidido con algún hoyo sin validar no se puede
                entregar. Sin este aviso, «no puedo entregar porque falta un
                hoyo» se ve igual que «no puedo entregar y no sé por qué» */}
            {scoringView?.isDecided && canScore && !hasSubmitted && !canSubmitScorecard && (
              <p className="text-center text-sm text-gray-500">{t('submit.notReady')}</p>
            )}

            {hasSubmitted && (
              <div className="text-center text-sm space-y-1">
                <p className="text-green-600 font-medium">{t('submit.alreadySubmitted')}</p>
                {scoringView?.matchStatus === 'COMPLETED' ? (
                  <p className="text-gray-500">{t('submit.matchCompleted')}</p>
                ) : pendingPlayers.length > 0 && (
                  <p className="text-gray-500">
                    {t('submit.waitingForPlayers', {
                      count: pendingPlayers.length,
                      names: pendingPlayers.map((p) => p.userName).join(', '),
                    })}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab: Leaderboard */}
        {activeTab === 'leaderboard' && (
          <LeaderboardView leaderboard={leaderboard} />
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
          // El botón de entregar vive en la pestaña de la tarjeta, y la pantalla
          // abre en la de anotar: sin esto, «Continuar para Enviar» devolvía al
          // jugador a los hoyos sin nada que pulsar
          setActiveTab('scorecard');
        }}
        onClose={() => setEarlyEndDismissed(true)}
      />

      <ConcedeMatchModal
        isOpen={showConcedeModal}
        onConfirm={handleConcede}
        onClose={() => setShowConcedeModal(false)}
      />

      <SubmitScorecardModal
        isOpen={showSubmitModal && canSubmitScorecard}
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
