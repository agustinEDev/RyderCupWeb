import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Loader, Users as UsersIcon, BarChart3, Flag, Clock, Search, Trophy, AlertTriangle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import customToast from '../../utils/toast';
import HeaderAuth from '../../components/layout/HeaderAuth';
import { useAuth } from '../../hooks/useAuth';
import AdminUsersTable from '../../components/admin/AdminUsersTable';
import EditUserModal from '../../components/admin/EditUserModal';
import ManageAccountModal from '../../components/admin/ManageAccountModal';
import AdminCompetitionsTable from '../../components/admin/AdminCompetitionsTable';
import AdminEditCompetitionModal from '../../components/admin/AdminEditCompetitionModal';
import GolfCourses from './GolfCourses';
import PendingGolfCourses from './PendingGolfCourses';
import {
  getAdminStatsUseCase,
  listAdminUsersUseCase,
  updateAdminUserUseCase,
  setAdminUserActiveUseCase,
  deleteAdminUserUseCase,
  adminListCompetitionsUseCase,
  adminUpdateCompetitionUseCase,
  activateCompetitionUseCase,
  closeEnrollmentsUseCase,
  startCompetitionUseCase,
  completeCompetitionUseCase,
  cancelCompetitionUseCase,
  reopenEnrollmentsUseCase,
  revertCompetitionStatusUseCase,
  revertCompetitionToInProgressUseCase,
} from '../../composition';
import FullScreenLoader from '../../components/ui/FullScreenLoader';
import BlockLoader from '../../components/ui/BlockLoader';

const TRANSITION_USE_CASES = {
  activate: activateCompetitionUseCase,
  closeEnrollments: closeEnrollmentsUseCase,
  start: startCompetitionUseCase,
  complete: completeCompetitionUseCase,
  cancel: cancelCompetitionUseCase,
  reopenEnrollments: reopenEnrollmentsUseCase,
  revertStatus: revertCompetitionStatusUseCase,
  revertToInProgress: revertCompetitionToInProgressUseCase,
};

const PAGE_SIZE = 20;

/**
 * AdminPanel Page
 * Consolidated admin panel: Overview stats, Users (list/edit/deactivate/delete),
 * and Golf Courses (approved + pending) as tabs.
 */
