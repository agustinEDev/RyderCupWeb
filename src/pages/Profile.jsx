import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Mail, Shield, Calendar, TrendingUp, Award,
  CheckCircle, AlertCircle, Edit, LogOut, ArrowLeft, Globe, Clock, Smartphone
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import HeaderAuth from '../components/layout/HeaderAuth';
import { useAuth } from '../hooks/useAuth';
import { CountryFlag } from '../utils/countryUtils';
import { broadcastLogout } from '../utils/broadcastAuth';
import { formatFullDate } from '../utils/dateFormatters';

const API_URL = import.meta.env.VITE_API_BASE_URL || '';

const Profile = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('profile');
  const { user, loading: isLoadingUser } = useAuth();
  const [countryName, setCountryName] = useState(null);
  const [competitionsCount, setCompetitionsCount] = useState(0);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) {
        setIsLoadingData(false);
        return;
      }

      try {
        // Fetch country name if user has country_code
        if (user.country_code) {
          try {
            const countriesResponse = await fetch(`${API_URL}/api/v1/countries?language=en`, {
              credentials: 'include'
            });
            if (countriesResponse.ok) {
              const countries = await countriesResponse.json();
              const country = countries.find(c => c.code === user.country_code);
              if (country) {
                setCountryName(country.name_en || country.name);
              }
            }
          } catch (error) {
            console.error('Error fetching country name:', error);
          }
        }

        // Fetch user's competitions count
        try {
          const competitionsResponse = await fetch(`${API_URL}/api/v1/competitions?my_competitions=true`, {
            credentials: 'include'
          });

          if (!competitionsResponse.ok) {
            console.error('❌ Failed to fetch competitions:', competitionsResponse.status, competitionsResponse.statusText);
            setCompetitionsCount(0);
            return;
          }

          const competitionsData = await competitionsResponse.json();

          // Handle different response formats: array or object with results array
          let list = [];
          if (Array.isArray(competitionsData)) {
            list = competitionsData;
          } else if (competitionsData && Array.isArray(competitionsData.results)) {
            list = competitionsData.results;
          }

          setCompetitionsCount(list.length);
        } catch (error) {
          console.error('❌ Error fetching competitions count:', error);
          setCompetitionsCount(0);
        }
      } catch (error) {
        console.error('❌ Error fetching user data:', error);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchUserData();
  }, [user]);

  const handleEditProfile = () => {
    navigate('/profile/edit');
  };

  const handleLogout = async () => {
    // 📡 Broadcast logout event to all other tabs FIRST
    broadcastLogout();

    try {
      // Call backend logout endpoint
      const response = await fetch(`${API_URL}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        console.error('Logout failed with status:', response.status);
      }
    } catch (error) {
      console.error('Backend logout error:', error);
    }

    // Force full page reload to clear all state
    window.location.href = '/';
  };


  if (isLoadingUser || isLoadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common:loading')}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const fullName = `${user.first_name} ${user.last_name}`;
  const email = user.email || 'No email';
  const handicap = user.handicap !== null && user.handicap !== undefined
    ? user.handicap
    : 'Not set';
  const handicapUpdated = user.handicap_updated_at
    ? formatFullDate(user.handicap_updated_at)
    : 'Never';
  const memberSince = formatFullDate(user.created_at);

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-white">
      <div className="layout-container flex h-full grow flex-col">
        <HeaderAuth user={user} />

        <div className="px-4 md:px-40 flex flex-1 justify-center py-5">
          <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
            {/* Page Title */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-wrap justify-between gap-3 p-4"
            >
              <div>
                <p className="text-gray-900 tracking-tight text-3xl md:text-[32px] font-bold leading-tight">
                  {t('title')}
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  {t('subtitle')}
                </p>
              </div>
            </motion.div>

            {/* Profile Header Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="p-4"
            >
              <div className="relative overflow-hidden bg-gradient-to-br from-primary-50 to-blue-50 rounded-xl border border-primary-200 p-6 shadow-md">
                {/* Background Pattern */}
                <div className="absolute top-0 right-0 opacity-10">
                  <Award className="w-48 h-48 text-primary-700" />
                </div>

                {/* Content */}
                <div className="relative z-10">
                  {/* Name and Badges */}
                  <div className="mb-4">
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">{fullName}</h2>

                    {/* Badges Row */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {user.email_verified ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                          <CheckCircle className="w-3 h-3" />
                          {t('emailVerified')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
                          <AlertCircle className="w-3 h-3" />
                          {t('emailPending')}
                        </span>
                      )}

                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-semibold">
                        <Shield className="w-3 h-3" />
                        {t('activeAccount')}
                      </span>

                      {handicap !== 'Not set' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-accent-100 text-accent-700 rounded-full text-xs font-semibold">
                          <Award className="w-3 h-3" />
                          {t('handicapRegistered')}
                        </span>
                      )}
                    </div>

                    {/* Email */}
                    <div className="flex items-center gap-2 text-gray-600 mb-2">
                      <Mail className="w-4 h-4" />
                      <span className="text-sm">{email}</span>
                    </div>

                    {/* Member Since */}
                    <div className="flex items-center gap-2 text-gray-600 mb-2">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">Member since {memberSince}</span>
                    </div>

                    {/* Last Updated */}
                    <div className="flex items-center gap-2 text-gray-600 mb-2">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">{t('lastUpdated', { date: formatFullDate(user.updated_at) })}</span>
                    </div>

                    {/* Nationality */}
                    <div className="flex items-center gap-2 text-gray-600">
                      <Globe className="w-4 h-4" />
                      {user.country_code ? (
                        <span className="text-sm flex items-center gap-2">
                          <span>{t('nationality')}</span>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold border border-blue-200">
                            <CountryFlag countryCode={user.country_code} className="w-4 h-4" />
                            <span>{countryName || user.country_code}</span>
                          </span>
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">
                          {t('nationalityNotSpecified')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="bg-white/80 backdrop-blur rounded-lg p-4 border border-primary-200">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-5 h-5 text-accent-600" />
                        <span className="text-xs text-gray-500 font-medium">Handicap</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{handicap}</p>
                      {handicap !== 'Not set' && (
                        <p className="text-xs text-gray-500 mt-1">Updated: {handicapUpdated}</p>
                      )}
                    </div>

                    <div className="bg-white/80 backdrop-blur rounded-lg p-4 border border-primary-200">
                      <div className="flex items-center gap-2 mb-1">
                        <Award className="w-5 h-5 text-primary-600" />
                        <span className="text-xs text-gray-500 font-medium">Tournaments</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{competitionsCount}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {competitionsCount === 0 ? t('notEnrolledYet') :
                         competitionsCount === 1 ? t('competition') : t('competitions')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="p-4"
            >
              <div className="flex flex-wrap gap-3 justify-end">
                <motion.button
                  onClick={() => navigate('/dashboard')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{t('actions.backToDashboard')}</span>
                </motion.button>

                <motion.button
                  onClick={handleEditProfile}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors shadow-md"
                >
                  <Edit className="w-4 h-4" />
                  <span>{t('actions.editProfile')}</span>
                </motion.button>

                <motion.button
                  onClick={() => navigate('/profile/devices')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors shadow-md"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>{t('actions.manageDevices')}</span>
                </motion.button>

                <motion.button
                  onClick={handleLogout}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors shadow-md"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t('actions.logOut')}</span>
                </motion.button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
