import HoleInput from './HoleInput';
import HoleSelector from './HoleSelector';
import RetiradaDelFourball from './RetiradaDelFourball';
import BotonMapa from './mapa/BotonMapa';
import VentanaDelMapa from './mapa/VentanaDelMapa';

/**
 * La pestaña «Anotar» de la anotación de competición (`ScoringPage`): el
 * selector de hoyos, la casilla del hoyo con su mapa, la navegación, conceder
 * y la retirada del fourball. Sin estado ni efectos: todo llega de la página,
 * y `hoyo` es su `lecturaDelHoyo`.
 */
const PestanaDeAnotar = ({
  t,
  scoringView,
  hoyo,
  currentHole,
  totalHoles,
  scoresVisibles,
  noGuardados,
  hoyosNoGuardados,
  retirados,
  aunNoAbre,
  horaDeApertura,
  cerradoSinJugar,
  cierre,
  claveDelCierre,
  segundoMarcado,
  canScore,
  hasSubmitted,
  isOwnScoreLocked,
  isSessionBlocked,
  partidoAcabado,
  mapaDelHoyo,
  currentUserId,
  miBarra,
  opcionesDeLaRetirada,
  retirarJugador,
  retirando,
  onHoleSelect,
  onPrevHole,
  onNextHole,
  isMatchPlayer,
  submitScore,
  onAbrirConcesion,
}) => {
  const {
    quienMeMarca,
    markerAssignment,
    marcaBloqueada,
    segundoBloqueado,
    aQuienMarco,
    holeFor,
    courseHoleData,
    currentHoleData,
    currentHoleScore,
    currentPlayerScore,
    markedPlayerScore,
    filaDelSegundo,
    nombreDelSegundo,
  } = hoyo;

  // El golpe del segundo marcado sale solo: ni el tuyo ni el del primero
  const handleSecondMarkedChange = (golpes) => {
    if (!segundoMarcado) return;
    submitScore(currentHole, { markedPlayerId: segundoMarcado, markedScore: golpes }, { tocado: 'markedScore' });
  };

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

  return (
    <>
      <HoleSelector
        currentHole={currentHole}
        onSelect={onHoleSelect}
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
            isReadOnly={!canScore || (isOwnScoreLocked && marcaBloqueada && segundoBloqueado) || isSessionBlocked}
            isOwnScoreLocked={isOwnScoreLocked || !canScore || isSessionBlocked}
            isMarkerScoreLocked={marcaBloqueada || !canScore || isSessionBlocked}
            onScoreChange={handleScoreChange}
            secondMarked={segundoMarcado ? {
              id: segundoMarcado,
              name: nombreDelSegundo,
              par: holeFor(segundoMarcado)?.par ?? courseHoleData?.par ?? null,
              playerScore: filaDelSegundo,
              validationStatus: filaDelSegundo?.validationStatus,
              isLocked: segundoBloqueado || !canScore || isSessionBlocked,
            } : null}
            onSecondMarkedChange={handleSecondMarkedChange}
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
          onClick={onPrevHole}
          disabled={currentHole <= 1}
          className="min-h-11 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-40"
        >
          {t('input.prevHole')}
        </button>
        {/* «Mapa», entre Anterior y Siguiente (Agustín, 16 oct): ni dentro de la tarjeta del hoyo ni en una fila más, que empujaba la navegación fuera de la pantalla */}
        {/* Solo con el hoyo a la vista: la ventana del mapa va con él. Y en España, la única con imagen (19 oct) */}
        {currentHoleData && !aunNoAbre && !cerradoSinJugar && mapaDelHoyo.disponible && <BotonMapa onAbrir={mapaDelHoyo.abrir} />}
        <button
          onClick={onNextHole}
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
          onClick={onAbrirConcesion}
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
    </>
  );
};

export default PestanaDeAnotar;
