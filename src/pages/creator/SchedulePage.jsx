import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, Mail, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import customToast from '../../utils/toast';
import HeaderAuth from '../../components/layout/HeaderAuth';
import { useAuth } from '../../hooks/useAuth';
import { useUserRoles } from '../../hooks/useUserRoles';
import RoundCard from '../../components/schedule/RoundCard';
import TeamAssignmentSection from '../../components/schedule/TeamAssignmentSection';
import WalkoverModal from '../../components/schedule/WalkoverModal';
import ReassignPlayersModal from '../../components/schedule/ReassignPlayersModal';
import MatchDetailModal from '../../components/schedule/MatchDetailModal';
import AssignTeamsModal from '../../components/schedule/AssignTeamsModal';
import FillCaptainModal from '../../components/schedule/FillCaptainModal';
import GenerateMatchesModal from '../../components/schedule/GenerateMatchesModal';
import ResetEnvelopesModal from '../../components/schedule/ResetEnvelopesModal';
import {
  getScheduleUseCase,
  getCompetitionDetailUseCase,
  getCompetitionGolfCoursesUseCase,
  listEnrollmentsUseCase,
  generateMatchesUseCase,
  assignTeamsUseCase,
  fillCaptainUseCase,
  updateMatchStatusUseCase,
  declareWalkoverUseCase,
  reassignPlayersUseCase,
  resetEnvelopesUseCase,
} from '../../composition';
import FullScreenLoader from '../../components/ui/FullScreenLoader';

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
  // Cubrir el puesto de un capitán que se fue tras el reparto (FE #692)
  const [cubriendoCapitan, setCubriendoCapitan] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // UI state
  const [expandedRounds, setExpandedRounds] = useState({});
  // La sesión cuyos sobres se van a rehacer, mientras se confirma
  const [rehaciendoSobres, setRehaciendoSobres] = useState(null);
  const [showWalkoverModal, setShowWalkoverModal] = useState(false);
  const [walkoverMatch, setWalkoverMatch] = useState(null);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignMatch, setReassignMatch] = useState(null);
  const [showMatchDetailModal, setShowMatchDetailModal] = useState(false);
  const [detailMatchId, setDetailMatchId] = useState(null);
  const [showTeamsModal, setShowTeamsModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateRound, setGenerateRound] = useState(null);

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

  const playerHandicapMap = useMemo(() => {
    const map = new Map();
    enrollments.forEach((e) => {
      if (e.userId && e.userHandicap != null) {
        map.set(e.userId, Number(e.userHandicap));
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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing pattern surfaced by eslint-plugin-react-hooks 7.1.1 bump; needs dedicated review (tracked in follow-up)
      loadData();
    }
  }, [user, loadData]);

  const jugadoresDelEquipo = (equipo) => {
    const lista =
      equipo === 'A' ? teamAssignment?.teamAPlayerIds : teamAssignment?.teamBPlayerIds;
    // Los que siguen inscritos: el reparto guarda la lista tal cual y una baja
    // no la toca, así que quien se retiró sigue ahí y ya no puede capitanear
    const aprobados = new Set(
      enrollments.filter((e) => e.status === 'APPROVED').map((e) => e.userId)
    );
    return (lista || [])
      .filter((id) => aprobados.has(id))
      .map((id) => ({ userId: id, name: playerNameMap.get(id) || id }));
  };

  const cubrirCapitan = async (playerId) => {
    setIsProcessing(true);
    try {
      const { captains } = await fillCaptainUseCase.execute(id, cubriendoCapitan, playerId);
      setCompetition((prev) => ({ ...prev, captains }));
      setCubriendoCapitan(null);
      customToast.success(t('success.captainFilled'));
    } catch (error) {
      console.error('Error filling captain:', error);
      customToast.error(error.message || t('errors.failedToFillCaptain'));
    } finally {
      setIsProcessing(false);
    }
  };

  const rehacerSobres = async () => {
    setIsProcessing(true);
    try {
      await resetEnvelopesUseCase.execute(rehaciendoSobres);
      setRehaciendoSobres(null);
      customToast.success(tComp('envelope.resetDone'));
      await loadData();
    } catch (error) {
      // El servidor es quien sabe si esa sesión ya se jugó o si no había nada
      // que rehacer: aquí se enseña lo que diga
      customToast.error(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const recargarCompeticion = async () => {
    try {
      setCompetition(await getCompetitionDetailUseCase.execute(id));
    } catch (error) {
      console.error('Error reloading competition:', error);
    }
  };

  const reloadSchedule = async () => {
    try {
      const scheduleData = await getScheduleUseCase.execute(id);
      setSchedule(scheduleData);
    } catch (error) {
      console.error('Error reloading schedule:', error);
      customToast.error(t('errors.failedToLoadSchedule'));
    }
  };

  // --- Permissions ---
  const isCreator = competition?.creatorId === user?.id;
  const canManage = isCreator || hasCreatorRole || isAdmin;

  const handleGenerateMatches = async (roundId, manualPairings = null) => {
    setIsProcessing(true);
    try {
      const pairings = manualPairings
        ? { manualPairings }
        : {};
      await generateMatchesUseCase.execute(roundId, pairings);
      customToast.success(t('success.matchesGenerated'));
      setShowGenerateModal(false);
      setGenerateRound(null);
      await reloadSchedule();
    } catch (error) {
      console.error('Error generating matches:', error);
      customToast.error(error.message || t('errors.failedToGenerateMatches'));
    } finally {
      setIsProcessing(false);
    }
  };

  const openGenerateModal = (round) => {
    setGenerateRound(round);
    setShowGenerateModal(true);
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
      // La competición también: repartir libera los subcapitanes en el servidor
      // (RyderCupAM#320), y sin recargarla la etiqueta seguiría pegada a quien
      // ya no lo es
      await Promise.all([reloadSchedule(), recargarCompeticion()]);
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

  const handleScoreMatch = (matchId) => {
    navigate(`/player/matches/${matchId}/scoring`);
  };

  // --- Loading ---
  if (isLoadingUser || isLoading || isLoadingRoles) {
    return (
      <FullScreenLoader texto={t('loading')} />
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
  // Quien capitanea un equipo tiene un sobre que entregar en cada sesión, y
  // sin equipos repartidos no hay a quién ordenar (FE #655). El organizador
  // entra también: es quien los abre cuando un capitán no aparece
  const esCapitan =
    Boolean(user?.id) &&
    [competition.captains?.teamA, competition.captains?.teamB].includes(user.id);
  const entraALosSobres = esCapitan || (Boolean(user?.id) && competition.creatorId === user.id);
  const hayEquipos = Boolean(teamAssignment);

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
                className="hidden md:flex items-center gap-2 text-gray-600 hover:text-primary transition-colors mb-4"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">{t('backToDetail')}</span>
              </button>

              <div className="flex flex-wrap justify-between items-center gap-3">
                <div>
                  <h1 className="hidden md:block text-gray-900 text-3xl md:text-4xl font-bold">
                    {t('title')}
                  </h1>
                  <p className="text-gray-500 text-sm mt-1">{competition.name}</p>
                </div>
                {/* La agenda se cambia en la ficha (FE #654): aquí se quedan los
                    equipos, los partidos y los sobres */}
                <Link
                  to={`/competitions/${id}`}
                  data-testid="agenda-en-la-ficha"
                  className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Calendar className="w-4 h-4" />
                  <span>{t('agenda.inDetail')}</span>
                </Link>
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
                maxPlayingHandicap={competition.maxPlayingHandicap ?? null}
                captains={competition.captains}
                status={competition.status}
                onFillCaptain={setCubriendoCapitan}
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
                </div>
              ) : (
                <div className="space-y-4">
                  {rounds.map((round) => (
                    <div key={round.id} className="space-y-2">
                      {/* El sobre del capitán para ESTA sesión (FE #655). Aquí
                          y no en la ficha porque el sobre es de una sesión, no
                          de la competición; esta pantalla la ven también los
                          capitanes que no organizan, por la ruta pública */}
                      {entraALosSobres &&
                        competition.setupMode === 'RYDER_CUP' &&
                        hayEquipos && (
                        <Link
                          to={`/competitions/${id}/rounds/${round.id}/envelope`}
                          data-testid={`ir-al-sobre-${round.id}`}
                          className="flex items-center justify-center gap-2 rounded-lg bg-yellow-600 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-700"
                        >
                          <Mail className="h-4 w-4" />
                          {tComp('envelope.open')}
                        </Link>
                      )}
                      {/* Rehacer el proceso entero es cosa del organizador: el
                          capitán que entregó a tiempo no se queda sin su lista
                          por culpa del que se olvidó */}
                      {canManage && competition.setupMode === 'RYDER_CUP' && hayEquipos && (
                        <button
                          type="button"
                          data-testid={`rehacer-sobres-${round.id}`}
                          onClick={() => setRehaciendoSobres(round.id)}
                          className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          <RotateCcw className="h-4 w-4" />
                          {tComp('envelope.reset')}
                        </button>
                      )}
                    <RoundCard
                      round={round}
                      onGenerateMatches={() => openGenerateModal(round)}
                      onToggleExpand={() => toggleRoundExpand(round.id)}
                      isExpanded={!!expandedRounds[round.id]}
                      canEdit={canManage}
                      onStartMatch={handleStartMatch}
                      onCompleteMatch={handleCompleteMatch}
                      onDeclareWalkover={openWalkover}
                      onReassignPlayers={openReassign}
                      onViewMatchDetail={openMatchDetail}
                      onScoreMatch={handleScoreMatch}
                      playerNameMap={playerNameMap}
                      playerHandicapMap={playerHandicapMap}
                      maxPlayingHandicap={competition.maxPlayingHandicap ?? null}
                      golfCourses={golfCourses}
                      teamNames={teamNames}
                      t={t}
                    />
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Footer */}
            <footer className="flex flex-col gap-6 px-5 py-10 text-center">
              <p className="text-gray-500 text-base font-normal leading-normal">
                {tComp('footer', { year: new Date().getFullYear() })}
              </p>
            </footer>
          </div>
        </div>
      </div>

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
          playerHandicapMap={playerHandicapMap}
          maxPlayingHandicap={competition.maxPlayingHandicap ?? null}
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
          captains={competition.captains}
          hasTeams={Boolean(teamAssignment)}
          t={t}
        />
      )}

      {/* Cubrir el puesto de un capitán que se fue tras el reparto (FE #692) */}
      {cubriendoCapitan && (
        <FillCaptainModal
          isOpen
          team={cubriendoCapitan}
          teamName={cubriendoCapitan === 'A' ? teamNames.teamA : teamNames.teamB}
          players={jugadoresDelEquipo(cubriendoCapitan)}
          onConfirm={cubrirCapitan}
          onClose={() => setCubriendoCapitan(null)}
          isLoading={isProcessing}
          t={t}
        />
      )}

      {/* Generate Matches Modal */}
      {showGenerateModal && generateRound && (
        <GenerateMatchesModal
          isOpen={showGenerateModal}
          onClose={() => { setShowGenerateModal(false); setGenerateRound(null); }}
          onConfirm={(pairings) => handleGenerateMatches(generateRound.id, pairings)}
          round={generateRound}
          enrollments={enrollments}
          teamAssignment={teamAssignment}
          isProcessing={isProcessing}
          teamNames={teamNames}
          playerNameMap={playerNameMap}
          t={t}
        />
      )}

      {/* Rehacer los sobres de una sesión (FE #655) */}
      {rehaciendoSobres && (
        <ResetEnvelopesModal
          isOpen={Boolean(rehaciendoSobres)}
          onConfirm={rehacerSobres}
          onClose={() => setRehaciendoSobres(null)}
          isLoading={isProcessing}
          t={tComp}
        />
      )}
    </div>
  );
};

export default SchedulePage;