const AdminPanel = () => {
  const { t } = useTranslation('admin');
  const { user, loading: isLoadingUser } = useAuth();

  const [activeTab, setActiveTab] = useState('overview');

  // Overview
  const [stats, setStats] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Users
  const [users, setUsers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState('');

  const [editingUser, setEditingUser] = useState(null);
  const [managingUser, setManagingUser] = useState(null);

  // Competitions
  const [competitions, setCompetitions] = useState([]);
  const [hasMoreCompetitions, setHasMoreCompetitions] = useState(false);
  const [competitionOffset, setCompetitionOffset] = useState(0);
  const [isLoadingCompetitions, setIsLoadingCompetitions] = useState(true);
  const [competitionSearch, setCompetitionSearch] = useState('');
  const [competitionSearchInput, setCompetitionSearchInput] = useState('');
  const [editingCompetition, setEditingCompetition] = useState(null);
  const [cancelingCompetition, setCancelingCompetition] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const loadStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const data = await getAdminStatsUseCase.execute();
      setStats(data);
    } catch (error) {
      console.error('Error loading admin stats:', error);
      customToast.error(error.message || t('overview.loadError'));
    } finally {
      setIsLoadingStats(false);
    }
  }, [t]);

  const loadUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const data = await listAdminUsersUseCase.execute({
        search: search || undefined,
        isAdmin: roleFilter === '' ? undefined : roleFilter === 'admin',
        isActive: statusFilter === '' ? undefined : statusFilter === 'active',
        emailVerified: verifiedFilter === '' ? undefined : verifiedFilter === 'verified',
        limit: PAGE_SIZE,
        offset,
      });
      setUsers(data.users);
      setTotalCount(data.totalCount);
    } catch (error) {
      console.error('Error loading users:', error);
      customToast.error(error.message || t('users.loadError'));
    } finally {
      setIsLoadingUsers(false);
    }
  }, [search, roleFilter, statusFilter, verifiedFilter, offset, t]);

  const loadCompetitions = useCallback(async () => {
    setIsLoadingCompetitions(true);
    try {
      // Fetch one extra to know if there's a next page — the backend list
      // endpoint returns a plain array with no total count to paginate against.
      const data = await adminListCompetitionsUseCase.execute({
        searchName: competitionSearch || undefined,
        limit: PAGE_SIZE + 1,
        offset: competitionOffset,
      });
      setHasMoreCompetitions(data.length > PAGE_SIZE);
      setCompetitions(data.slice(0, PAGE_SIZE));
    } catch (error) {
      console.error('Error loading competitions:', error);
      customToast.error(error.message || t('competitions.loadError'));
    } finally {
      setIsLoadingCompetitions(false);
    }
  }, [competitionSearch, competitionOffset, t]);

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing pattern surfaced by eslint-plugin-react-hooks 7.1.1 bump; needs dedicated review (tracked in follow-up)
      loadStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (user && activeTab === 'users') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing pattern surfaced by eslint-plugin-react-hooks 7.1.1 bump; needs dedicated review (tracked in follow-up)
      loadUsers();
    }
  }, [user, activeTab, loadUsers]);

  useEffect(() => {
    if (user && activeTab === 'competitions') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing pattern surfaced by eslint-plugin-react-hooks 7.1.1 bump; needs dedicated review (tracked in follow-up)
      loadCompetitions();
    }
  }, [user, activeTab, loadCompetitions]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setOffset(0);
    setSearch(searchInput.trim());
  };

  const handleUpdateUser = async (formData) => {
    const updated = await updateAdminUserUseCase.execute(editingUser.id, formData);
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    customToast.success(t('editModal.success'));
    setEditingUser(null);
  };

  const handleToggleActive = async (targetUser) => {
    await setAdminUserActiveUseCase.execute(targetUser.id, !targetUser.isActive);
    setUsers((prev) =>
      prev.map((u) => (u.id === targetUser.id ? { ...u, isActive: !targetUser.isActive } : u))
    );
    customToast.success(targetUser.isActive ? t('manageModal.deactivateSuccess') : t('manageModal.reactivateSuccess'));
    setManagingUser(null);
  };

  const handleDeleteUser = async () => {
    await deleteAdminUserUseCase.execute(managingUser.id);
    setUsers((prev) => prev.filter((u) => u.id !== managingUser.id));
    setTotalCount((prev) => Math.max(0, prev - 1));
    customToast.success(t('manageModal.deleteSuccess'));
    setManagingUser(null);
    loadStats();
  };

  const handleCompetitionSearchSubmit = (e) => {
    e.preventDefault();
    setCompetitionOffset(0);
    setCompetitionSearch(competitionSearchInput.trim());
  };

  const handleUpdateCompetition = async (fields) => {
    await adminUpdateCompetitionUseCase.execute(editingCompetition.id, fields);
    customToast.success(t('competitions.editModal.success'));
    setEditingCompetition(null);
    loadCompetitions();
  };

  const runTransition = async (competition, action) => {
    setIsTransitioning(true);
    try {
      await TRANSITION_USE_CASES[action].execute(competition.id);
      customToast.success(t('competitions.transitionSuccess'));
      loadCompetitions();
    } catch (error) {
      console.error(`Error running competition transition "${action}":`, error);
      customToast.error(error.message || t('competitions.transitionError'));
    } finally {
      setIsTransitioning(false);
      setCancelingCompetition(null);
    }
  };

  const handleTransition = (competition, action) => {
    if (action === 'cancel') {
      setCancelingCompetition(competition);
      return;
    }
    runTransition(competition, action);
  };

  if (isLoadingUser) {
    return (
      <FullScreenLoader texto={t('common:loading')} />
    );
  }

  if (!user) {
    return null;
  }

  const tabs = [
    { id: 'overview', label: t('tabs.overview'), icon: BarChart3 },
    { id: 'users', label: t('tabs.users'), icon: UsersIcon },
    { id: 'competitions', label: t('tabs.competitions'), icon: Trophy },
    { id: 'golfCourses', label: t('tabs.golfCourses'), icon: Flag },
    { id: 'pending', label: t('tabs.pending'), icon: Clock },
  ];

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-white">
      <div className="layout-container flex h-full grow flex-col">
        <HeaderAuth user={user} />
        <div className="px-4 md:px-40 flex flex-1 justify-center py-5">
          <div className="layout-content-container flex flex-col max-w-[1200px] flex-1 min-w-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="p-4"
            >
              <h1 className="hidden md:block text-gray-900 tracking-tight text-3xl md:text-[32px] font-bold leading-tight">
                {t('title')}
              </h1>
              <p className="text-gray-500 text-sm mt-1">{t('subtitle')}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="px-4"
            >
              <div role="tablist" className="flex gap-2 border-b border-gray-200 overflow-x-auto">
                {tabs.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    role="tab"
                    aria-selected={activeTab === id}
                    onClick={() => setActiveTab(id)}
                    className={`flex items-center gap-2 px-4 py-2 font-medium border-b-2 whitespace-nowrap transition-colors ${
                      activeTab === id
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </motion.div>

            <div className="p-4">
              {activeTab === 'overview' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  {isLoadingStats ? (
                    <BlockLoader />
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="bg-primary-50 border border-primary-200 rounded-xl p-5">
                        <p className="text-sm text-gray-600">{t('overview.totalUsers')}</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.totalUsers ?? 0}</p>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                        <p className="text-sm text-gray-600">{t('overview.totalCompetitions')}</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.totalCompetitions ?? 0}</p>
                      </div>
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                        <p className="text-sm text-gray-600">{t('overview.totalQuickMatches')}</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.totalQuickMatches ?? 0}</p>
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                        <p className="text-sm text-gray-600">{t('overview.totalGolfCoursesApproved')}</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.totalGolfCoursesApproved ?? 0}</p>
                      </div>
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                        <p className="text-sm text-gray-600">{t('overview.totalGolfCoursesPending')}</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.totalGolfCoursesPending ?? 0}</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'users' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-4"
                >
                  <form onSubmit={handleSearchSubmit} className="flex flex-wrap gap-3 items-end">
                    <div className="flex-1 min-w-[220px]">
                      <div className="relative">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={searchInput}
                          onChange={(e) => setSearchInput(e.target.value)}
                          placeholder={t('users.searchPlaceholder')}
                          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <select
                        value={roleFilter}
                        onChange={(e) => { setOffset(0); setRoleFilter(e.target.value); }}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none"
                      >
                        <option value="">{t('users.filterRoleAll')}</option>
                        <option value="admin">{t('users.filterRoleAdmin')}</option>
                        <option value="player">{t('users.filterRolePlayer')}</option>
                      </select>
                    </div>

                    <div>
                      <select
                        value={statusFilter}
                        onChange={(e) => { setOffset(0); setStatusFilter(e.target.value); }}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none"
                      >
                        <option value="">{t('users.filterStatusAll')}</option>
                        <option value="active">{t('users.filterStatusActive')}</option>
                        <option value="inactive">{t('users.filterStatusInactive')}</option>
                      </select>
                    </div>

                    <div>
                      <select
                        value={verifiedFilter}
                        onChange={(e) => { setOffset(0); setVerifiedFilter(e.target.value); }}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none"
                      >
                        <option value="">{t('users.filterVerifiedAll')}</option>
                        <option value="verified">{t('users.filterVerifiedYes')}</option>
                        <option value="unverified">{t('users.filterVerifiedNo')}</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      {t('users.searchButton')}
                    </button>
                  </form>

                  <p className="text-sm text-gray-500">
                    {t('users.totalCount', { count: totalCount })}
                  </p>

                  {isLoadingUsers ? (
                    <BlockLoader />
                  ) : (
                    <>
                      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                        <AdminUsersTable
                          users={users}
                          onEdit={setEditingUser}
                          onToggleActive={setManagingUser}
                          onManageDelete={setManagingUser}
                        />
                      </div>

                      {totalCount > PAGE_SIZE && (
                        <div className="flex items-center justify-between pt-2">
                          <button
                            onClick={() => setOffset((prev) => Math.max(0, prev - PAGE_SIZE))}
                            disabled={offset === 0}
                            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {t('users.previous')}
                          </button>
                          <span className="text-sm text-gray-500">
                            {t('users.pageInfo', { current: currentPage, total: totalPages })}
                          </span>
                          <button
                            onClick={() => setOffset((prev) => prev + PAGE_SIZE)}
                            disabled={offset + PAGE_SIZE >= totalCount}
                            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {t('users.next')}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              )}

              {activeTab === 'competitions' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-4"
                >
                  <form onSubmit={handleCompetitionSearchSubmit} className="flex flex-wrap gap-3 items-end">
                    <div className="flex-1 min-w-[220px]">
                      <div className="relative">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={competitionSearchInput}
                          onChange={(e) => setCompetitionSearchInput(e.target.value)}
                          placeholder={t('competitions.searchPlaceholder')}
                          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      {t('competitions.searchButton')}
                    </button>
                  </form>

                  <p className="text-sm text-gray-500">
                    {t('competitions.totalCount', { count: competitions.length })}
                  </p>

                  {isLoadingCompetitions ? (
                    <BlockLoader />
                  ) : (
                    <>
                      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                        <AdminCompetitionsTable
                          competitions={competitions}
                          onEdit={setEditingCompetition}
                          onTransition={handleTransition}
                          disabled={isTransitioning}
                        />
                      </div>

                      {(competitionOffset > 0 || hasMoreCompetitions) && (
                        <div className="flex items-center justify-between pt-2">
                          <button
                            onClick={() => setCompetitionOffset((prev) => Math.max(0, prev - PAGE_SIZE))}
                            disabled={competitionOffset === 0}
                            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {t('competitions.previous')}
                          </button>
                          <button
                            onClick={() => setCompetitionOffset((prev) => prev + PAGE_SIZE)}
                            disabled={!hasMoreCompetitions}
                            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {t('competitions.next')}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              )}

              {activeTab === 'golfCourses' && <GolfCourses embedded />}
              {activeTab === 'pending' && <PendingGolfCourses embedded />}
            </div>
          </div>
        </div>
      </div>

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onSubmit={handleUpdateUser}
          onCancel={() => setEditingUser(null)}
        />
      )}

      {managingUser && (
        <ManageAccountModal
          user={managingUser}
          onToggleActive={() => handleToggleActive(managingUser)}
          onDelete={handleDeleteUser}
          onCancel={() => setManagingUser(null)}
        />
      )}

      {editingCompetition && (
        <AdminEditCompetitionModal
          competition={editingCompetition}
          onSubmit={handleUpdateCompetition}
          onCancel={() => setEditingCompetition(null)}
        />
      )}

      {cancelingCompetition && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl max-w-md w-full"
          >
            <div className="flex items-start justify-between p-6 border-b border-gray-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{t('competitions.confirmCancelTitle')}</h2>
                  <p className="text-sm text-gray-500 mt-1">{t('competitions.confirmCancelBody')}</p>
                </div>
              </div>
              <button
                onClick={() => setCancelingCompetition(null)}
                className="text-gray-400 hover:text-gray-600"
                aria-label={t('competitions.confirmCancelDismiss')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex justify-end gap-3 p-6">
              <button
                type="button"
                onClick={() => setCancelingCompetition(null)}
                disabled={isTransitioning}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {t('competitions.confirmCancelDismiss')}
              </button>
              <button
                type="button"
                onClick={() => runTransition(cancelingCompetition, 'cancel')}
                disabled={isTransitioning}
                className="flex items-center gap-2 px-5 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {isTransitioning && <Loader className="w-4 h-4 animate-spin" />}
                {t('competitions.confirmCancel')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
