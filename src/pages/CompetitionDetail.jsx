import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, Calendar, MapPin, Settings, ArrowLeft,
  Edit, Trash2, Play, CheckCircle, XCircle, Pause,
  AlertCircle, Loader, UserPlus, Shield
} from 'lucide-react';
import customToast from '../utils/toast';
import { useTranslation } from 'react-i18next';
import HeaderAuth from '../components/layout/HeaderAuth';
import { useAuth } from '../hooks/useAuth';
import { useUserRoles } from '../hooks/useUserRoles';
import { CountryFlag } from '../utils/countryUtils';
import {
  getCompetitionDetailUseCase,
  activateCompetitionUseCase,
  closeEnrollmentsUseCase,
  startCompetitionUseCase,
  completeCompetitionUseCase,
  cancelCompetitionUseCase,
  listEnrollmentsUseCase,
  requestEnrollmentUseCase,
  approveEnrollmentUseCase,
  rejectEnrollmentUseCase,
} from '../composition';
import {
  deleteCompetition,
  getStatusColor,
  getEnrollmentStatusColor,
  formatDateRange,
} from '../services/competitions';

const CompetitionDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { t } = useTranslation('competitions');
  const { user, loading: isLoadingUser } = useAuth();
  const { isAdmin, isCreator: hasCreatorRole, isLoading: isLoadingRoles } = useUserRoles(id);
  const [competition, setCompetition] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [isLoadingCompetition, setIsLoadingCompetition] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Determine where user came from (browse or my competitions)
  const fromBrowse = location.state?.from === 'browse';
  const backLink = fromBrowse ? '/browse-competitions' : '/competitions';
  const backText = fromBrowse ? t('detail.backToBrowse') : t('detail.backToCompetitions');

  const loadCompetition = useCallback(async () => {
    if (!user) return;
    
    setIsLoadingCompetition(true);
    try {
      // Use GetCompetitionDetailUseCase instead of direct service call
      const data = await getCompetitionDetailUseCase.execute(id);
      setCompetition(data);

      // Load enrollments only if user can manage the competition (for optimization)
      // Note: isAdmin and hasCreatorRole might not be available yet during initial load,
      // so we still check creatorId. The canManage logic will handle display permissions.
      if (user && data.creatorId === user.id) {
        const enrollmentsData = await listEnrollmentsUseCase.execute(id);
        setEnrollments(enrollmentsData);
      }
    } catch (error) {
      console.error('Error loading competition:', error);
      customToast.error(error.message || t('detail.failedToLoadCompetition'));
      navigate('/competitions');
    } finally {
      setIsLoadingCompetition(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user, navigate]);

  useEffect(() => {
    if (user) {
      loadCompetition();
    }
  }, [id, user, loadCompetition]);

  const isLoading = isLoadingUser || isLoadingCompetition || isLoadingRoles;

  const handleStatusChange = async (action) => {
    // Validate golf courses approval status before activation
    if (action === 'activate') {
      const golfCourses = competition?.golfCourses || [];

      if (golfCourses.length === 0) {
        customToast.error(t('detail.errors.noGolfCourses'));
        return;
      }

      const pendingCourses = golfCourses.filter(gc => gc.approvalStatus === 'PENDING_APPROVAL');
      if (pendingCourses.length > 0) {
        const courseNames = pendingCourses.map(gc => gc.name).join(', ');
        customToast.error(t('detail.errors.golfCoursesPendingApproval', { courses: courseNames }));
        return;
      }

      const rejectedCourses = golfCourses.filter(gc => gc.approvalStatus === 'REJECTED');
      if (rejectedCourses.length > 0) {
        const courseNames = rejectedCourses.map(gc => gc.name).join(', ');
        customToast.error(t('detail.errors.golfCoursesRejected', { courses: courseNames }));
        return;
      }
    }

    const confirmationKey = `detail.confirmations.${action}`;
    if (!window.confirm(t(confirmationKey))) {
      return;
    }

    setIsProcessing(true);
    try {
      let result;
      switch (action) {
        case 'activate':
          result = await activateCompetitionUseCase.execute(id);
          customToast.success(t('detail.actions.activate'));
          break;
        case 'close-enrollments':
          result = await closeEnrollmentsUseCase.execute(id);
          customToast.success(t('detail.actions.closeEnrollments'));
          break;
        case 'start':
          result = await startCompetitionUseCase.execute(id);
          customToast.success(t('detail.actions.startCompetition'));
          break;
        case 'complete':
          result = await completeCompetitionUseCase.execute(id);
          customToast.success(t('detail.actions.complete'));
          break;
        case 'cancel':
          result = await cancelCompetitionUseCase.execute(id);
          customToast.success(t('detail.actions.cancel'));
          break;
        default:
          throw new Error('Invalid action');
      }

      // Update only the changed fields (status and updatedAt)
      setCompetition(prev => ({
        ...prev,
        status: result.status,
        updatedAt: result.updatedAt
      }));
    } catch (error) {
      console.error(`Error ${action}:`, error);
      customToast.error(error.message || t('detail.failedToUpdateCompetition'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t('detail.confirmations.delete'))) {
      return;
    }

    setIsProcessing(true);
    try {
      await deleteCompetition(id);
      customToast.success(t('detail.actions.delete'));
      navigate('/competitions');
    } catch (error) {
      console.error('Error deleting competition:', error);
      customToast.error(error.message || t('detail.failedToDeleteCompetition'));
      setIsProcessing(false);
    }
  };

  const handleEnroll = async () => {
    setIsProcessing(true);
    try {
      await requestEnrollmentUseCase.execute(id);
      customToast.success(t('detail.actions.requestToJoin'));
      await loadCompetition();
    } catch (error) {
      console.error('Error enrolling:', error);
      customToast.error(error.message || t('detail.failedToEnroll'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApproveEnrollment = async (enrollmentId) => {
    try {
      // ApproveEnrollmentUseCase expects (competitionId, enrollmentId, teamId?)
      await approveEnrollmentUseCase.execute(competition.id, enrollmentId);
      customToast.success(t('detail.enrollmentApproved'));
      // Reload enrollments to update the list
      const enrollmentsData = await listEnrollmentsUseCase.execute(competition.id);
      setEnrollments(enrollmentsData);
    } catch (error) {
      console.error('Error approving enrollment:', error);
      customToast.error(error.message || t('detail.failedToApprove'));
    }
  };

  const handleRejectEnrollment = async (enrollmentId) => {
    if (!window.confirm(t('detail.confirmations.rejectEnrollment'))) {
      return;
    }
    try {
      // RejectEnrollmentUseCase expects (competitionId, enrollmentId)
      await rejectEnrollmentUseCase.execute(competition.id, enrollmentId);
      customToast.success(t('detail.enrollmentRejected'));
      // Reload enrollments to update the list
      const enrollmentsData = await listEnrollmentsUseCase.execute(competition.id);
      setEnrollments(enrollmentsData);
    } catch (error) {
      console.error('Error rejecting enrollment:', error);
      customToast.error(error.message || t('detail.failedToReject'));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-gray-600">{t('detail.loadingCompetition')}</p>
        </div>
      </div>
    );
  }

  if (!user || !competition) {
    return null;
  }

  // User is considered creator if they created the competition OR have CREATOR/ADMIN role
  const isCreator = competition.creatorId === user.id;
  const canManage = isCreator || hasCreatorRole || isAdmin;
  const canEdit = canManage && competition.status === 'DRAFT';
  const canDelete = canManage && competition.status === 'DRAFT';

  // Check for user enrollment from two sources:
  // 1. From enrollments list (when loaded from detail page)
  // 2. From competition.enrollment_status (mapped from backend's user_enrollment_status)
  const userEnrollment = enrollments.find((e) => e.user_id === user.id);
  const hasEnrollment = userEnrollment || competition.enrollment_status;

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
                onClick={() => navigate(backLink)}
                className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors mb-4"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">{backText}</span>
              </button>

              <div className="bg-primary-50 rounded-xl border border-primary-200 p-6 shadow-md">
                <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                  <div className="flex-1">
                    <h1 className="text-gray-900 text-3xl md:text-4xl font-bold mb-2">
                      {competition.name}
                    </h1>
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                          competition.status
                        )}`}
                      >
                        {competition.status && t(`status.${competition.status}`)}
                      </span>
                      {isCreator && (
                        <div className="flex items-center gap-1.5 text-accent text-sm font-medium">
                          <Shield className="w-4 h-4" />
                          <span>{t('detail.creator')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Calendar className="w-5 h-5" />
                    <div>
                      <p className="text-xs text-gray-500">{t('detail.dates')}</p>
                      <p className="text-sm font-medium">
                        {formatDateRange(competition.startDate, competition.endDate)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Users className="w-5 h-5" />
                    <div>
                      <p className="text-xs text-gray-500">{t('detail.players')}</p>
                      <p className="text-sm font-medium">
                        {enrollments.filter((e) => e.status === 'APPROVED').length} /{' '}
                        {competition.maxPlayers || '∞'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Countries Badges */}
                {competition.countries && competition.countries.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-primary-200">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-5 h-5 text-gray-700 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-2">{t('detail.countries')}</p>
                        <div className="flex flex-wrap gap-2">
                          {competition.countries.map((country, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium border border-primary/20"
                            >
                              <CountryFlag countryCode={country.code} className="w-5 h-5" />
                              <span>{country.name}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Action Buttons */}
            {canManage && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="p-4"
              >
                <div className="flex flex-wrap gap-3">
                  {canEdit && (
                    <button
                      onClick={() => navigate(`/competitions/${id}/edit`)}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-md"
                    >
                      <Edit className="w-4 h-4" />
                      <span>{t('detail.actions.edit')}</span>
                    </button>
                  )}

                  {competition.status === 'DRAFT' && (
                    <button
                      onClick={() => handleStatusChange('activate')}
                      disabled={isProcessing}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors shadow-md disabled:opacity-50"
                    >
                      <Play className="w-4 h-4" />
                      <span>{t('detail.actions.activate')}</span>
                    </button>
                  )}

                  {competition.status === 'ACTIVE' && (
                    <button
                      onClick={() => handleStatusChange('close-enrollments')}
                      disabled={isProcessing}
                      className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 transition-colors shadow-md disabled:opacity-50"
                    >
                      <Pause className="w-4 h-4" />
                      <span>{t('detail.actions.closeEnrollments')}</span>
                    </button>
                  )}

                  {competition.status === 'CLOSED' && (
                    <button
                      onClick={() => handleStatusChange('start')}
                      disabled={isProcessing}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50"
                    >
                      <Play className="w-4 h-4" />
                      <span>{t('detail.actions.startCompetition')}</span>
                    </button>
                  )}

                  {competition.status === 'IN_PROGRESS' && (
                    <button
                      onClick={() => handleStatusChange('complete')}
                      disabled={isProcessing}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors shadow-md disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>{t('detail.actions.complete')}</span>
                    </button>
                  )}

                  {competition.status !== 'CANCELLED' && competition.status !== 'COMPLETED' && (
                    <button
                      onClick={() => handleStatusChange('cancel')}
                      disabled={isProcessing}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors shadow-md disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>{t('detail.actions.cancel')}</span>
                    </button>
                  )}

                  {canDelete && (
                    <button
                      onClick={handleDelete}
                      disabled={isProcessing}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors shadow-md disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>{t('detail.actions.delete')}</span>
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* Enrollment Button for Regular Users (not creators/admins) */}
            {!canManage && competition.status === 'ACTIVE' && !hasEnrollment && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="p-4"
              >
                <button
                  onClick={handleEnroll}
                  disabled={isProcessing}
                  className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-md disabled:opacity-50"
                >
                  <UserPlus className="w-5 h-5" />
                  <span>{t('detail.actions.requestToJoin')}</span>
                </button>
              </motion.div>
            )}

            {/* User Enrollment Status */}
            {hasEnrollment && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="p-4"
              >
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-600" />
                    <span className="text-blue-900 font-medium">{t('detail.enrollmentStatus')}</span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${getEnrollmentStatusColor(
                        userEnrollment?.status || competition.enrollment_status
                      )}`}
                    >
                      {(userEnrollment?.status || competition.enrollment_status) &&
                        t(`enrollmentStatus.${userEnrollment?.status || competition.enrollment_status}`)}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Competition Details */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="p-4"
            >
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-gray-900 font-bold text-lg mb-4 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" />
                  {t('detail.settings.title')}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-500 text-sm">{t('detail.settings.teamOne')}</span>
                    <p className="text-gray-900 font-medium">{competition.team1Name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 text-sm">{t('detail.settings.teamTwo')}</span>
                    <p className="text-gray-900 font-medium">{competition.team2Name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 text-sm">{t('detail.settings.handicapType')}</span>
                    <p className="text-gray-900 font-medium">{competition.handicapType}</p>
                  </div>
                  {competition.handicapPercentage && (
                    <div>
                      <span className="text-gray-500 text-sm">{t('detail.settings.handicapPercentage')}</span>
                      <p className="text-gray-900 font-medium">{competition.handicapPercentage}%</p>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500 text-sm">{t('detail.settings.teamAssignment')}</span>
                    <p className="text-gray-900 font-medium">{competition.teamAssignment}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 text-sm">{t('detail.settings.created')}</span>
                    <p className="text-gray-900 font-medium">
                      {new Date(competition.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Enrollments List - Only visible to creator/admin */}
            {canManage && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="p-4 space-y-4"
              >
                {/* Approved Players Section */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  <h3 className="text-gray-900 font-bold text-lg mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-green-600" />
                    {t('detail.approvedPlayers', { count: enrollments.filter(e => e.status === 'APPROVED').length })}
                  </h3>

                  {enrollments.filter(e => e.status === 'APPROVED').length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>{t('detail.noApprovedPlayers')}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {enrollments
                        .filter(e => e.status === 'APPROVED')
                        .sort((a, b) => {
                          // Sort by team first, then by handicap
                          if (a.team && b.team && a.team !== b.team) {
                            return a.team.localeCompare(b.team);
                          }
                          return (a.userHandicap || 999) - (b.userHandicap || 999);
                        })
                        .map((enrollment) => (
                          <div
                            key={enrollment.id}
                            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-green-50 hover:bg-green-100 transition-colors"
                          >
                            <div className="flex-1">
                              <p className="text-gray-900 font-semibold">
                                {enrollment.userName || 'Unknown User'}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                {enrollment.userHandicap !== null && enrollment.userHandicap !== undefined ? (
                                  <span className="text-green-700 text-sm font-medium">
                                    {t('detail.handicapLabel', { handicap: Number(enrollment.userHandicap).toFixed(1) })}
                                  </span>
                                ) : (
                                  <span className="text-gray-500 text-sm">{t('detail.noHandicap')}</span>
                                )}
                              </div>
                            </div>
                            {enrollment.team && (
                              <span className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-semibold">
                                {enrollment.team}
                              </span>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Pending Requests Section */}
                {enrollments.filter(e => e.status === 'REQUESTED').length > 0 && (
                  <div className="bg-white border border-orange-200 rounded-xl p-6 shadow-sm">
                    <h3 className="text-gray-900 font-bold text-lg mb-4 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-orange-600" />
                      {t('detail.pendingRequests', { count: enrollments.filter(e => e.status === 'REQUESTED').length })}
                    </h3>

                    <div className="space-y-3">
                      {enrollments
                        .filter(e => e.status === 'REQUESTED')
                        .map((enrollment) => (
                          <div
                            key={enrollment.id}
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border border-orange-200 rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors"
                          >
                            <div className="flex-1">
                              <p className="text-gray-900 font-semibold">
                                {enrollment.userName || 'Unknown User'}
                              </p>
                              <p className="text-gray-600 text-sm">
                                {enrollment.userEmail || t('detail.noEmail')}
                              </p>
                              {enrollment.userHandicap !== null && enrollment.userHandicap !== undefined && (
                                <p className="text-gray-500 text-sm mt-1">
                                  {t('detail.handicapLabel', { handicap: Number(enrollment.userHandicap).toFixed(1) })}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                              <button
                                onClick={() => handleApproveEnrollment(enrollment.id)}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors shadow-sm"
                                title="Approve enrollment"
                              >
                                ✓ {t('detail.approve')}
                              </button>
                              <button
                                onClick={() => handleRejectEnrollment(enrollment.id)}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors shadow-sm"
                                title="Reject enrollment"
                              >
                                ✗ {t('detail.reject')}
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Rejected Enrollments Section - Collapsible */}
                {enrollments.filter(e => e.status === 'REJECTED').length > 0 && (
                  <details className="bg-white border border-gray-200 rounded-xl shadow-sm">
                    <summary className="p-6 cursor-pointer hover:bg-gray-50 transition-colors">
                      <h3 className="text-gray-700 font-semibold text-md inline-flex items-center gap-2">
                        <XCircle className="w-5 h-5 text-red-600" />
                        {t('detail.rejectedEnrollments', { count: enrollments.filter(e => e.status === 'REJECTED').length })}
                      </h3>
                    </summary>
                    <div className="px-6 pb-6 space-y-3">
                      {enrollments
                        .filter(e => e.status === 'REJECTED')
                        .map((enrollment) => (
                          <div
                            key={enrollment.id}
                            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50"
                          >
                            <div className="flex-1">
                              <p className="text-gray-700 font-medium">
                                {enrollment.userName || 'Unknown User'}
                              </p>
                              <p className="text-gray-500 text-sm">
                                {enrollment.userEmail || t('detail.noEmail')}
                              </p>
                            </div>
                            <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
                              {t('detail.rejected')}
                            </span>
                          </div>
                        ))}
                    </div>
                  </details>
                )}
              </motion.div>
            )}

            {/* Footer */}
            <footer className="flex flex-col gap-6 px-5 py-10 text-center">
              <p className="text-gray-500 text-base font-normal leading-normal">
                {t('footer')}
              </p>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompetitionDetail;
