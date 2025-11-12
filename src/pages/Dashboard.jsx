import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HeaderAuth from '../components/layout/HeaderAuth';
import ProfileCard from '../components/profile/ProfileCard';
import EmailVerificationBanner from '../components/EmailVerificationBanner';

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      // Not authenticated, redirect to login
      navigate('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
    } catch (error) {
      console.error('Error parsing user data:', error);
      navigate('/login');
    } finally {
      setIsLoading(false);
    }
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
    return null; // Will redirect in useEffect
  }

  const firstName = user.first_name || 'User';

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-white">
      <div className="layout-container flex h-full grow flex-col">
        <HeaderAuth user={user} />

        <div className="px-4 md:px-40 flex flex-1 justify-center py-5">
          <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
            {/* Welcome Message */}
            <div className="flex flex-wrap justify-between gap-3 p-4">
              <p className="text-gray-900 tracking-tight text-3xl md:text-[32px] font-bold leading-tight min-w-72">
                Welcome, {firstName}
              </p>
            </div>

            {/* Email Verification Banner */}
            {user && !user.email_verified && (
              <div className="px-4">
                <EmailVerificationBanner userEmail={user.email} />
              </div>
            )}

            {/* Profile Card */}
            <ProfileCard user={user} />

            {/* Quick Actions */}
            <div className="p-4 mt-4">
              <h2 className="text-gray-900 text-xl font-bold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Create Competition Card */}
                <button
                  onClick={() => navigate('/competitions/create')}
                  className="flex flex-col gap-3 p-6 bg-white border-2 border-gray-200 rounded-lg hover:border-primary hover:shadow-md transition-all text-left"
                >
                  <div className="text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256">
                      <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm48-88a8,8,0,0,1-8,8H136v32a8,8,0,0,1-16,0V136H88a8,8,0,0,1,0-16h32V88a8,8,0,0,1,16,0v32h32A8,8,0,0,1,176,128Z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-gray-900 font-bold text-lg">Create Competition</h3>
                    <p className="text-gray-500 text-sm">Start a new Ryder Cup tournament</p>
                  </div>
                </button>

                {/* My Competitions Card */}
                <button
                  onClick={() => navigate('/competitions')}
                  className="flex flex-col gap-3 p-6 bg-white border-2 border-gray-200 rounded-lg hover:border-primary hover:shadow-md transition-all text-left"
                >
                  <div className="text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256">
                      <path d="M224,48H32a8,8,0,0,0-8,8V192a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A8,8,0,0,0,224,48Zm-96,85.15L52.57,64H203.43ZM98.71,128,40,181.81V74.19Zm11.84,10.85,12,11.05a8,8,0,0,0,10.82,0l12-11.05,58,53.15H52.57ZM157.29,128,216,74.18V181.82Z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-gray-900 font-bold text-lg">My Competitions</h3>
                    <p className="text-gray-500 text-sm">View and manage your tournaments</p>
                  </div>
                </button>

                {/* View Profile Card */}
                <button
                  onClick={() => navigate('/profile')}
                  className="flex flex-col gap-3 p-6 bg-white border-2 border-gray-200 rounded-lg hover:border-primary hover:shadow-md transition-all text-left"
                >
                  <div className="text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256">
                      <path d="M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-gray-900 font-bold text-lg">My Profile</h3>
                    <p className="text-gray-500 text-sm">View and update your information</p>
                  </div>
                </button>

                {/* Coming Soon Card */}
                <div className="flex flex-col gap-3 p-6 bg-gray-50 border-2 border-gray-200 rounded-lg opacity-60 text-left">
                  <div className="text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256">
                      <path d="M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM72,48v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V80H48V48ZM208,208H48V96H208V208Z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-gray-400 font-bold text-lg">Statistics</h3>
                    <p className="text-gray-400 text-sm">Coming soon...</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
