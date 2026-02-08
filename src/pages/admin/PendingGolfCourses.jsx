import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader, X, Flag, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import customToast from '../../utils/toast';
import HeaderAuth from '../../components/layout/HeaderAuth';
import { useAuth } from '../../hooks/useAuth';
import GolfCourseTable from '../../components/golf_course/GolfCourseTable';
import TeeCategoryBadge from '../../components/golf_course/TeeCategoryBadge';
import { CountryFlag } from '../../utils/countryUtils';
import { formatCountryName } from '../../services/countries';
import {
  listPendingGolfCoursesUseCase,
  approveGolfCourseUseCase,
  rejectGolfCourseUseCase,
  approveGolfCourseUpdateUseCase,
  rejectGolfCourseUpdateUseCase,
  fetchCountriesUseCase,
} from '../../composition';

/**
 * PendingGolfCourses Page (Admin)
 * Lists all pending golf courses
 * Two tabs: New Requests + Update Proposals
 */
const PendingGolfCourses = () => {
  const { t, i18n } = useTranslation('golfCourses');
  const { user, loading: isLoadingUser } = useAuth();

  const [pendingCourses, setPendingCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('new'); // 'new' or 'updates'
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [courseToReject, setCourseToReject] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [courseToView, setCourseToView] = useState(null);
  const [allCountries, setAllCountries] = useState([]);

  // Derive isAdmin from authenticated user's roles or is_admin flag
  // Backend returns is_admin: true for admin users (see RoleGuard.jsx for reference)
  const isAdmin = user?.is_admin === true || user?.roles?.some(role =>
    typeof role === 'string' ? role === 'ADMIN' : role.name === 'ADMIN'
  ) || false;

  // Load pending courses
  const loadPendingCourses = async () => {
    setIsLoading(true);
    try {
      const data = await listPendingGolfCoursesUseCase.execute();
      setPendingCourses(data);
    } catch (error) {
      console.error('Error loading pending golf courses:', error);
      customToast.error(error.message || t('pages.pending.errorLoading'));
    } finally {
      setIsLoading(false);
    }
  };

  // Load countries for details modal
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const data = await fetchCountriesUseCase.execute();
        setAllCountries(data || []);
      } catch (error) {
        console.error('Error fetching countries:', error);
      }
    };
    fetchCountries();
  }, []);

  useEffect(() => {
    if (user) {
      loadPendingCourses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Separate new requests from update proposals
  const newRequests = pendingCourses.filter(c => c.originalGolfCourseId === null);
  const updateProposals = pendingCourses.filter(c => c.originalGolfCourseId !== null);

  // Handle approve new request
  const handleApproveNew = async (course) => {
    if (!window.confirm(t('pages.pending.confirmApprove', { name: course.name }))) {
      return;
    }

    try {
      await approveGolfCourseUseCase.execute(course.id);
      customToast.success(t('pages.pending.approveSuccess'));
      await loadPendingCourses();
    } catch (error) {
      console.error('Error approving golf course:', error);
      customToast.error(error.message || t('pages.pending.approveFailed'));
    }
  };

  // Handle view details
  const handleViewDetails = (course) => {
    setCourseToView(course);
    setShowDetailsModal(true);
  };

  // Handle reject new request
  const handleRejectNew = (course) => {
    setCourseToReject(course);
    setRejectReason('');
    setShowRejectModal(true);
  };

  // Confirm reject
  const confirmReject = async () => {
    if (!courseToReject) return;

    if (rejectReason.trim().length < 10) {
      customToast.error(t('pages.pending.rejectReasonTooShort'));
      return;
    }

    try {
      await rejectGolfCourseUseCase.execute(courseToReject.id, rejectReason.trim());
      customToast.success(t('pages.pending.rejectSuccess'));
      setShowRejectModal(false);
      setCourseToReject(null);
      setRejectReason('');
      await loadPendingCourses();
    } catch (error) {
      console.error('Error rejecting golf course:', error);
      customToast.error(error.message || t('pages.pending.rejectFailed'));
    }
  };

  // Handle approve update
  const handleApproveUpdate = async (clone) => {
    if (!window.confirm(t('pages.pending.confirmApproveUpdate', { name: clone.name }))) {
      return;
    }

    try {
      await approveGolfCourseUpdateUseCase.execute(clone.id);
      customToast.success(t('pages.pending.approveUpdateSuccess'));
      await loadPendingCourses();
    } catch (error) {
      console.error('Error approving update:', error);
      customToast.error(error.message || t('pages.pending.approveUpdateFailed'));
    }
  };

  // Handle reject update
  const handleRejectUpdate = async (clone) => {
    if (!window.confirm(t('pages.pending.confirmRejectUpdate', { name: clone.name }))) {
      return;
    }

    try {
      await rejectGolfCourseUpdateUseCase.execute(clone.id);
      customToast.success(t('pages.pending.rejectUpdateSuccess'));
      await loadPendingCourses();
    } catch (error) {
      console.error('Error rejecting update:', error);
      customToast.error(error.message || t('pages.pending.rejectUpdateFailed'));
    }
  };

  if (isLoadingUser || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-gray-600">{t('common:loading')}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const currentCourses = activeTab === 'new' ? newRequests : updateProposals;

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-white">
      <div className="layout-container flex h-full grow flex-col">
        <HeaderAuth user={user} />

        <div className="px-4 md:px-40 flex flex-1 justify-center py-5">
          <div className="layout-content-container flex flex-col max-w-[1200px] flex-1">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="p-4"
            >
              <h1 className="text-gray-900 tracking-tight text-3xl md:text-[32px] font-bold leading-tight">
                {t('pages.pending.title')}
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                {t('pages.pending.subtitle')}
              </p>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="p-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">
                    {t('pages.pending.newRequests')}: <span className="font-bold text-gray-900">{newRequests.length}</span>
                  </p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">
                    {t('pages.pending.updateProposals')}: <span className="font-bold text-gray-900">{updateProposals.length}</span>
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Tabs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="p-4"
            >
              <div className="flex gap-2 border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('new')}
                  className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                    activeTab === 'new'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t('pages.pending.tabNew')} ({newRequests.length})
                </button>
                <button
                  onClick={() => setActiveTab('updates')}
                  className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                    activeTab === 'updates'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t('pages.pending.tabUpdates')} ({updateProposals.length})
                </button>
              </div>
            </motion.div>

            {/* Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="p-4"
            >
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <GolfCourseTable
                  courses={currentCourses}
                  onView={handleViewDetails}
                  onApprove={activeTab === 'new' ? handleApproveNew : handleApproveUpdate}
                  onReject={activeTab === 'new' ? handleRejectNew : handleRejectUpdate}
                  isAdmin={isAdmin}
                  showActions={true}
                />
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {showDetailsModal && courseToView && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl max-w-4xl w-full my-8"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{courseToView.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <CountryFlag countryCode={courseToView.countryCode} style={{ width: '20px', height: 'auto' }} />
                  <span className="text-sm text-gray-600">
                    {formatCountryName(
                      allCountries.find(c => c.code === courseToView.countryCode) || { name_en: courseToView.countryCode },
                      i18n.language
                    )}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  {t('form.basicInfo')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-600 mb-1">{t('table.type')}</p>
                    <p className="font-semibold text-gray-900">{t(`form.courseTypes.${courseToView.courseType}`)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-600 mb-1">{t('table.par')}</p>
                    <p className="font-semibold text-gray-900">{courseToView.totalPar}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-600 mb-1">{t('table.tees')}</p>
                    <p className="font-semibold text-gray-900">{courseToView?.tees?.length ?? 0}</p>
                  </div>
                </div>
              </div>

              {/* Tees */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Flag className="w-5 h-5 text-primary" />
                  {t('form.tees')} ({courseToView?.tees?.length ?? 0})
                </h3>
                <div className="space-y-3">
                  {(courseToView?.tees || []).map((tee, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <TeeCategoryBadge category={tee.teeCategory} identifier={tee.identifier} gender={tee.teeGender || tee.tee_gender || tee.gender} />
                        <span className="text-sm text-gray-600">{t('form.tee')} {index + 1}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div>
                          <p className="text-xs text-gray-600">{t('form.courseRating')}</p>
                          <p className="font-medium text-gray-900">{tee.courseRating}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">{t('form.slopeRating')}</p>
                          <p className="font-medium text-gray-900">{tee.slopeRating}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Holes */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">{t('form.holes')}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 border-b border-gray-200">
                      <tr>
                        <th className="text-center py-2 px-3 font-semibold text-gray-700">{t('form.hole')}</th>
                        <th className="text-center py-2 px-3 font-semibold text-gray-700">{t('form.par')}</th>
                        <th className="text-center py-2 px-3 font-semibold text-gray-700">{t('form.strokeIndex')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(courseToView?.holes || []).map((hole, index) => (
                        <tr key={index} className="border-b border-gray-100">
                          <td className="text-center py-2 px-3 font-medium text-gray-900">{hole.holeNumber}</td>
                          <td className="text-center py-2 px-3 text-gray-700">{hole.par}</td>
                          <td className="text-center py-2 px-3 text-gray-700">{hole.strokeIndex}</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50 font-bold">
                        <td className="text-center py-2 px-3 text-gray-900">{t('form.totalPar')}</td>
                        <td className="text-center py-2 px-3 text-gray-900">{courseToView.totalPar}</td>
                        <td className="text-center py-2 px-3"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                {t('pages.pending.close', 'Close')}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && courseToReject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl max-w-lg w-full"
          >
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{t('pages.pending.rejectModalTitle')}</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                {t('pages.pending.rejectModalMessage', { name: courseToReject.name })}
              </p>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('pages.pending.rejectReason')} *
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={t('pages.pending.rejectReasonPlaceholder')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                rows={4}
                minLength={10}
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">
                {rejectReason.length}/500 {t('pages.pending.characters')}
              </p>
            </div>
            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setCourseToReject(null);
                  setRejectReason('');
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                {t('pages.pending.cancel')}
              </button>
              <button
                onClick={confirmReject}
                disabled={rejectReason.trim().length < 10}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('pages.pending.confirmReject')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default PendingGolfCourses;
