import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Plus, Loader, Calendar
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import customToast from '../../utils/toast';
import HeaderAuth from '../../components/layout/HeaderAuth';
import { useAuth } from '../../hooks/useAuth';
import { useUserRoles } from '../../hooks/useUserRoles';
import RoundCard from '../../components/schedule/RoundCard';
import TeamAssignmentSection from '../../components/schedule/TeamAssignmentSection';
import RoundFormModal from '../../components/schedule/RoundFormModal';
import WalkoverModal from '../../components/schedule/WalkoverModal';
import ReassignPlayersModal from '../../components/schedule/ReassignPlayersModal';
import MatchDetailModal from '../../components/schedule/MatchDetailModal';
import AssignTeamsModal from '../../components/schedule/AssignTeamsModal';
import {
  getScheduleUseCase,
  getCompetitionDetailUseCase,
  getCompetitionGolfCoursesUseCase,
  listEnrollmentsUseCase,
  createRoundUseCase,
  updateRoundUseCase,
  deleteRoundUseCase,
  generateMatchesUseCase,
  assignTeamsUseCase,
  updateMatchStatusUseCase,
  declareWalkoverUseCase,
  reassignPlayersUseCase,
} from '../../composition';

const SchedulePage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { t } = useTranslation('schedule');
  const { t: tComp } = useTranslation('competitions');
  const { user, loading: isLoadingUser } = useAuth();
  const { isAdmin, isCreator: hasCreatorRole, isLoading: isLoadingRoles } = useUserRoles(id);

  // Data state
  const [competition, setCompetition] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [golfCourses, setGolfCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // UI state
  const [expandedRounds, setExpandedRounds] = useState({});
  const [showRoundModal, setShowRoundModal] = useState(false);
  const [editingRound, setEditingRound] = useState(null);
  const [showWalkoverModal, setShowWalkoverModal] = useState(false);
  const [walkoverMatch, setWalkoverMatch] = useState(null);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignMatch, setReassignMatch] = useState(null);
  const [showMatchDetailModal, setShowMatchDetailModal] = useState(false);
  const [detailMatchId, setDetailMatchId] = useState(null);
  const [showTeamsModal, setShowTeamsModal] = useState(false);

  // Build player name map from enrollments
  const playerNameMap = useMemo(() => {
    const map = new Map();
    enrollments.forEach((e) => {
      if (e.userId && e.userName) {
        map.set(e.userId, e.userName);
      }
    });
    return map;
  }, [enrollments]);

  const loadData = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const [compData, scheduleData, coursesResult, enrollmentsData] = await Promise.all([
        getCompetitionDetailUseCase.execute(id),
        getScheduleUseCase.execute(id).catch(() => null),
        getCompetitionGolfCoursesUseCase.execute(id).catch(() => []),
        listEnrollmentsUseCase.execute(id).catch(() => []),
      ]);

      setCompetition(compData);
      setSchedule(scheduleData);

      const courses = Array.isArray(coursesResult)
        ? coursesResult
        : (coursesResult?.golf_courses || []);
      setGolfCourses(courses.map(item => ({
        id: item.golf_course?.id || item.golf_course_id,
        name: item.golf_course?.name || 'Unknown',
      })));

      setEnrollments(enrollmentsData);
    } catch (error) {
      console.error('Error loading schedule data:', error);
      customToast.error(t('errors.failedToLoadSchedule'));
      navigate(`/competitions/${id}`);
    } finally {
      setIsLoading(false);
    }
  }, [id, user, navigate, t]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  const reloadSchedule = async () => {
    try {
      const scheduleData = await getScheduleUseCase.execute(id);
      setSchedule(scheduleData);
    } catch (error) {
      console.error('Error reloading schedule:', error);
    }
  };

  // --- Permissions ---
  const isCreator = competition?.creatorId === user?.id;
  const canManage = isCreator || hasCreatorRole || isAdmin;

  // --- Round handlers ---
  const handleCreateRound = async (roundData) => {
    setIsProcessing(true);
    try {
      await createRoundUseCase.execute(id, roundData);
      customToast.success(t('success.roundCreated'));
      setShowRoundModal(false);
      await reloadSchedule();
    } catch (error) {
      console.error('Error creating round:', error);
      customToast.error(error.message || t('errors.failedToCreateRound'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateRound = async (roundData) => {
    if (!editingRound) return;
    setIsProcessing(true);
    try {
      await updateRoundUseCase.execute(editingRound.id, roundData);
      customToast.success(t('success.roundUpdated'));
      setShowRoundModal(false);
      setEditingRound(null);
      await reloadSchedule();
    } catch (error) {
      console.error('Error updating round:', error);
      customToast.error(error.message || t('errors.failedToUpdateRound'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteRound = async (roundId) => {
    if (!window.confirm(t('rounds.confirmDelete'))) return;
    setIsProcessing(true);
    try {
      await deleteRoundUseCase.execute(roundId);
      customToast.success(t('success.roundDeleted'));
      await reloadSchedule();
    } catch (error) {
      console.error('Error deleting round:', error);
      customToast.error(error.message || t('errors.failedToDeleteRound'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateMatches = async (roundId) => {
    setIsProcessing(true);
    try {
      await generateMatchesUseCase.execute(roundId);
      customToast.success(t('success.matchesGenerated'));
      await reloadSchedule();
    } catch (error) {
      console.error('Error generating matches:', error);
      customToast.error(error.message || t('errors.failedToGenerateMatches'));
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Match handlers ---
  const handleStartMatch = async (matchId) => {
    setIsProcessing(true);
    try {
      await updateMatchStatusUseCase.execute(matchId, 'start');
      customToast.success(t('success.matchStatusUpdated'));
      await reloadSchedule();
    } catch (error) {
      console.error('Error starting match:', error);
      customToast.error(error.message || t('errors.failedToUpdateMatchStatus'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompleteMatch = async (matchId) => {
    setIsProcessing(true);
    try {
      await updateMatchStatusUseCase.execute(matchId, 'complete');
      customToast.success(t('success.matchStatusUpdated'));
      await reloadSchedule();
    } catch (error) {
      console.error('Error completing match:', error);
      customToast.error(error.message || t('errors.failedToUpdateMatchStatus'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeclareWalkover = async (winningTeam, reason) => {
    if (!walkoverMatch) return;
    setIsProcessing(true);
    try {
      await declareWalkoverUseCase.execute(walkoverMatch.id, winningTeam, reason);
      customToast.success(t('success.walkoverDeclared'));
      setShowWalkoverModal(false);
      setWalkoverMatch(null);
      await reloadSchedule();
    } catch (error) {
      console.error('Error declaring walkover:', error);
      customToast.error(error.message || t('errors.failedToDeclareWalkover'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReassignPlayers = async (teamAIds, teamBIds) => {
    if (!reassignMatch) return;
    setIsProcessing(true);
    try {
      await reassignPlayersUseCase.execute(reassignMatch.id, teamAIds, teamBIds);
      customToast.success(t('success.playersReassigned'));
      setShowReassignModal(false);
      setReassignMatch(null);
      await reloadSchedule();
    } catch (error) {
      console.error('Error reassigning players:', error);
      customToast.error(error.message || t('errors.failedToReassignPlayers'));
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Team assignment handler ---
  const handleAssignTeams = async (teamData) => {
    setIsProcessing(true);
    try {
      await assignTeamsUseCase.execute(id, teamData);
      customToast.success(t('success.teamsAssigned'));
      setShowTeamsModal(false);
      await reloadSchedule();
    } catch (error) {
      console.error('Error assigning teams:', error);
      customToast.error(error.message || t('errors.failedToAssignTeams'));
    } finally {
      setIsProcessing(false);
    }
  };

  // --- UI helpers ---
  const toggleRoundExpand = (roundId) => {
    setExpandedRounds(prev => ({ ...prev, [roundId]: !prev[roundId] }));
  };

  const openEditRound = (round) => {
    setEditingRound(round);
    setShowRoundModal(true);
  };

  const openWalkover = (match) => {
    setWalkoverMatch(match);
    setShowWalkoverModal(true);
  };

  const openReassign = (match) => {
    setReassignMatch(match);
    setShowReassignModal(true);
  };

  const openMatchDetail = (matchId) => {
    setDetailMatchId(matchId);
    setShowMatchDetailModal(true);
  };

  // --- Loading ---
  if (isLoadingUser || isLoading || isLoadingRoles) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-gray-600">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (!user || !competition) {
    return null;
  }

  const rounds = schedule?.rounds || [];
  const teamAssignment = schedule?.teamAssignment || null;
  const teamNames = {
    teamA: competition.team1Name || 'Team A',
    teamB: competition.team2Name || 'Team B',
  };

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-white">
      <div className="layout-container flex h-full grow flex-col">
        <HeaderAuth user={user} />

        <div className="px-4 md:px-40 flex flex-1 justify-center py-5">
          <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="p-4"
            >
              <button
                onClick={() => navigate(`/competitions/${id}`)}
                className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors mb-4"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">{t('backToDetail')}</span>
              </button>

              <div className="flex flex-wrap justify-between items-center gap-3">
                <div>
                  <h1 className="text-gray-900 text-3xl md:text-4xl font-bold">
                    {t('title')}
                  </h1>
                  <p className="text-gray-500 text-sm mt-1">{competition.name}</p>
                </div>
                {canManage && (
                  <button
                    onClick={() => {
                      setEditingRound(null);
                      setShowRoundModal(true);
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{t('rounds.create')}</span>
                  </button>
                )}
              </div>
            </motion.div>

            {/* Team Assignment Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="p-4"
            >
              <TeamAssignmentSection
                teamAssignment={teamAssignment}
                onAssignTeams={() => setShowTeamsModal(true)}
                canManage={canManage}
                playerNameMap={playerNameMap}
                enrollments={enrollments}
                teamNames={teamNames}
                t={t}
              />
            </motion.div>

            {/* Rounds List */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="p-4"
            >
              <h2 className="text-gray-900 font-bold text-xl mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                {t('rounds.title')} ({rounds.length})
              </h2>

              {rounds.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">{t('rounds.noRounds')}</p>
                  {canManage && (
                    <button
                      onClick={() => {
                        setEditingRound(null);
                        setShowRoundModal(true);
                      }}
                      className="mt-4 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
                    >
                      <Plus className="w-4 h-4 inline mr-1" />
                      {t('rounds.create')}
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {rounds.map((round) => (
                    <RoundCard
                      key={round.id}
                      round={round}
                      onEdit={() => openEditRound(round)}
                      onDelete={() => handleDeleteRound(round.id)}
                      onGenerateMatches={() => handleGenerateMatches(round.id)}
                      onToggleExpand={() => toggleRoundExpand(round.id)}
                      isExpanded={!!expandedRounds[round.id]}
                      canEdit={canManage}
                      onStartMatch={handleStartMatch}
                      onCompleteMatch={handleCompleteMatch}
                      onDeclareWalkover={openWalkover}
                      onReassignPlayers={openReassign}
                      onViewMatchDetail={openMatchDetail}
                      playerNameMap={playerNameMap}
                      golfCourses={golfCourses}
                      teamNames={teamNames}
                      t={t}
                    />
                  ))}
                </div>
              )}
            </motion.div>

            {/* Footer */}
            <footer className="flex flex-col gap-6 px-5 py-10 text-center">
              <p className="text-gray-500 text-base font-normal leading-normal">
                {tComp('footer')}
              </p>
            </footer>
          </div>
        </div>
      </div>

      {/* Round Form Modal */}
      {showRoundModal && (
        <RoundFormModal
          isOpen={showRoundModal}
          onClose={() => {
            setShowRoundModal(false);
            setEditingRound(null);
          }}
          onSubmit={editingRound ? handleUpdateRound : handleCreateRound}
          initialData={editingRound}
          golfCourses={golfCourses}
          competition={competition}
          isProcessing={isProcessing}
          t={t}
        />
      )}

      {/* Walkover Modal */}
      {showWalkoverModal && walkoverMatch && (
        <WalkoverModal
          isOpen={showWalkoverModal}
          onClose={() => {
            setShowWalkoverModal(false);
            setWalkoverMatch(null);
          }}
          onConfirm={handleDeclareWalkover}
          matchNumber={walkoverMatch.matchNumber}
          isProcessing={isProcessing}
          teamNames={teamNames}
          t={t}
        />
      )}

      {/* Reassign Players Modal */}
      {showReassignModal && reassignMatch && (
        <ReassignPlayersModal
          isOpen={showReassignModal}
          onClose={() => {
            setShowReassignModal(false);
            setReassignMatch(null);
          }}
          onConfirm={handleReassignPlayers}
          match={reassignMatch}
          enrollments={enrollments}
          isProcessing={isProcessing}
          teamNames={teamNames}
          t={t}
        />
      )}

      {/* Match Detail Modal */}
      {showMatchDetailModal && detailMatchId && (
        <MatchDetailModal
          isOpen={showMatchDetailModal}
          onClose={() => {
            setShowMatchDetailModal(false);
            setDetailMatchId(null);
          }}
          matchId={detailMatchId}
          playerNameMap={playerNameMap}
          teamNames={teamNames}
          t={t}
        />
      )}

      {/* Assign Teams Modal */}
      {showTeamsModal && (
        <AssignTeamsModal
          isOpen={showTeamsModal}
          onClose={() => setShowTeamsModal(false)}
          onConfirm={handleAssignTeams}
          enrollments={enrollments}
          isProcessing={isProcessing}
          teamNames={teamNames}
          t={t}
        />
      )}
    </div>
  );
};

export default SchedulePage;
