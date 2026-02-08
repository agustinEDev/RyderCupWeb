// src/pages/BrowseCompetitions.jsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import customToast from '../utils/toast';
import { useTranslation } from 'react-i18next';
import { Search, Calendar, Users, Target, TrendingUp } from 'lucide-react';
import HeaderAuth from '../components/layout/HeaderAuth';
import {
  browseJoinableCompetitionsUseCase,
  browseExploreCompetitionsUseCase,
  requestEnrollmentUseCase,
} from '../composition';
import { CountryFlag } from '../utils/countryUtils';
import { useAuth } from '../hooks/useAuth';
import EnrollmentRequestModal from '../components/enrollment/EnrollmentRequestModal';

const BrowseCompetitions = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('competitions');

  // User state
  const { user, loading: isLoading } = useAuth();

  // Joinable competitions state
  const [joinableCompetitions, setJoinableCompetitions] = useState([]);
  const [joinableSearch, setJoinableSearch] = useState('');
  const [joinableSearchType, setJoinableSearchType] = useState('name'); // 'name' or 'creator'
  const [isLoadingJoinable, setIsLoadingJoinable] = useState(true);

  // Explore competitions state
  const [exploreCompetitions, setExploreCompetitions] = useState([]);
  const [exploreSearch, setExploreSearch] = useState('');
  const [exploreSearchType, setExploreSearchType] = useState('name'); // 'name' or 'creator'
  const [isLoadingExplore, setIsLoadingExplore] = useState(true);

  // Request enrollment state
  const [requestingEnrollment, setRequestingEnrollment] = useState({});
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [enrollTargetId, setEnrollTargetId] = useState(null);

  // Load joinable competitions
  useEffect(() => {
    if (!user) return;

    const loadJoinableCompetitions = async () => {
      try {
        setIsLoadingJoinable(true);
        const competitions = await browseJoinableCompetitionsUseCase.execute();

        // SAFETY FILTER: Filter out competitions where user already has enrollment
        // This compensates for backend bug where my_competitions=false still returns
        // competitions with existing enrollments
        const safeCompetitions = competitions.filter(comp => {
          // Exclude if user has any enrollment status
          return !comp.enrollment_status;
        });

        setJoinableCompetitions(safeCompetitions);
      } catch (error) {
        console.error('Error loading joinable competitions:', error);
        customToast.error(t('browse.errors.failedToLoadJoinable'));
      } finally {
        setIsLoadingJoinable(false);
      }
    };

    loadJoinableCompetitions();
  }, [user, t]);

  // Load explore competitions
  useEffect(() => {
    if (!user) return;

    const loadExploreCompetitions = async () => {
      try {
        setIsLoadingExplore(true);
        const competitions = await browseExploreCompetitionsUseCase.execute();
        setExploreCompetitions(competitions);
      } catch (error) {
        console.error('Error loading explore competitions:', error);
        customToast.error(t('browse.errors.failedToLoadExplore'));
      } finally {
        setIsLoadingExplore(false);
      }
    };

    loadExploreCompetitions();
  }, [user, t]);

  // Filter joinable competitions by search AND exclude user's own competitions
  const filteredJoinableCompetitions = joinableCompetitions.filter((comp) => {
    // CRITICAL: Exclude competitions where current user is the creator (client-side safety filter)
    // Backend should already exclude these via my_competitions=false, but this is a safety net
    if (comp.creatorId === user?.id) {
      return false;
    }

    // Apply search filter
    if (!joinableSearch) return true;

    const searchLower = joinableSearch.toLowerCase();

    if (joinableSearchType === 'name') {
      return comp.name.toLowerCase().includes(searchLower);
    } else if (joinableSearchType === 'creator') {
      const creatorName = `${comp.creator?.firstName || ''} ${comp.creator?.lastName || ''}`.trim().toLowerCase();
      return creatorName.includes(searchLower);
    }

    return true;
  });

  // Filter explore competitions by search
  const filteredExploreCompetitions = exploreCompetitions.filter((comp) => {
    if (!exploreSearch) return true;

    const searchLower = exploreSearch.toLowerCase();

    if (exploreSearchType === 'name') {
      return comp.name.toLowerCase().includes(searchLower);
    } else if (exploreSearchType === 'creator') {
      const creatorName = `${comp.creator?.firstName || ''} ${comp.creator?.lastName || ''}`.trim().toLowerCase();
      return creatorName.includes(searchLower);
    }

    return true;
  });

  // Open modal to request enrollment
  const openEnrollModal = (competitionId) => {
    setEnrollTargetId(competitionId);
    setEnrollModalOpen(true);
  };

  // Handle request enrollment
  const handleRequestEnrollment = async (competitionId, teeCategory = null) => {
    setEnrollModalOpen(false);
    try {
      setRequestingEnrollment((prev) => ({ ...prev, [competitionId]: true }));

      // Call RequestEnrollmentUseCase
      await requestEnrollmentUseCase.execute(competitionId, null, { teeCategory });

      customToast.success(t('browse.success.enrollmentRequested'));

      // Remove competition from UI immediately (optimistic update)
      setJoinableCompetitions((prev) => prev.filter((comp) => comp.id !== competitionId));

      // Reload in background to sync with backend
      setTimeout(async () => {
        try {
          const updatedJoinableCompetitions = await browseJoinableCompetitionsUseCase.execute();

          // Apply same safety filter as initial load
          const safeCompetitions = updatedJoinableCompetitions.filter(comp => {
            if (comp.enrollment_status) {
              console.warn(`⚠️ [Reload] Filtering out competition ${comp.id} - enrollment status: ${comp.enrollment_status}`);
              return false;
            }
            return true;
          });

          setJoinableCompetitions(safeCompetitions);
        } catch (err) {
          console.error('Error reloading competitions:', err);
        }
      }, 1000);
    } catch (error) {
      console.error('❌ Error requesting enrollment:', error);

      // Check if it's a duplicate enrollment error (409 Conflict)
      if (error.message?.includes('409')) {
        customToast.error(t('browse.errors.alreadyEnrolled'));
        // Remove from list since user already has enrollment
        setJoinableCompetitions((prev) => prev.filter((comp) => comp.id !== competitionId));
      } else {
        customToast.error(error.message || t('browse.errors.failedToEnroll'));
      }
    } finally {
      setRequestingEnrollment((prev) => ({ ...prev, [competitionId]: false }));
    }
  };

  // Handle view competition details
  const handleViewDetails = (competitionId) => {
    navigate(`/competitions/${competitionId}`, { state: { from: 'browse' } });
  };

  // Early returns
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('common:loading')}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Prepare content for joinable competitions
  let joinableContent;
  if (isLoadingJoinable) {
    joinableContent = (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-gray-600">{t('common:loading')}</p>
      </div>
    );
  } else if (filteredJoinableCompetitions.length === 0) {
    joinableContent = (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {joinableSearch ? t('browse.joinCompetition.noCompetitionsFound') : t('browse.joinCompetition.noCompetitionsAvailable')}
        </h3>
        <p className="text-gray-600">
          {joinableSearch
            ? t('browse.joinCompetition.tryAdjustingSearch')
            : t('browse.joinCompetition.noActiveCompetitions')}
        </p>
      </div>
    );
  } else {
    joinableContent = (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredJoinableCompetitions.map((competition) => (
          <CompetitionCard
            key={competition.id}
            competition={competition}
            mode="joinable"
            onRequestEnrollment={openEnrollModal}
            onViewDetails={handleViewDetails}
            isRequesting={requestingEnrollment[competition.id]}
          />
        ))}
      </div>
    );
  }

  // Prepare content for explore competitions
  let exploreContent;
  if (isLoadingExplore) {
    exploreContent = (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-gray-600">{t('common:loading')}</p>
      </div>
    );
  } else if (filteredExploreCompetitions.length === 0) {
    exploreContent = (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {exploreSearch ? t('browse.joinCompetition.noCompetitionsFound') : t('browse.exploreCompetitions.noCompetitionsToExplore')}
        </h3>
        <p className="text-gray-600">
          {exploreSearch
            ? t('browse.joinCompetition.tryAdjustingSearch')
            : t('browse.exploreCompetitions.noOngoingCompetitions')}
        </p>
      </div>
    );
  } else {
    exploreContent = (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredExploreCompetitions.map((competition) => (
          <CompetitionCard
            key={competition.id}
            competition={competition}
            mode="explore"
            onViewDetails={handleViewDetails}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderAuth user={user} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('browse.title')}</h1>
          <p className="text-gray-600">
            {t('browse.subtitle')}
          </p>
        </div>

        {/* Section 1: Join a Competition */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Target className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-gray-900">{t('browse.joinCompetition.title')}</h2>
          </div>

          <p className="text-gray-600 mb-4">
            {t('browse.joinCompetition.description')}
          </p>

          {/* Search Bar - Joinable */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder={t('browse.joinCompetition.searchPlaceholder', {
                    type: joinableSearchType === 'name' ? t('browse.joinCompetition.searchByName') : t('browse.joinCompetition.searchByCreator')
                  })}
                  value={joinableSearch}
                  onChange={(e) => setJoinableSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setJoinableSearchType('name')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    joinableSearchType === 'name'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t('browse.joinCompetition.byName')}
                </button>
                <button
                  onClick={() => setJoinableSearchType('creator')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    joinableSearchType === 'creator'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t('browse.joinCompetition.byCreator')}
                </button>
              </div>
            </div>
          </div>

          {/* Competitions Grid - Joinable */}
          {joinableContent}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 my-12"></div>

        {/* Section 2: Explore Competitions */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-gray-900">{t('browse.exploreCompetitions.title')}</h2>
          </div>

          <p className="text-gray-600 mb-4">
            {t('browse.exploreCompetitions.description')}
          </p>

          {/* Search Bar - Explore */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder={t('browse.joinCompetition.searchPlaceholder', {
                    type: exploreSearchType === 'name' ? t('browse.joinCompetition.searchByName') : t('browse.joinCompetition.searchByCreator')
                  })}
                  value={exploreSearch}
                  onChange={(e) => setExploreSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setExploreSearchType('name')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    exploreSearchType === 'name'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t('browse.joinCompetition.byName')}
                </button>
                <button
                  onClick={() => setExploreSearchType('creator')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    exploreSearchType === 'creator'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t('browse.joinCompetition.byCreator')}
                </button>
              </div>
            </div>
          </div>

          {/* Competitions Grid - Explore */}
          {exploreContent}
        </div>
      </div>

      <EnrollmentRequestModal
        isOpen={enrollModalOpen}
        onClose={() => setEnrollModalOpen(false)}
        onConfirm={(tee) => handleRequestEnrollment(enrollTargetId, tee)}
        isProcessing={!!requestingEnrollment[enrollTargetId]}
      />
    </div>
  );
};

// Competition Card Component
const CompetitionCard = ({ competition, mode, onRequestEnrollment, onViewDetails, isRequesting }) => {
  const { t } = useTranslation('competitions');
  const { id, name, startDate, endDate, status, creator, enrolledCount, maxPlayers, countries } = competition;

  // Format dates
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Get status badge
  const getStatusBadge = () => {
    const badges = {
      ACTIVE: 'bg-green-100 text-green-800',
      CLOSED: 'bg-yellow-100 text-yellow-800',
      IN_PROGRESS: 'bg-blue-100 text-blue-800',
      COMPLETED: 'bg-gray-100 text-gray-800',
      DRAFT: 'bg-gray-100 text-gray-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${badges[status] || 'bg-gray-100 text-gray-800'}`}>
        {status && t(`status.${status}`)}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition">
      {/* Card Header - Clickable */}
      <button
        className="w-full p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition text-left"
        onClick={() => onViewDetails(id)}
      >
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-bold text-gray-900 flex-1">{name}</h3>
          {getStatusBadge()}
        </div>

        {/* Countries */}
        {countries && countries.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {countries.map((country) => (
              <span key={country.code} className="inline-flex">
                <CountryFlag countryCode={country.code} className="w-5 h-5" />
              </span>
            ))}
          </div>
        )}
      </button>

      {/* Card Body - Clickable */}
      <button
        className="w-full p-4 space-y-3 cursor-pointer hover:bg-gray-50 transition text-left"
        onClick={() => onViewDetails(id)}
      >
        {/* Dates */}
        <div className="flex items-center text-sm text-gray-600">
          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
          <span>
            {formatDate(startDate)} - {formatDate(endDate)}
          </span>
        </div>

        {/* Creator */}
        <div className="flex items-center text-sm text-gray-600">
          <Users className="w-4 h-4 mr-2 text-gray-400" />
          <span>
            {t('browse.card.created-by')} <span className="font-medium text-gray-900">{creator?.firstName} {creator?.lastName}</span>
          </span>
        </div>

        {/* Players Count */}
        <div className="flex items-center text-sm text-gray-600">
          <Users className="w-4 h-4 mr-2 text-gray-400" />
          <span>
            {t('browse.card.players')} <span className="font-medium text-gray-900">{enrolledCount} / {maxPlayers}</span>
            {enrolledCount >= maxPlayers && <span className="ml-2 text-red-600 font-semibold">{t('browse.card.full')}</span>}
          </span>
        </div>
      </button>

      {/* Card Footer */}
      <div className="p-4 bg-gray-50 border-t border-gray-100">
        {mode === 'joinable' ? (
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevent card click when clicking button
              onRequestEnrollment(id);
            }}
            disabled={isRequesting || enrolledCount >= maxPlayers}
            className={`w-full py-2 px-4 rounded-lg font-medium transition ${
              isRequesting || enrolledCount >= maxPlayers
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-primary text-white hover:bg-primary/90'
            }`}
          >
        {/* Get button text */}
        {(() => {
          if (isRequesting) return t('browse.card.requesting');
          if (enrolledCount >= maxPlayers) return t('browse.card.full');
          return t('browse.card.request-to-join');
        })()}
      </button>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevent card click when clicking button
              onViewDetails(id);
            }}
            className="w-full py-2 px-4 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
          >
            {t('browse.card.view-details')}
          </button>
        )}
      </div>
    </div>
  );
};

export default BrowseCompetitions;
