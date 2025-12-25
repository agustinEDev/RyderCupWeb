import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, Calendar, MapPin, Plus,
  Filter, Search, AlertCircle, Loader, Crown
} from 'lucide-react';
import toast from 'react-hot-toast';
import HeaderAuth from '../components/layout/HeaderAuth';
import { listUserCompetitionsUseCase } from '../composition';
import {
  getStatusColor,
  formatDateRange
} from '../services/competitions';

// Helper function to get enrollment status classes
const getEnrollmentStatusClasses = (status) => {
  switch (status) {
    case 'APPROVED':
      return 'bg-green-100 text-green-800 border border-green-200';
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
    case 'REJECTED':
      return 'bg-red-100 text-red-800 border border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border border-gray-200';
  }
};

const Competitions = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [competitions, setCompetitions] = useState([]);
  const [filteredCompetitions, setFilteredCompetitions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/v1/auth/current-user`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      } catch (error) {
        console.error('Error loading user:', error);
      }
    };
    loadUserData();
  }, []);

  const loadCompetitions = useCallback(async () => {
    if (!user?.id) {
      return;
    }

    setIsLoading(true);

    try {
      // Use the use case instead of direct service call
      const data = await listUserCompetitionsUseCase.execute(user.id);
      setCompetitions(data);
    } catch (error) {
      console.error('Error loading competitions:', error);
      toast.error(error.message || 'Failed to load competitions');
      setCompetitions([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const applyFilters = useCallback(() => {
    let filtered = [...competitions];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (comp) =>
          comp.name?.toLowerCase().includes(query) ||
          comp.location?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((comp) => comp.status === statusFilter);
    }

    setFilteredCompetitions(filtered);
  }, [competitions, searchQuery, statusFilter]);

  useEffect(() => {
    if (user?.id) {
      loadCompetitions();
    }
  }, [user, loadCompetitions]);

  useEffect(() => {
    applyFilters();
  }, [competitions, searchQuery, statusFilter, applyFilters]);

  const handleCreateCompetition = () => {
    navigate('/competitions/create');
  };

  const handleViewCompetition = (competitionId) => {
    navigate(`/competitions/${competitionId}`, { state: { from: 'my-competitions' } });
  };

  // Renderiza el contenido de la lista de competiciones
  const renderCompetitionsList = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader className="w-12 h-12 text-primary animate-spin mb-4" />
          <p className="text-gray-600">Loading competitions...</p>
        </div>
      );
    }
    if (filteredCompetitions.length === 0) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-12 bg-gray-50 border border-gray-200 rounded-xl"
        >
          <AlertCircle className="w-16 h-16 text-gray-400 mb-4" />
          <p className="text-gray-900 font-semibold text-lg mb-2">
            {searchQuery || statusFilter !== 'ALL'
              ? 'No competitions found'
              : 'No competitions yet'}
          </p>
          <p className="text-gray-500 text-sm mb-6 max-w-md text-center">
            {searchQuery || statusFilter !== 'ALL'
              ? 'Try adjusting your filters or search terms'
              : 'Create your first competition to get started'}
          </p>
          {(!searchQuery && statusFilter === 'ALL') && (
            <motion.button
              onClick={handleCreateCompetition}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-md"
            >
              <Plus className="w-5 h-5" />
              <span>Create Your First Competition</span>
            </motion.button>
          )}
        </motion.div>
      );
    }
    // Renderizado normal de la lista de competiciones
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCompetitions.map((competition, index) => (
          <motion.div
            key={competition.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            onClick={() => handleViewCompetition(competition.id)}
            className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer group"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-gray-900 font-bold text-lg mb-1 group-hover:text-primary transition-colors flex items-center gap-2">
                  {competition.name}
                  {competition.creatorId === user?.id && (
                    <Crown className="w-4 h-4 text-accent flex-shrink-0" title="You are the creator" />
                  )}
                </h3>
                {/* Show pending enrollment requests if user is creator */}
                {competition.creatorId === user?.id && competition.pending_enrollments_count > 0 && (
                  <div className="mt-1">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200">
                      <span className="w-2 h-2 bg-orange-500 rounded-full mr-1.5 animate-pulse"></span>
                      {competition.pending_enrollments_count} pending request{competition.pending_enrollments_count === 1 ? '' : 's'}
                    </span>
                  </div>
                )}
                {/* Show enrollment status if user is enrolled (not creator) */}
                {competition.creatorId !== user?.id && competition.enrollment_status && (
                  <div className="mt-1">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${getEnrollmentStatusClasses(competition.enrollment_status)}`}
                    >
                      {competition.enrollment_status === 'APPROVED' && '✓ '}
                      {competition.enrollment_status === 'PENDING' && '⏳ '}
                      {competition.enrollment_status === 'REJECTED' && '✗ '}
                      Enrollment: {competition.enrollment_status}
                    </span>
                  </div>
                )}
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                  competition.status
                )}`}
              >
                {competition.status?.replace('_', ' ')}
              </span>
            </div>

            {/* Details */}
            <div className="space-y-2">
              {/* Dates */}
              <div className="flex items-center gap-2 text-gray-600 text-sm">
                <Calendar className="w-4 h-4" />
                <span>{formatDateRange(competition.startDate, competition.endDate)}</span>
              </div>

              {/* Location */}
              {competition.location && (
                <div className="flex items-center gap-2 text-gray-600 text-sm">
                  <MapPin className="w-4 h-4" />
                  <span>{competition.location}</span>
                </div>
              )}

              {/* Players */}
              <div className="flex items-center gap-2 text-gray-600 text-sm">
                <Users className="w-4 h-4" />
                <span>
                  {competition.enrolledCount || 0} / {competition.maxPlayers} players
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  if (!user) {
    return null;
  }

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
              className="flex flex-wrap justify-between items-center gap-3 p-4"
            >
              <div>
                <p className="text-gray-900 tracking-tight text-3xl md:text-[32px] font-bold leading-tight">
                  My Competitions
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  Manage your tournaments and track progress
                </p>
              </div>
              <motion.button
                onClick={handleCreateCompetition}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Create Competition</span>
              </motion.button>
            </motion.div>
            {/* Filters */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="p-4"
            >
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Search */}
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search by name or location..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      />
                    </div>
                  </div>
                  {/* Status Filter */}
                  <div className="md:w-48">
                    <div className="relative">
                      <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all appearance-none bg-white cursor-pointer"
                      >
                        <option value="ALL">All Statuses</option>
                        <option value="DRAFT">Draft</option>
                        <option value="ACTIVE">Active</option>
                        <option value="CLOSED">Closed</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                    </div>
                  </div>
                </div>
                {/* Results Count */}
                {!isLoading && (
                  <div className="mt-3 text-sm text-gray-500">
                    Showing {filteredCompetitions.length} of {competitions.length} competitions
                  </div>
                )}
              </div>
            </motion.div>
            {/* Competitions List */}
            <div className="p-4">
              {renderCompetitionsList()}
            </div>
            {/* Footer */}
            <footer className="flex flex-col gap-6 px-5 py-10 text-center">
              <p className="text-gray-500 text-base font-normal leading-normal">
                © 2025 RyderCupFriends
              </p>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Competitions;
