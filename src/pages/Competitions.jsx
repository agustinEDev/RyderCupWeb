import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HeaderAuth from '../components/layout/HeaderAuth';

const Competitions = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
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
              <div className="flex flex-col items-center gap-6">
                {/* Under Construction Image */}
                <div
                  className="bg-center bg-no-repeat aspect-video bg-cover rounded-lg w-full max-w-[360px]"
                  style={{
                    backgroundImage: `url("https://lh3.googleusercontent.com/aida-public/AB6AXuBzHVz0eqUVYQp5FHtxLp5Oub8MX7RxZOzFzQ0K3pjHN3w7eJ-eR6WzPPqL3GqpH0u8rIFBfSfSwR3F_OUkTNdLHqzFm5Qr2yOvbqAFxKtXrxwRpqGMQqYjJb2cQxBYOLw8A8y9ZhZt")`
                  }}
                ></div>

                {/* Under Construction Text */}
                <div className="flex max-w-[480px] flex-col items-center gap-2">
                  <p className="text-gray-900 text-lg font-bold leading-tight tracking-tight text-center">
                    Coming Soon
                  </p>
                  <p className="text-gray-900 text-sm font-normal leading-normal text-center">
                    We're building the competitions management system. Soon you'll be able to view, manage, and track all your Ryder Cup tournaments in one place!
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
                    <span className="truncate">Create Competition</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Feature Preview Cards */}
            <div className="px-4 py-6">
              <h3 className="text-gray-900 text-xl font-bold mb-4">What's Coming</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Feature 1 */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="text-primary mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256">
                      <path d="M224,48H32a8,8,0,0,0-8,8V192a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A8,8,0,0,0,224,48Zm-96,85.15L52.57,64H203.43ZM98.71,128,40,181.81V74.19Zm11.84,10.85,12,11.05a8,8,0,0,0,10.82,0l12-11.05,58,53.15H52.57ZM157.29,128,216,74.18V181.82Z" />
                    </svg>
                  </div>
                  <h4 className="text-gray-900 font-bold text-base mb-1">Competition List</h4>
                  <p className="text-gray-500 text-sm">View all your active and past competitions</p>
                </div>

                {/* Feature 2 */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="text-primary mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256">
                      <path d="M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z" />
                    </svg>
                  </div>
                  <h4 className="text-gray-900 font-bold text-base mb-1">Team Management</h4>
                  <p className="text-gray-500 text-sm">Organize teams and track player statistics</p>
                </div>

                {/* Feature 3 */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="text-primary mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256">
                      <path d="M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM72,48v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V80H48V48ZM208,208H48V96H208V208Z" />
                    </svg>
                  </div>
                  <h4 className="text-gray-900 font-bold text-base mb-1">Live Scoring</h4>
                  <p className="text-gray-500 text-sm">Real-time score updates during matches</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <footer className="flex flex-col gap-6 px-5 py-10 text-center">
              <p className="text-gray-500 text-base font-normal leading-normal">
                @2024 Ryder Cup Amateur Manager
              </p>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Competitions;
