import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, Users, User, TrendingUp, Calendar, Award, Search } from 'lucide-react';
import HeaderAuth from '../components/layout/HeaderAuth';
import ProfileCard from '../components/profile/ProfileCard';
import EmailVerificationBanner from '../components/EmailVerificationBanner';
import { getUserData } from '../utils/secureAuth';
import { getCompetitions } from '../services/competitions'; // Import the service

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [competitions, setCompetitions] = useState([]); // State for competitions
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      try {
        // Fetch user data from secure storage
        const userData = getUserData();
        if (!userData) {
          navigate('/login');
          return;
        }
        setUser(userData);

        // Fetch competitions
        const competitionsData = await getCompetitions();
        setCompetitions(Array.isArray(competitionsData) ? competitionsData : []);

      } catch (error) {
        console.error("Failed to load dashboard data:", error);
        // Silently fail for now, or show a toast
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const firstName = user.first_name || 'User';

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-white">
      <div className="layout-container flex h-full grow flex-col">
        <HeaderAuth user={user} />

        <div className="px-4 md:px-40 flex flex-1 justify-center py-5">
          <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
            {/* Welcome Message */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-wrap justify-between gap-3 p-4"
            >
              <div>
                <p className="text-gray-900 tracking-tight text-3xl md:text-[32px] font-bold leading-tight">
                  Welcome, {firstName}
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  Here's your activity summary
                </p>
              </div>
            </motion.div>

            {/* Email Verification Banner */}
            {user && !user.email_verified && (
              <div className="px-4">
                <EmailVerificationBanner userEmail={user.email} />
              </div>
            )}

            {/* Statistics Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="p-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Stat Card 1 - Tournaments */}
                <div className="relative overflow-hidden bg-gradient-to-br from-primary-50 to-primary-100 p-6 rounded-xl border border-primary-200 hover:shadow-lg transition-all duration-300 group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-primary-500 rounded-lg shadow-md">
                      <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-primary-600 font-medium">Tournaments</p>
                      <p className="text-3xl font-bold text-primary-700">{Array.isArray(competitions) ? competitions.length : 0}</p>
                    </div>
                  </div>
                  <p className="text-xs text-primary-600">View your active and past tournaments</p>
                  <div className="absolute -bottom-6 -right-6 opacity-10">
                    <Trophy className="w-32 h-32 text-primary-700" />
                  </div>
                </div>

                {/* Stat Card 2 - Handicap */}
                <div className="relative overflow-hidden bg-gradient-to-br from-accent-50 via-amber-50 to-accent-100 p-6 rounded-xl border border-accent-200 hover:shadow-lg transition-all duration-300 group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-accent-500 rounded-lg shadow-md">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-amber-700 font-medium">Handicap</p>
                      <p className="text-3xl font-bold text-amber-800">
                        {user.handicap != null ? user.handicap.toFixed(1) : '--'}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-amber-700">
                    {user.handicap_updated_at
                      ? `Updated ${new Date(user.handicap_updated_at).toLocaleDateString()}`
                      : 'Not updated'}
                  </p>
                  <div className="absolute -bottom-6 -right-6 opacity-10">
                    <TrendingUp className="w-32 h-32 text-amber-700" />
                  </div>
                </div>

                {/* Stat Card 3 - Profile */}
                <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-navy-100 p-6 rounded-xl border border-blue-200 hover:shadow-lg transition-all duration-300 group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-navy-800 rounded-lg shadow-md">
                      <Award className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-navy-800 font-medium">Status</p>
                      <p className="text-lg font-bold text-navy-900">
                        {user.email_verified ? '✓ Verified' : '⚠ Pending'}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-navy-700">
                    Member since {new Date(user.created_at).toLocaleDateString()}
                  </p>
                  <div className="absolute -bottom-6 -right-6 opacity-10">
                    <Award className="w-32 h-32 text-navy-700" />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Profile Card */}
            <ProfileCard user={user} />

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="p-4 mt-4"
            >
              <h2 className="text-gray-900 text-xl font-bold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Create Competition Card */}
                <motion.button
                  onClick={() => navigate('/competitions/create')}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-4 p-6 bg-white border-2 border-gray-200 rounded-xl hover:border-primary-500 hover:shadow-lg transition-all text-left group"
                >
                  <div className="p-3 bg-primary-100 rounded-lg group-hover:bg-primary-500 transition-colors">
                    <Trophy className="w-7 h-7 text-primary-600 group-hover:text-white transition-colors" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-gray-900 font-bold text-lg group-hover:text-primary-600 transition-colors">
                      Create Tournament
                    </h3>
                    <p className="text-gray-500 text-sm">Start a new Ryder Cup tournament</p>
                  </div>
                </motion.button>

                {/* My Competitions Card */}
                <motion.button
                  onClick={() => navigate('/competitions')}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-4 p-6 bg-white border-2 border-gray-200 rounded-xl hover:border-accent-500 hover:shadow-lg transition-all text-left group"
                >
                  <div className="p-3 bg-accent-100 rounded-lg group-hover:bg-accent-500 transition-colors">
                    <Users className="w-7 h-7 text-accent-600 group-hover:text-white transition-colors" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-gray-900 font-bold text-lg group-hover:text-accent-600 transition-colors">
                      My Tournaments
                    </h3>
                    <p className="text-gray-500 text-sm">View and manage your tournaments</p>
                  </div>
                </motion.button>

                {/* View Profile Card */}
                <motion.button
                  onClick={() => navigate('/profile')}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-4 p-6 bg-white border-2 border-gray-200 rounded-xl hover:border-navy-800 hover:shadow-lg transition-all text-left group"
                >
                  <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-navy-800 transition-colors">
                    <User className="w-7 h-7 text-navy-800 group-hover:text-white transition-colors" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-gray-900 font-bold text-lg group-hover:text-navy-800 transition-colors">
                      My Profile
                    </h3>
                    <p className="text-gray-500 text-sm">View and update your information</p>
                  </div>
                </motion.button>

                {/* Browse Competitions Card */}
                <motion.button
                  onClick={() => navigate('/browse-competitions')}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-4 p-6 bg-white border-2 border-gray-200 rounded-xl hover:border-green-500 hover:shadow-lg transition-all text-left group"
                >
                  <div className="p-3 bg-green-100 rounded-lg group-hover:bg-green-500 transition-colors">
                    <Search className="w-7 h-7 text-green-600 group-hover:text-white transition-colors" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-gray-900 font-bold text-lg group-hover:text-green-600 transition-colors">
                      Browse Competitions
                    </h3>
                    <p className="text-gray-500 text-sm">Discover tournaments to join</p>
                  </div>
                </motion.button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
