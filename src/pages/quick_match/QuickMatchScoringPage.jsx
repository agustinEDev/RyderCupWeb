import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Loader, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  groupParticipantsBySide,
  sideCardHolder,
  sideScoreOf,
} from '../../domain/services/FoursomesSides';
import HeaderAuth from '../../components/layout/HeaderAuth';
import { useAuth } from '../../hooks/useAuth';
import { useQuickMatchScoring } from '../../hooks/useQuickMatchScoring';
import QuickMatchHoleSelector from '../../components/quick_match/QuickMatchHoleSelector';
import QuickMatchHoleInput from '../../components/quick_match/QuickMatchHoleInput';
import QuickMatchClassificationTable from '../../components/quick_match/QuickMatchClassificationTable';
import QuickMatchScorecardTable from '../../components/quick_match/QuickMatchScorecardTable';
import MatchPlayStrokeAllocator from '../../domain/services/MatchPlayStrokeAllocator';

const TABS = ['input', 'classification', 'scorecard'];

/**
 * El `message` de un error de la API es el `detail` que escribe el backend, y
 * ese está en inglés: pintarlo tal cual metía "You are not a participant of
 * this quick match." en medio de una pantalla en español. El status sí es un
 * dato estable y traducible, así que la copia sale de él.
 *
 * Hacen falta DOS mapas porque el mismo status significa cosas distintas según
 * la operación: un 403 al cargar es "no juegas esta partida", pero un 403 al
 * anotar es "no eres el anotador de ese jugador" — decirle lo primero a alguien
 * que se está viendo en la lista de participantes es peor que no decirle nada.
 *
 * Cuál es cuál lo dice el hook, que los guarda por separado. Deducirlo de si
 * había partida en pantalla no valía: el sondeo cada 10 s falla mucho después
 * de que la partida haya cargado, y ese fallo es de carga.
 */
const LOAD_ERROR_KEY_BY_STATUS = {
  403: 'scoring.errors.forbidden',
  404: 'scoring.errors.notFound',
};

// Los endpoints de anotación devuelven 403, 404, 409 y 422; el resto cae en el
// mensaje de "no se ha podido guardar", que es cierto sea cual sea la causa
const SAVE_ERROR_KEY_BY_STATUS = {
  403: 'scoring.errors.saveForbidden',
  404: 'scoring.errors.saveNotFound',
  409: 'scoring.errors.saveConflict',
  422: 'scoring.errors.saveInvalid',
};

const loadErrorKeyFor = (error) =>
  LOAD_ERROR_KEY_BY_STATUS[error?.status] ?? 'scoring.errors.generic';

const saveErrorKeyFor = (error) =>
  SAVE_ERROR_KEY_BY_STATUS[error?.status] ?? 'scoring.errors.saveFailed';

