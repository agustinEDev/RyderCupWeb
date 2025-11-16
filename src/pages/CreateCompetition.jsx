import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
              <div className="flex flex-col items-center gap-6">
                {/* Coming Soon Image */}
                <div
                  className="bg-center bg-no-repeat aspect-video bg-cover rounded-lg w-full max-w-[360px]"
                  style={{
                    backgroundImage: `url("https://lh3.googleusercontent.com/aida-public/AB6AXuCasR6uYzwHhjACskA61NhWhQgjns6Jq2SkVQx_izn2KYGW3dhJ8s7NWvx-NQPuBcSxnm27moOFAVECIXNUQWuYD2ZRDyyMY4CXvrUlmnYM708_GinaIQMThsgbtHNIvsXsRL7UgXlAqCP71aR9Z1nEu41hO_bbgs1t0YhcrB2CNs0GnaunCeZvvY6cSk-8H2cFdD8OEsGEECBJzzxata4S-cDl6fyEsKJDJB6M7t3ZuJ8zp9-Z6kAmY3yb_TsiUpO3IKxlfRPs9Z__")`
                  }}
                ></div>

                {/* Coming Soon Text */}
                <div className="flex max-w-[480px] flex-col items-center gap-2">
                  <p className="text-gray-900 text-lg font-bold leading-tight tracking-tight text-center">
                    Coming Soon
                  </p>
                  <p className="text-gray-900 text-sm font-normal leading-normal text-center">
                    We're working hard to bring you the ability to create and manage your own competitions. Stay tuned for updates!
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

export default CreateCompetition;
