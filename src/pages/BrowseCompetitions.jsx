// src/pages/BrowseCompetitions.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Search, Calendar, MapPin, Users, Target, TrendingUp } from 'lucide-react';
import HeaderAuth from '../components/layout/HeaderAuth';
import {
  browseJoinableCompetitionsUseCase,
  browseExploreCompetitionsUseCase,
  requestEnrollmentUseCase,
} from '../composition';
import { CountryFlag } from '../utils/countryUtils';
import { getAuthToken, getUserData } from '../utils/secureAuth';

const BrowseCompetitions = () => {
  const navigate = useNavigate();

  // User state
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

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

  // Check authentication
  useEffect(() => {
    const token = getAuthToken();
    const userData = getUserData();

    if (!token || !userData) {
      navigate('/login');
      return;
    }

    setUser(userData);
    setIsLoading(false);
  }, [navigate]);

  // Load joinable competitions
  useEffect(() => {
    if (!user) return;

    const loadJoinableCompetitions = async () => {
      try {
        setIsLoadingJoinable(true);
        const competitions = await browseJoinableCompetitionsUseCase.execute();

        console.log('🔍 Competitions returned from backend:', competitions.map(c => ({
          id: c.id,
          name: c.name,
          enrollment_status: c.enrollment_status,
          isCreator: c.isCreator,
          creatorId: c.creatorId
        })));

        // SAFETY FILTER: Filter out competitions where user already has enrollment
        // This compensates for backend bug where my_competitions=false still returns
        // competitions with existing enrollments
        const safeCompetitions = competitions.filter(comp => {
          // Exclude if user has any enrollment status
          if (comp.enrollment_status) {
            console.warn(`⚠️ Filtering out competition ${comp.id} (${comp.name}) - already has enrollment status: ${comp.enrollment_status}`);
            return false;
          }
          return true;
        });

        console.log(`📊 Filtered ${competitions.length - safeCompetitions.length} competitions with existing enrollments`);
        setJoinableCompetitions(safeCompetitions);
      } catch (error) {
        console.error('Error loading joinable competitions:', error);
        toast.error('Failed to load available competitions');
      } finally {
        setIsLoadingJoinable(false);
      }
    };

    loadJoinableCompetitions();
  }, [user]);

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
        toast.error('Failed to load competitions');
      } finally {
        setIsLoadingExplore(false);
      }
    };

    loadExploreCompetitions();
  }, [user]);

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

  // Handle request enrollment
  const handleRequestEnrollment = async (competitionId) => {
    try {
      setRequestingEnrollment((prev) => ({ ...prev, [competitionId]: true }));

      // Call RequestEnrollmentUseCase
      await requestEnrollmentUseCase.execute(competitionId);

      toast.success('Enrollment request sent! Check "My Competitions" to track status.');

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
      if (error.message && error.message.includes('409')) {
        toast.error('You already have an enrollment request for this competition');
        // Remove from list since user already has enrollment
        setJoinableCompetitions((prev) => prev.filter((comp) => comp.id !== competitionId));
      } else {
        toast.error(error.message || 'Failed to request enrollment');
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
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderAuth user={user} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Browse Competitions</h1>
          <p className="text-gray-600">
            Discover tournaments to join or explore completed competitions
          </p>
        </div>

        {/* Section 1: Join a Competition */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Target className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-gray-900">Join a Competition</h2>
          </div>

          <p className="text-gray-600 mb-4">
            Find tournaments you can join and request enrollment
          </p>

          {/* Search Bar - Joinable */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder={`Search by ${joinableSearchType === 'name' ? 'competition name' : 'creator name'}...`}
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
                  By Name
                </button>
                <button
                  onClick={() => setJoinableSearchType('creator')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    joinableSearchType === 'creator'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  By Creator
                </button>
              </div>
            </div>
          </div>

          {/* Competitions Grid - Joinable */}
          {isLoadingJoinable ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading available competitions...</p>
            </div>
          ) : filteredJoinableCompetitions.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {joinableSearch ? 'No competitions found' : 'No competitions available'}
              </h3>
              <p className="text-gray-600">
                {joinableSearch
                  ? 'Try adjusting your search criteria'
                  : 'There are no active competitions available to join at the moment'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredJoinableCompetitions.map((competition) => (
                <CompetitionCard
                  key={competition.id}
                  competition={competition}
                  mode="joinable"
                  onRequestEnrollment={handleRequestEnrollment}
                  onViewDetails={handleViewDetails}
                  isRequesting={requestingEnrollment[competition.id]}
                />
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 my-12"></div>

        {/* Section 2: Explore Competitions */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-gray-900">Explore Competitions</h2>
          </div>

          <p className="text-gray-600 mb-4">
            View ongoing tournaments and completed results
          </p>

          {/* Search Bar - Explore */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder={`Search by ${exploreSearchType === 'name' ? 'competition name' : 'creator name'}...`}
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
                  By Name
                </button>
                <button
                  onClick={() => setExploreSearchType('creator')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    exploreSearchType === 'creator'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  By Creator
                </button>
              </div>
            </div>
          </div>

          {/* Competitions Grid - Explore */}
          {isLoadingExplore ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading competitions...</p>
            </div>
          ) : filteredExploreCompetitions.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {exploreSearch ? 'No competitions found' : 'No competitions to explore'}
              </h3>
              <p className="text-gray-600">
                {exploreSearch
                  ? 'Try adjusting your search criteria'
                  : 'There are no closed, ongoing, or completed competitions at the moment'}
              </p>
            </div>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
};

// Competition Card Component
const CompetitionCard = ({ competition, mode, onRequestEnrollment, onViewDetails, isRequesting }) => {
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
    };

    return (
      <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${badges[status] || 'bg-gray-100 text-gray-800'}`}>
        {status?.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition">
      {/* Card Header - Clickable */}
      <div
        className="p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition"
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
      </div>

      {/* Card Body - Clickable */}
      <div
        className="p-4 space-y-3 cursor-pointer hover:bg-gray-50 transition"
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
            Created by: <span className="font-medium text-gray-900">{creator?.firstName} {creator?.lastName}</span>
          </span>
        </div>

        {/* Players Count */}
        <div className="flex items-center text-sm text-gray-600">
          <Users className="w-4 h-4 mr-2 text-gray-400" />
          <span>
            Players: <span className="font-medium text-gray-900">{enrolledCount} / {maxPlayers}</span>
            {enrolledCount >= maxPlayers && <span className="ml-2 text-red-600 font-semibold">FULL</span>}
          </span>
        </div>
      </div>

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
            {isRequesting ? 'Requesting...' : enrolledCount >= maxPlayers ? 'Full' : 'Request to Join'}
          </button>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevent card click when clicking button
              onViewDetails(id);
            }}
            className="w-full py-2 px-4 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
          >
            View Details
          </button>
        )}
      </div>
    </div>
  );
};

export default BrowseCompetitions;
