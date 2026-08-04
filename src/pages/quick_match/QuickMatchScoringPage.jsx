import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Loader, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import HeaderAuth from '../../components/layout/HeaderAuth';
import { useAuth } from '../../hooks/useAuth';
import { useQuickMatchScoring } from '../../hooks/useQuickMatchScoring';
import QuickMatchHoleSelector from '../../components/quick_match/QuickMatchHoleSelector';
import QuickMatchHoleInput from '../../components/quick_match/QuickMatchHoleInput';
import QuickMatchClassificationTable from '../../components/quick_match/QuickMatchClassificationTable';
import QuickMatchScorecardTable from '../../components/quick_match/QuickMatchScorecardTable';

const TABS = ['input', 'classification', 'scorecard'];

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
    error,
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

  if (error && !quickMatch) {
    return (
      <div className="min-h-screen bg-gray-50">
        <HeaderAuth user={user} />
        <div className="max-w-4xl mx-auto px-4 py-6 text-center">
          <p className="text-red-600">{error.message || t('scoring.errors.generic')}</p>
          <button onClick={refetch} className="mt-4 px-4 py-2 bg-primary text-white rounded-lg">
            {t('scoring.retry')}
          </button>
        </div>
      </div>
    );
  }

  const currentHoleData = holes.find((h) => h.holeNumber === currentHole);

  const entries = coveredParticipantIds.map((participantId) => {
    const participant = quickMatch?.participants?.find((p) => p.participantId === participantId);
    const scoreEntry = quickMatch?.holeScores?.find(
      (hs) => hs.holeNumber === currentHole && hs.participantId === participantId
    );
    return {
      participantId,
      name: participant?.name ?? '',
      score: scoreEntry ? scoreEntry.score : null,
    };
  });

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

      {error && quickMatch && (
        <div className="max-w-4xl mx-auto px-4 pt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between">
            <p className="text-sm text-red-600">{error.message || t('scoring.errors.generic')}</p>
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
                  coveredParticipantIds={coveredParticipantIds}
                  totalHoles={totalHoles}
                />

                {currentHoleData && (
                  <QuickMatchHoleInput
                    key={currentHole}
                    holeNumber={currentHole}
                    par={currentHoleData.par}
                    strokeIndex={currentHoleData.strokeIndex}
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
