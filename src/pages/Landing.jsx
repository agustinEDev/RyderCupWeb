import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';

const Landing = () => {
  const navigate = useNavigate();

  const handleCreateCompetition = () => {
    // TODO: Check if user is authenticated
    // For now, redirect to login
    navigate('/login');
  };

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-white">
      <div className="layout-container flex h-full grow flex-col">
        <Header />

        <div className="px-4 md:px-40 flex flex-1 justify-center py-5">
          <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
            {/* Hero Section */}
            <div className="container mx-auto">
              <div className="p-0 md:p-4">
                <div
                  className="flex min-h-[480px] flex-col gap-6 bg-cover bg-center bg-no-repeat md:gap-8 md:rounded-lg items-center justify-center p-4"
                  style={{
                    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.4) 100%), url("https://lh3.googleusercontent.com/aida-public/AB6AXuBeFbwvHfIwVKcsdyBM_bKTVdc2IeE0IwIAYSFDY44DSWm-VkJ-Oxy2JL9pWD9MTiSUYeWTduRjcEZeBhdrTNILYKHX7V4IAMIYkCZMXLqnaJ2HwCo1whBwJA_6lLljFOUOPzwLX9U_xYglKf6mVuZUd_Fe9oJJdWaIgN_p180TmC5Oi4IksYRE_f_SObbBgXbxojSDNKrBBfWKmOdiYLswmMRPCRPYhK3w-gUSmempWehBoosygowW7ZBpgLUr9PzJUbrXJ7GE_gDH")`
                  }}
                >
                  <h1 className="text-white text-4xl font-black leading-tight tracking-tight md:text-5xl md:font-black md:leading-tight text-center">
                    Manage your Amateur Ryder Cup Tournament
                  </h1>
                  <button
                    onClick={handleCreateCompetition}
                    className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 md:h-12 md:px-5 bg-primary text-white text-sm font-bold leading-normal tracking-wide md:text-base hover:bg-primary/90 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    <span className="truncate">Create your Competition</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Features Section */}
            <div id="features" className="flex flex-col gap-10 px-4 py-10">
              <div className="flex flex-col gap-4">
                <h1 className="text-gray-900 tracking-tight text-3xl font-bold leading-tight md:text-4xl md:font-black max-w-[720px]">
                  Everything you need to run your tournament
                </h1>
                <p className="text-gray-900 text-base font-normal leading-normal max-w-[720px]">
                  Ryder Cup Amateur Manager provides all the tools you need to manage your amateur golf tournament, from handicap management to live scoring.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Feature Card 1 */}
                <div className="flex flex-1 gap-3 rounded-lg border border-gray-200 bg-white p-4 flex-col hover:shadow-md transition-shadow duration-200">
                  <div className="text-gray-900">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256">
                      <path d="M232,64H208V56a16,16,0,0,0-16-16H64A16,16,0,0,0,48,56v8H24A16,16,0,0,0,8,80V96a40,40,0,0,0,40,40h3.65A80.13,80.13,0,0,0,120,191.61V216H96a8,8,0,0,0,0,16h64a8,8,0,0,0,0-16H136V191.58c31.94-3.23,58.44-25.64,68.08-55.58H208a40,40,0,0,0,40-40V80A16,16,0,0,0,232,64ZM48,120A24,24,0,0,1,24,96V80H48v32q0,4,.39,8Zm144-8.9c0,35.52-28.49,64.64-63.51,64.9H128a64,64,0,0,1-64-64V56H192ZM232,96a24,24,0,0,1-24,24h-.5a81.81,81.81,0,0,0,.5-8.9V80h24Z" />
                    </svg>
                  </div>
                  <div className="flex flex-col gap-1">
                    <h2 className="text-gray-900 text-base font-bold leading-tight">Handicap Management</h2>
                    <p className="text-gray-600 text-sm font-normal leading-normal">
                      Automatically calculate handicaps for all players to ensure fair play.
                    </p>
                  </div>
                </div>

                {/* Feature Card 2 */}
                <div className="flex flex-1 gap-3 rounded-lg border border-gray-200 bg-white p-4 flex-col hover:shadow-md transition-shadow duration-200">
                  <div className="text-gray-900">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256">
                      <path d="M117.25,157.92a60,60,0,1,0-66.5,0A95.83,95.83,0,0,0,3.53,195.63a8,8,0,1,0,13.4,8.74,80,80,0,0,1,134.14,0,8,8,0,0,0,13.4-8.74A95.83,95.83,0,0,0,117.25,157.92ZM40,108a44,44,0,1,1,44,44A44.05,44.05,0,0,1,40,108Zm210.14,98.7a8,8,0,0,1-11.07-2.33A79.83,79.83,0,0,0,172,168a8,8,0,0,1,0-16,44,44,0,1,0-16.34-84.87,8,8,0,1,1-5.94-14.85,60,60,0,0,1,55.53,105.64,95.83,95.83,0,0,1,47.22,37.71A8,8,0,0,1,250.14,206.7Z" />
                    </svg>
                  </div>
                  <div className="flex flex-col gap-1">
                    <h2 className="text-gray-900 text-base font-bold leading-tight">Ryder Cup Format</h2>
                    <p className="text-gray-600 text-sm font-normal leading-normal">
                      Easily set up and manage the Ryder Cup format with customizable match play.
                    </p>
                  </div>
                </div>

                {/* Feature Card 3 */}
                <div className="flex flex-1 gap-3 rounded-lg border border-gray-200 bg-white p-4 flex-col hover:shadow-md transition-shadow duration-200">
                  <div className="text-gray-900">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256">
                      <path d="M244.8,150.4a8,8,0,0,1-11.2-1.6A51.6,51.6,0,0,0,192,128a8,8,0,0,1-7.37-4.89,8,8,0,0,1,0-6.22A8,8,0,0,1,192,112a24,24,0,1,0-23.24-30,8,8,0,1,1-15.5-4A40,40,0,1,1,219,117.51a67.94,67.94,0,0,1,27.43,21.68A8,8,0,0,1,244.8,150.4ZM190.92,212a8,8,0,1,1-13.84,8,57,57,0,0,0-98.16,0,8,8,0,1,1-13.84-8,72.06,72.06,0,0,1,33.74-29.92,48,48,0,1,1,58.36,0A72.06,72.06,0,0,1,190.92,212ZM128,176a32,32,0,1,0-32-32A32,32,0,0,0,128,176ZM72,120a8,8,0,0,0-8-8A24,24,0,1,1,87.24,82a8,8,0,1,0,15.5-4A40,40,0,1,0,37,117.51,67.94,67.94,0,0,0,9.6,139.19a8,8,0,1,0,12.8,9.61A51.6,51.6,0,0,1,64,128,8,8,0,0,0,72,120Z" />
                    </svg>
                  </div>
                  <div className="flex flex-col gap-1">
                    <h2 className="text-gray-900 text-base font-bold leading-tight">Team Management</h2>
                    <p className="text-gray-600 text-sm font-normal leading-normal">
                      Organize players into teams and track their progress throughout the tournament.
                    </p>
                  </div>
                </div>

                {/* Feature Card 4 */}
                <div className="flex flex-1 gap-3 rounded-lg border border-gray-200 bg-white p-4 flex-col hover:shadow-md transition-shadow duration-200">
                  <div className="text-gray-900">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256">
                      <path d="M216,40H136V24a8,8,0,0,0-16,0V40H40A16,16,0,0,0,24,56V176a16,16,0,0,0,16,16H79.36L57.75,219a8,8,0,0,0,12.5,10l29.59-37h56.32l29.59,37a8,8,0,1,0,12.5-10l-21.61-27H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,136H40V56H216V176ZM104,120v24a8,8,0,0,1-16,0V120a8,8,0,0,1,16,0Zm32-16v40a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm32-16v56a8,8,0,0,1-16,0V88a8,8,0,0,1,16,0Z" />
                    </svg>
                  </div>
                  <div className="flex flex-col gap-1">
                    <h2 className="text-gray-900 text-base font-bold leading-tight">Live Scoring</h2>
                    <p className="text-gray-600 text-sm font-normal leading-normal">
                      Provide real-time scoring updates for players and spectators to follow the action.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
};

export default Landing;