const QuickMatchScoringPage = () => {
  const { quickMatchId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation('quickMatch');
  const { user, loading: isLoadingUser } = useAuth();

  const [activeTab, setActiveTab] = useState('input');
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);

  const {
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
    completeMatch,
    refetch,
  } = useQuickMatchScoring(quickMatchId, user?.id);

  useEffect(() => {
    if (!showFinishConfirm) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting) setShowFinishConfirm(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showFinishConfirm, isSubmitting]);

  if (isLoadingUser || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <HeaderAuth user={user} />
        <div className="flex items-center justify-center h-64">
          <Loader className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-gray-500">{t('scoring.loading')}</span>
        </div>
      </div>
    );
  }

  if (loadError && !quickMatch) {
    return (
      <div className="min-h-screen bg-gray-50">
        <HeaderAuth user={user} />
        <div className="max-w-4xl mx-auto px-4 py-6 text-center">
          <p className="text-red-600" data-testid="quick-match-scoring-error">
            {t(loadErrorKeyFor(loadError))}
          </p>
          <button onClick={refetch} className="mt-4 px-4 py-2 bg-primary text-white rounded-lg">
            {t('scoring.retry')}
          </button>
        </div>
      </div>
    );
  }

  // El par, el índice y los metros son de la barra de CADA jugador, no de una
  // común: en 56 de los 800 campos federados el índice cambia entre barras y en
  // 25 el par, y quien anota puede estar anotando a alguien de otra barra. Con
  // una sola tarjeta se le pintaba —y se le dibujaba la figura— contra un par
  // que no era el suyo, mientras sus golpes sí venían resueltos por su barra.
  const holeFor = (participant) =>
    MatchPlayStrokeAllocator.holeCardFor(participant, holes, tees).find(
      (h) => h.holeNumber === currentHole
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
  const courseHoleData = holes.find((h) => h.holeNumber === currentHole) ?? null;

  const currentHoleData = holeFor(myParticipant) ?? courseHoleData;

  const participantOf = (participantId) =>
    quickMatch?.participants?.find((p) => p.participantId === participantId);

  const scoreOf = (participantId) =>
    quickMatch?.holeScores?.find(
      (hs) => hs.holeNumber === currentHole && hs.participantId === participantId
    )?.score ?? null;

  const playerEntries = () =>
    coveredParticipantIds.map((participantId) => {
      const participant = participantOf(participantId);
      return {
        participantId,
        scoreIds: [participantId],
        name: participant?.name ?? '',
        score: scoreOf(participantId),
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
        const writable = coveredParticipantIds.includes(cardHolder.participantId)
          ? cardHolder
          : members.find((m) => coveredParticipantIds.includes(m.participantId));
        if (!writable) return null;
        return {
          participantId: writable.participantId,
          scoreIds: members.map((m) => m.participantId),
          name: members.map((m) => m.name).join(' & '),
          score: sideScoreOf(members, scoreOf),
          // Comparten bola, así que comparten tarjeta: la del primero del bando,
          // la misma para los dos y no la de quien tenga el móvil.
          hole: holeFor(cardHolder) ?? courseHoleData,
          side: cardHolder.participantId,
        };
      })
      .filter(Boolean);

  const isFoursomes = quickMatch?.matchFormat === 'FOURSOMES';
  const entries = isFoursomes ? sideEntries() : playerEntries();

  const isReadOnly = !isScorer || quickMatch?.isCompleted || isSubmitting;

  const handleScoreChange = (participantId, score) => {
    submitScore(currentHole, participantId, score);
  };

  const handlePrevHole = () => {
    if (currentHole > 1) setCurrentHole(currentHole - 1);
  };

  const handleNextHole = () => {
    if (currentHole < totalHoles) setCurrentHole(currentHole + 1);
  };

  const handleFinishConfirm = async () => {
    await completeMatch();
    setShowFinishConfirm(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderAuth user={user} />

      {/* El aviso de arriba cubre los dos: un guardado rechazado y un sondeo que
          falla con la partida ya cargada. Cada uno con su copia, y el de
          guardar primero porque es lo que el anotador acaba de intentar. */}
      {(saveError || loadError) && quickMatch && (
        <div className="max-w-4xl mx-auto px-4 pt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between">
            <p className="text-sm text-red-600" data-testid="quick-match-scoring-error">
              {saveError ? t(saveErrorKeyFor(saveError)) : t(loadErrorKeyFor(loadError))}
            </p>
            <button onClick={refetch} className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700">
              {t('scoring.retry')}
            </button>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-4">
        <button
          onClick={() => navigate('/quick-matches')}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-3"
        >
          &larr; {t('scoring.backToMyQuickMatches')}
        </button>

        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {quickMatch?.name || t('scoring.matchHeader')}
            </h1>
            <p className="text-sm text-gray-500">
              {quickMatch?.name ? `${t('scoring.matchHeader')} · ` : ''}
              {quickMatch?.matchFormat ?? quickMatch?.scoringFormat}
            </p>
            {courseName && (
              <p className="flex items-center gap-1.5 text-sm text-gray-500 mt-1" data-testid="quick-match-course-name">
                <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                {courseName}
              </p>
            )}
          </div>
          {quickMatch?.isCompleted && (
            <span className="text-sm font-medium text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
              {t('scoring.finish.completed')}
            </span>
          )}
        </div>

        <div className="flex border-b border-gray-200 mb-4" data-testid="quick-match-scoring-tabs">
          {TABS.map((tab) => (
            <button
              key={tab}
              data-testid={`quick-match-tab-${tab}`}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-sm font-medium text-center border-b-2 transition-colors ${
                activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t(`scoring.tabs.${tab}`)}
            </button>
          ))}
        </div>

        {activeTab === 'input' && (
          <div className="space-y-4">
            {!isScorer && (
              <p className="text-sm text-gray-600 bg-gray-100 rounded-lg p-3">{t('scoring.notAScorer')}</p>
            )}

            {isScorer && (
              <>
                <QuickMatchHoleSelector
                  currentHole={currentHole}
                  onSelect={setCurrentHole}
                  holeScores={quickMatch?.holeScores ?? []}
                  // Los golpes que espera cada casilla de la pantalla: una por
                  // bando en foursomes —donde el hoyo está completo con las dos
                  // bolas, no con cuatro— y una por jugador en el resto.
                  expectedScoreIdGroups={entries.map((entry) => entry.scoreIds)}
                  totalHoles={totalHoles}
                />

                {currentHoleData && (
                  <QuickMatchHoleInput
                    key={currentHole}
                    holeNumber={currentHole}
                    par={currentHoleData.par}
                    strokeIndex={currentHoleData.strokeIndex}
                    meters={currentHoleData.meters ?? null}
                    entries={entries}
                    isReadOnly={isReadOnly}
                    onScoreChange={handleScoreChange}
                  />
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handlePrevHole}
                    disabled={currentHole <= 1}
                    data-testid="quick-match-prev-hole"
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 hover:border-gray-400 disabled:opacity-40 disabled:hover:bg-white transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    {t('scoring.navigation.previous')}
                  </button>
                  <button
                    onClick={handleNextHole}
                    disabled={currentHole >= totalHoles}
                    data-testid="quick-match-next-hole"
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-40 disabled:hover:bg-primary transition-colors"
                  >
                    {t('scoring.navigation.next')}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}

            {isCreator && !quickMatch?.isCompleted && (
              <button
                onClick={() => setShowFinishConfirm(true)}
                className="w-full px-4 py-2 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-50"
              >
                {t('scoring.finish.button')}
              </button>
            )}
          </div>
        )}

        {activeTab === 'classification' && (
          <QuickMatchClassificationTable
            holes={holes}
            holeScores={quickMatch?.holeScores ?? []}
            participants={quickMatch?.participants ?? []}
            currentParticipantId={myParticipant?.participantId}
            scoringFormat={quickMatch?.scoringFormat}
            standing={quickMatch?.standing}
            tees={tees}
            allowancePercentage={quickMatch?.effectiveAllowance}
            playMode={quickMatch?.playMode}
            participantStrokes={quickMatch?.participantStrokes ?? []}
            matchFormat={quickMatch?.matchFormat}
            isCompleted={!!quickMatch?.isCompleted}
          />
        )}

        {activeTab === 'scorecard' && (
          <QuickMatchScorecardTable
            holes={holes}
            holeScores={quickMatch?.holeScores ?? []}
            participants={quickMatch?.participants ?? []}
            currentParticipantId={myParticipant?.participantId}
            scoringFormat={quickMatch?.scoringFormat}
            matchFormat={quickMatch?.matchFormat}
            playMode={quickMatch?.playMode}
            participantStrokes={quickMatch?.participantStrokes ?? []}
            tees={tees}
            allowancePercentage={quickMatch?.effectiveAllowance}
          />
        )}
      </div>

      {showFinishConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-sm p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-match-finish-title"
          >
            <h3 id="quick-match-finish-title" className="text-lg font-semibold text-gray-900 mb-1">{t('scoring.finish.confirmTitle')}</h3>
            <p className="text-sm text-gray-500 mb-4">{t('scoring.finish.confirmBody')}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowFinishConfirm(false)}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                {t('scoring.finish.cancel')}
              </button>
              <button
                onClick={handleFinishConfirm}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {t('scoring.finish.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickMatchScoringPage;
