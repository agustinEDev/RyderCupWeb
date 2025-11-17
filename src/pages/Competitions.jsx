import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Users, BarChart3, Calendar, Star, Plus } from 'lucide-react';
import HeaderAuth from '../components/layout/HeaderAuth';
import { getUserData } from '../utils/secureAuth';

const Competitions = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch user data from secure storage (auth already verified by ProtectedRoute)
    const userData = getUserData();
    setUser(userData);
    setIsLoading(false);
  }, []);

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  const handleCreateCompetition = () => {
    navigate('/competitions/create');
  };

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

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-white">
      <div className="layout-container flex h-full grow flex-col">
        <HeaderAuth user={user} />

        <div className="px-4 md:px-40 flex flex-1 justify-center py-5">
          <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
            {/* Page Title */}
            <div className="flex flex-wrap justify-between gap-3 p-4">
              <p className="text-gray-900 tracking-tight text-3xl md:text-[32px] font-bold leading-tight min-w-72">
                My Competitions
              </p>
            </div>

            {/* Under Construction Content */}
            <div className="flex flex-col px-4 py-6">
              <div className="flex flex-col items-center gap-6 mb-8">
                {/* Coming Soon Badge */}
                <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                  <Star className="w-4 h-4 text-primary mr-2" />
                  <span className="text-primary text-sm font-semibold">Coming Soon</span>
                </div>

                {/* Under Construction Text */}
                <div className="flex max-w-[560px] flex-col items-center gap-3">
                  <h2 className="text-gray-900 text-2xl font-bold leading-tight tracking-tight text-center">
                    Competition Management Dashboard
                  </h2>
                  <p className="text-gray-600 text-base font-normal leading-normal text-center">
                    We're building a powerful competition management system. Soon you'll be able to view, manage, and track all your Ryder Cup tournaments in one centralized place!
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-[480px]">
                  <button
                    onClick={handleBackToDashboard}
                    className="flex-1 flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-gray-100 text-gray-900 text-sm font-bold leading-normal tracking-wide hover:bg-gray-200 transition-colors"
                  >
                    <span className="truncate">Back to Dashboard</span>
                  </button>
                  <button
                    onClick={handleCreateCompetition}
                    className="flex-1 flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-wide hover:bg-primary/90 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    <span className="truncate">Create Competition</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Feature Preview Cards */}
            <div className="px-4 py-6">
              <h3 className="text-gray-900 text-xl font-bold mb-6 text-center md:text-left">
                What's Coming to Your Dashboard
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Feature 1 */}
                <div className="border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-primary/30 transition-all duration-300">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Trophy className="w-6 h-6 text-primary" />
                  </div>
                  <h4 className="text-gray-900 font-bold text-base mb-2">Competition List</h4>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    View all your active and past competitions with quick access to details and results
                  </p>
                </div>

                {/* Feature 2 */}
                <div className="border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-primary/30 transition-all duration-300">
                  <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                    <Users className="w-6 h-6 text-accent" />
                  </div>
                  <h4 className="text-gray-900 font-bold text-base mb-2">Team Management</h4>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Organize teams, manage rosters, and track player statistics throughout tournaments
                  </p>
                </div>

                {/* Feature 3 */}
                <div className="border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-primary/30 transition-all duration-300">
                  <div className="w-12 h-12 rounded-lg bg-navy/10 flex items-center justify-center mb-4">
                    <BarChart3 className="w-6 h-6 text-navy" />
                  </div>
                  <h4 className="text-gray-900 font-bold text-base mb-2">Live Scoring</h4>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Real-time score updates during matches with live leaderboards and match results
                  </p>
                </div>

                {/* Feature 4 */}
                <div className="border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-primary/30 transition-all duration-300">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Calendar className="w-6 h-6 text-primary" />
                  </div>
                  <h4 className="text-gray-900 font-bold text-base mb-2">Schedule Overview</h4>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    See upcoming matches, tournament dates, and manage competition timelines
                  </p>
                </div>

                {/* Feature 5 */}
                <div className="border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-primary/30 transition-all duration-300">
                  <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                    <BarChart3 className="w-6 h-6 text-accent" />
                  </div>
                  <h4 className="text-gray-900 font-bold text-base mb-2">Statistics & Analytics</h4>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Deep dive into performance metrics, trends, and historical competition data
                  </p>
                </div>

                {/* Feature 6 */}
                <div className="border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-primary/30 transition-all duration-300">
                  <div className="w-12 h-12 rounded-lg bg-navy/10 flex items-center justify-center mb-4">
                    <Star className="w-6 h-6 text-navy" />
                  </div>
                  <h4 className="text-gray-900 font-bold text-base mb-2">Achievements</h4>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Track milestones, awards, and highlights from all your tournaments
                  </p>
                </div>
              </div>
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
