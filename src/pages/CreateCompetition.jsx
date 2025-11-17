import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, Trophy, MapPin, Settings, Star } from 'lucide-react';
import HeaderAuth from '../components/layout/HeaderAuth';
import { getUserData } from '../utils/secureAuth';

const CreateCompetition = () => {
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
                Create your Competition
              </p>
            </div>

            {/* Coming Soon Content */}
            <div className="flex flex-col px-4 py-6">
              <div className="flex flex-col items-center gap-6 mb-8">
                {/* Coming Soon Badge */}
                <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                  <Star className="w-4 h-4 text-primary mr-2" />
                  <span className="text-primary text-sm font-semibold">Coming Soon</span>
                </div>

                {/* Coming Soon Text */}
                <div className="flex max-w-[560px] flex-col items-center gap-3">
                  <h2 className="text-gray-900 text-2xl font-bold leading-tight tracking-tight text-center">
                    Competition Creator is Under Development
                  </h2>
                  <p className="text-gray-600 text-base font-normal leading-normal text-center">
                    We're crafting an intuitive competition creation experience. Soon you'll be able to set up your own Ryder Cup tournaments with just a few clicks!
                  </p>
                </div>

                {/* Back to Dashboard Button */}
                <button
                  onClick={handleBackToDashboard}
                  className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-gray-100 text-gray-900 text-sm font-bold leading-normal tracking-wide hover:bg-gray-200 transition-colors"
                >
                  <span className="truncate">Back to Dashboard</span>
                </button>
              </div>

              {/* Feature Preview Cards */}
              <div className="px-0 py-4">
                <h3 className="text-gray-900 text-xl font-bold mb-6 text-center md:text-left">
                  What You'll Be Able to Configure
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Feature 1 */}
                  <div className="border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-primary/30 transition-all duration-300">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <Trophy className="w-6 h-6 text-primary" />
                    </div>
                    <h4 className="text-gray-900 font-bold text-base mb-2">Competition Details</h4>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Name your competition, set the format, and customize the tournament rules
                    </p>
                  </div>

                  {/* Feature 2 */}
                  <div className="border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-primary/30 transition-all duration-300">
                    <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                      <Calendar className="w-6 h-6 text-accent" />
                    </div>
                    <h4 className="text-gray-900 font-bold text-base mb-2">Schedule Setup</h4>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Define start dates, match schedules, and tournament duration
                    </p>
                  </div>

                  {/* Feature 3 */}
                  <div className="border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-primary/30 transition-all duration-300">
                    <div className="w-12 h-12 rounded-lg bg-navy/10 flex items-center justify-center mb-4">
                      <Users className="w-6 h-6 text-navy" />
                    </div>
                    <h4 className="text-gray-900 font-bold text-base mb-2">Team Management</h4>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Add players, create teams, and assign captains for your competition
                    </p>
                  </div>

                  {/* Feature 4 */}
                  <div className="border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-primary/30 transition-all duration-300">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <MapPin className="w-6 h-6 text-primary" />
                    </div>
                    <h4 className="text-gray-900 font-bold text-base mb-2">Venue & Course</h4>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Select the golf course and specify the venue for your tournament
                    </p>
                  </div>

                  {/* Feature 5 */}
                  <div className="border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-primary/30 transition-all duration-300">
                    <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                      <Settings className="w-6 h-6 text-accent" />
                    </div>
                    <h4 className="text-gray-900 font-bold text-base mb-2">Scoring Rules</h4>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Configure point systems, match play formats, and scoring methods
                    </p>
                  </div>

                  {/* Feature 6 */}
                  <div className="border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-primary/30 transition-all duration-300">
                    <div className="w-12 h-12 rounded-lg bg-navy/10 flex items-center justify-center mb-4">
                      <Star className="w-6 h-6 text-navy" />
                    </div>
                    <h4 className="text-gray-900 font-bold text-base mb-2">Invitations</h4>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Invite players via email and manage participant confirmations
                    </p>
                  </div>
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

export default CreateCompetition;
