import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import HeaderAuth from '../../components/layout/HeaderAuth';
import { useAuth } from '../../hooks/useAuth';
import { useScoring } from '../../hooks/useScoring';
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
    currentHole,
    isLoading,
    error,
    isSubmitting,
    matchSummary,
    isOffline,
    isSessionBlocked,
    pendingQueueSize,
    isMatchPlayer,
    hasSubmitted,
    validatedHoles,
    totalHoles,
    canSubmitScorecard,
    setCurrentHole,
    submitScore,
    submitScorecard,
    concedeMatch,
    refetch,
  } = useScoring(matchId, user?.id);

  // Load leaderboard when tab changes to leaderboard
  useEffect(() => {
    if (activeTab === 'leaderboard' && scoringView?.competitionId) {
      getLeaderboardUseCase.execute(scoringView.competitionId)
        .then(setLeaderboard)
        .catch(() => {});
    }
  }, [activeTab, scoringView?.competitionId]);

  // Derived: show early end modal when match is decided and user hasn't dismissed
  const showEarlyEnd = !!scoringView?.isDecided && !earlyEndDismissed && !matchSummary;

  const currentUserId = user?.id;

  // Find current user's marker assignment
  const markerAssignment = scoringView?.markerAssignments?.find(
    (ma) => ma.scorerUserId === currentUserId
  );

  // Get current hole data
  const currentHoleData = scoringView?.holes?.find((h) => h.holeNumber === currentHole);
  const currentHoleScore = scoringView?.scores?.find((s) => s.holeNumber === currentHole);
  const currentPlayerScore = currentHoleScore?.playerScores?.find(
    (ps) => ps.userId === currentUserId
  );

  const handleScoreChange = (scoreData) => {
    if (!markerAssignment) return;
    submitScore(currentHole, {
      ownScore: scoreData.ownScore,
      markedPlayerId: markerAssignment.marksUserId,
      markedScore: scoreData.markedScore,
    });
  };

  const handlePrevHole = () => {
    if (currentHole > 1) setCurrentHole(currentHole - 1);
  };

  const handleNextHole = () => {
    if (currentHole < totalHoles) setCurrentHole(currentHole + 1);
  };

  const handleConcede = async (reason) => {
    const playerTeam = scoringView?.players?.find((p) => p.userId === currentUserId)?.team;
    if (playerTeam) {
      await concedeMatch(playerTeam, reason);
    }
    setShowConcedeModal(false);
  };

  const handleSubmitScorecard = async () => {
    await submitScorecard();
    setShowSubmitModal(false);
  };

  const handleSessionTakeOver = () => {
    // Force re-acquire by reloading
    window.location.reload();
  };

  if (isLoadingUser || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <HeaderAuth user={user} />
        <div className="flex items-center justify-center h-64">
          <Loader className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-gray-500">{t('loading')}</span>
        </div>
      </div>
    );
  }

  // Only show full-page error if no data loaded yet (initial load failed)
  if (error && !scoringView) {
    return (
      <div className="min-h-screen bg-gray-50">
        <HeaderAuth user={user} />
        <div className="max-w-4xl mx-auto px-4 py-6 text-center">
          <p className="text-red-600">{error.message || t('errors.generic')}</p>
          <button onClick={refetch} className="mt-4 px-4 py-2 bg-primary text-white rounded-lg">
            {t('retry')}
          </button>
        </div>
      </div>
    );
  }

  // Match summary screen
  if (matchSummary) {
    return (
      <div className="min-h-screen bg-gray-50">
        <HeaderAuth user={user} />
        <div className="max-w-lg mx-auto px-4 py-6">
          <MatchSummaryCard summary={matchSummary} />
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
      
      {/* Inline error banner for post-load errors */}
      {error && scoringView && (
        <div className="max-w-4xl mx-auto px-4 pt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between">
            <p className="text-sm text-red-600">{error.message || t('errors.generic')}</p>
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
                  : `${scoringView.matchStanding.status} ${scoringView.matchStanding.leadingTeam}`}
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
              onClick={() => setActiveTab(tab)}
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
            {markerAssignment && currentHole === 1 && (
              <PreMatchInfo
                markerAssignment={markerAssignment}
                matchFormat={scoringView?.matchFormat}
                currentUserId={currentUserId}
              />
            )}

            <HoleSelector
              currentHole={currentHole}
              onSelect={setCurrentHole}
              scores={scoringView?.scores}
              totalHoles={totalHoles}
            />

            {currentHoleData && (
              <HoleInput
                key={currentHole}
                holeNumber={currentHole}
                par={currentHoleData.par}
                strokeIndex={currentHoleData.strokeIndex}
                playerScore={currentPlayerScore}
                validationStatus={currentPlayerScore?.validationStatus}
                netScore={currentPlayerScore?.netScore}
                strokesReceived={currentPlayerScore?.strokesReceivedThisHole}
                holeResult={currentHoleScore?.holeResult}
                standing={currentHoleScore?.holeResult?.standing}
                isReadOnly={!isMatchPlayer || hasSubmitted || isSessionBlocked}
                onScoreChange={handleScoreChange}
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
            {isMatchPlayer && !hasSubmitted && scoringView?.matchStatus === 'IN_PROGRESS' && (
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
              scores={scoringView?.scores}
              players={scoringView?.players}
              currentUserId={currentUserId}
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

            {hasSubmitted && (
              <p className="text-center text-sm text-green-600 font-medium">
                {t('submit.alreadySubmitted')}
              </p>
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
        decidedResult={scoringView?.decidedResult}
        onConfirm={() => setEarlyEndDismissed(true)}
        onClose={() => setEarlyEndDismissed(true)}
      />

      <ConcedeMatchModal
        isOpen={showConcedeModal}
        onConfirm={handleConcede}
        onClose={() => setShowConcedeModal(false)}
      />

      <SubmitScorecardModal
        isOpen={showSubmitModal}
        validatedHoles={validatedHoles}
        totalHoles={totalHoles}
        isSubmitting={isSubmitting}
        onConfirm={handleSubmitScorecard}
        onClose={() => setShowSubmitModal(false)}
      />
    </div>
  );
};

export default ScoringPage;
