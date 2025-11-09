import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HeaderAuth from '../components/layout/HeaderAuth';

const Profile = () => {
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

  const handleEditProfile = () => {
    // TODO: Implement edit profile functionality
    alert('Edit profile functionality coming soon!');
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
            <div className="flex flex-wrap justify-between gap-3 p-4">
              <p className="text-gray-900 tracking-tight text-3xl md:text-[32px] font-bold leading-tight min-w-72">
                My Profile
              </p>
            </div>

            {/* Profile Card */}
            <div className="p-4">
              <div className="flex flex-col md:flex-row items-stretch justify-start rounded-lg gap-4">
                {/* Profile Image */}
                <div
                  className="w-full md:w-1/2 bg-center bg-no-repeat aspect-video bg-cover rounded-lg"
                  style={{
                    backgroundImage: `url("https://lh3.googleusercontent.com/aida-public/AB6AXuDoUyo6mRguPuclutMb4i6btSypIeXd-5p3iG_1RiBcUKBaQtjY4LYLr68FvRLe94WawpYUccXI7v1ioeegoaZ9LW0Mpdnr9mqu2iKAkOmyoZRw6ld3nTqmxhT1YTMbM036UZF3jdxLGFh9jrAm-ngH392O4FWX_GBQOwUqZEfH-m-54E-tK7ARgScxbi3HDoWnen2RaB1D1FcC7MjLFol4d7pObsyKMeFUcOcZcUg5_i94cZavvbrw_wqSMjns76w5OwLrHqhIEcWR")`
                  }}
                ></div>

                {/* Profile Info */}
                <div className="flex w-full min-w-72 grow flex-col items-stretch justify-center gap-1 py-4 md:px-4">
                  <p className="text-gray-900 text-lg font-bold leading-tight tracking-tight">
                    {fullName}
                  </p>

                  <div className="flex flex-col md:flex-row items-start md:items-end gap-3 justify-between mt-2">
                    <div className="flex flex-col gap-2">
                      <p className="text-gray-500 text-base font-normal leading-normal">
                        {email}
                      </p>
                      <p className="text-gray-500 text-base font-normal leading-normal">
                        <span className="font-semibold text-primary">Handicap: {handicap}</span>
                        {handicap !== 'Not set' && (
                          <span className="text-sm"> (Updated: {handicapUpdated})</span>
                        )}
                      </p>
                    </div>

                    {/* Member Since Badge */}
                    <div className="bg-primary text-white rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap">
                      Member Since: {memberSince}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Info Cards */}
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {/* Account Info Card */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-gray-900 font-bold text-lg mb-3">Account Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">User ID:</span>
                    <span className="text-gray-900 font-mono text-sm">{user.id?.substring(0, 8)}...</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status:</span>
                    <span className="text-green-600 font-semibold">Active</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Last Updated:</span>
                    <span className="text-gray-900">{formatDate(user.updated_at)}</span>
                  </div>
                </div>
              </div>

              {/* Handicap Info Card */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-gray-900 font-bold text-lg mb-3">Handicap Details</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Current:</span>
                    <span className="text-primary font-bold text-xl">{handicap}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Last Updated:</span>
                    <span className="text-gray-900 text-sm">{handicapUpdated}</span>
                  </div>
                  {handicap === 'Not set' && (
                    <div className="mt-3 p-2 bg-yellow-50 rounded text-sm text-yellow-700">
                      Update your handicap to participate in competitions
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-stretch">
              <div className="flex flex-1 gap-3 flex-wrap px-4 py-3 justify-end">
                <button
                  onClick={handleEditProfile}
                  className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-gray-100 text-gray-900 text-sm font-bold leading-normal tracking-wide hover:bg-gray-200 transition-colors"
                >
                  <span className="truncate">Edit Profile</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-wide hover:bg-primary/90 transition-colors"
                >
                  <span className="truncate">Log Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
