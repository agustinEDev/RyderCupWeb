import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Trophy, Users, Calendar, MapPin, Settings, ArrowLeft,
  Edit, Trash2, Play, CheckCircle, XCircle, Pause,
  AlertCircle, Loader, UserPlus, Shield
} from 'lucide-react';
import toast from 'react-hot-toast';
import HeaderAuth from '../components/layout/HeaderAuth';
import { getUserData } from '../utils/secureAuth';
import {
  getCompetitionById,
  updateCompetition,
  deleteCompetition,
  activateCompetition,
  closeEnrollments,
  startCompetition,
  completeCompetition,
  cancelCompetition,
  getEnrollments,
  requestEnrollment,
  getStatusColor,
  getEnrollmentStatusColor,
  formatDateRange,
} from '../services/competitions';

const CompetitionDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [competition, setCompetition] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const userData = getUserData();
    setUser(userData);
    loadCompetition();
  }, [id]);

  const loadCompetition = async () => {
    setIsLoading(true);
    try {
      const data = await getCompetitionById(id);
      setCompetition(data);

      // Load enrollments
      const enrollmentsData = await getEnrollments(id);
      setEnrollments(enrollmentsData);
    } catch (error) {
      console.error('Error loading competition:', error);
      toast.error(error.message || 'Failed to load competition');
      navigate('/competitions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (action) => {
    if (!window.confirm(`Are you sure you want to ${action} this competition?`)) {
      return;
    }

    setIsProcessing(true);
    try {
      let response;
      switch (action) {
        case 'activate':
          response = await activateCompetition(id);
          toast.success('Competition activated!');
          break;
        case 'close-enrollments':
          response = await closeEnrollments(id);
          toast.success('Enrollments closed!');
          break;
        case 'start':
          response = await startCompetition(id);
          toast.success('Competition started!');
          break;
        case 'complete':
          response = await completeCompetition(id);
          toast.success('Competition completed!');
          break;
        case 'cancel':
          response = await cancelCompetition(id);
          toast.success('Competition cancelled!');
          break;
        default:
          throw new Error('Invalid action');
      }
      setCompetition(response);
    } catch (error) {
      console.error(`Error ${action}:`, error);
      toast.error(error.message || `Failed to ${action} competition`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this competition? This action cannot be undone.')) {
      return;
    }

    setIsProcessing(true);
    try {
      await deleteCompetition(id);
      toast.success('Competition deleted successfully');
      navigate('/competitions');
    } catch (error) {
      console.error('Error deleting competition:', error);
      toast.error(error.message || 'Failed to delete competition');
      setIsProcessing(false);
    }
  };

  const handleEnroll = async () => {
    setIsProcessing(true);
    try {
      await requestEnrollment(id);
      toast.success('Enrollment request sent!');
      await loadCompetition();
    } catch (error) {
      console.error('Error enrolling:', error);
      toast.error(error.message || 'Failed to enroll');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading competition...</p>
        </div>
      </div>
    );
  }

  if (!user || !competition) {
    return null;
  }

  const isCreator = competition.creator_id === user.id;
  const canEdit = isCreator && competition.status === 'DRAFT';
  const canDelete = isCreator && competition.status === 'DRAFT';
  const userEnrollment = enrollments.find((e) => e.user_id === user.id);

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
                onClick={() => navigate('/competitions')}
                className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors mb-4"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Back to Competitions</span>
              </button>

              <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-xl border border-primary-200 p-6 shadow-md">
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
                        {competition.status}
                      </span>
                      {isCreator && (
                        <div className="flex items-center gap-1.5 text-accent text-sm font-medium">
                          <Shield className="w-4 h-4" />
                          <span>Creator</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Calendar className="w-5 h-5" />
                    <div>
                      <p className="text-xs text-gray-500">Dates</p>
                      <p className="text-sm font-medium">
                        {formatDateRange(competition.start_date, competition.end_date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <MapPin className="w-5 h-5" />
                    <div>
                      <p className="text-xs text-gray-500">Location</p>
                      <p className="text-sm font-medium">{competition.location || 'TBD'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Users className="w-5 h-5" />
                    <div>
                      <p className="text-xs text-gray-500">Players</p>
                      <p className="text-sm font-medium">
                        {enrollments.filter((e) => e.status === 'APPROVED').length} /{' '}
                        {competition.max_players || '∞'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Action Buttons */}
            {isCreator && (
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
                      <span>Edit</span>
                    </button>
                  )}

                  {competition.status === 'DRAFT' && (
                    <button
                      onClick={() => handleStatusChange('activate')}
                      disabled={isProcessing}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors shadow-md disabled:opacity-50"
                    >
                      <Play className="w-4 h-4" />
                      <span>Activate</span>
                    </button>
                  )}

                  {competition.status === 'ACTIVE' && (
                    <button
                      onClick={() => handleStatusChange('close-enrollments')}
                      disabled={isProcessing}
                      className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 transition-colors shadow-md disabled:opacity-50"
                    >
                      <Pause className="w-4 h-4" />
                      <span>Close Enrollments</span>
                    </button>
                  )}

                  {competition.status === 'CLOSED' && (
                    <button
                      onClick={() => handleStatusChange('start')}
                      disabled={isProcessing}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50"
                    >
                      <Play className="w-4 h-4" />
                      <span>Start Competition</span>
                    </button>
                  )}

                  {competition.status === 'IN_PROGRESS' && (
                    <button
                      onClick={() => handleStatusChange('complete')}
                      disabled={isProcessing}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors shadow-md disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Complete</span>
                    </button>
                  )}

                  {competition.status !== 'CANCELLED' && competition.status !== 'COMPLETED' && (
                    <button
                      onClick={() => handleStatusChange('cancel')}
                      disabled={isProcessing}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors shadow-md disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Cancel</span>
                    </button>
                  )}

                  {canDelete && (
                    <button
                      onClick={handleDelete}
                      disabled={isProcessing}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors shadow-md disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* Enrollment Button for Non-Creators */}
            {!isCreator && competition.status === 'ACTIVE' && !userEnrollment && (
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
                  <span>Request to Join</span>
                </button>
              </motion.div>
            )}

            {/* User Enrollment Status */}
            {userEnrollment && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="p-4"
              >
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-600" />
                    <span className="text-blue-900 font-medium">Your enrollment status:</span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${getEnrollmentStatusColor(
                        userEnrollment.status
                      )}`}
                    >
                      {userEnrollment.status}
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
                  Competition Settings
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-500 text-sm">Handicap Type:</span>
                    <p className="text-gray-900 font-medium">{competition.handicap_type}</p>
                  </div>
                  {competition.handicap_percentage && (
                    <div>
                      <span className="text-gray-500 text-sm">Handicap Percentage:</span>
                      <p className="text-gray-900 font-medium">{competition.handicap_percentage}%</p>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500 text-sm">Team Assignment:</span>
                    <p className="text-gray-900 font-medium">{competition.team_assignment}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 text-sm">Created:</span>
                    <p className="text-gray-900 font-medium">
                      {new Date(competition.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Enrollments List */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="p-4"
            >
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-gray-900 font-bold text-lg mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Enrollments ({enrollments.length})
                </h3>

                {enrollments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No enrollments yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {enrollments.map((enrollment) => (
                      <div
                        key={enrollment.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1">
                          <p className="text-gray-900 font-medium">{enrollment.user_name}</p>
                          <p className="text-gray-500 text-sm">{enrollment.user_email}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          {enrollment.team && (
                            <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold">
                              Team {enrollment.team}
                            </span>
                          )}
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${getEnrollmentStatusColor(
                              enrollment.status
                            )}`}
                          >
                            {enrollment.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>

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

export default CompetitionDetail;
