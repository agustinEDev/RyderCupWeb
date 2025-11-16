import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Mail, Shield, Calendar, TrendingUp, Award,
  CheckCircle, AlertCircle, Edit, LogOut, ArrowLeft
} from 'lucide-react';
import HeaderAuth from '../components/layout/HeaderAuth';

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch user data from localStorage (auth already verified by ProtectedRoute)
    const userData = localStorage.getItem('user');

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
    } catch (error) {
      console.error('Error parsing user data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleEditProfile = () => {
    navigate('/profile/edit');
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
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
    ? formatDate(user.handicap_updated_at)
    : 'Never';
  const memberSince = formatDate(user.created_at);

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
                  My Profile
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  Your account information and statistics
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
                          Email Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
                          <AlertCircle className="w-3 h-3" />
                          Email Pending
                        </span>
                      )}

                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-semibold">
                        <Shield className="w-3 h-3" />
                        Active Account
                      </span>

                      {handicap !== 'Not set' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-accent-100 text-accent-700 rounded-full text-xs font-semibold">
                          <Award className="w-3 h-3" />
                          Handicap Registered
                        </span>
                      )}
                    </div>

                    {/* Email */}
                    <div className="flex items-center gap-2 text-gray-600 mb-2">
                      <Mail className="w-4 h-4" />
                      <span className="text-sm">{email}</span>
                    </div>

                    {/* Member Since */}
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">Member since {memberSince}</span>
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
                      <p className="text-2xl font-bold text-gray-900">0</p>
                      <p className="text-xs text-gray-500 mt-1">Coming soon</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Info Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="p-4"
            >
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-gray-900 font-bold text-lg mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary-600" />
                  Account Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-500 text-sm">User ID:</span>
                    <p className="text-gray-900 font-mono text-sm mt-1">{user.id?.substring(0, 8)}...</p>
                  </div>
                  <div>
                    <span className="text-gray-500 text-sm">Last Updated:</span>
                    <p className="text-gray-900 text-sm mt-1">{formatDate(user.updated_at)}</p>
                  </div>
                </div>

                {handicap === 'Not set' && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Update your handicap to participate in competitions</span>
                  </div>
                )}
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
                  <span>Back to Dashboard</span>
                </motion.button>

                <motion.button
                  onClick={handleEditProfile}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors shadow-md"
                >
                  <Edit className="w-4 h-4" />
                  <span>Edit Profile</span>
                </motion.button>

                <motion.button
                  onClick={handleLogout}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors shadow-md"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
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
