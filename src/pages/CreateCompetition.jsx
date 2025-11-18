import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, Trophy, MapPin, Settings, Star, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import HeaderAuth from '../components/layout/HeaderAuth';
import { getUserData, authenticatedFetch } from '../utils/secureAuth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const CreateCompetition = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [countries, setCountries] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [countriesError, setCountriesError] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    country_id: '',
    location: '',
    venue: '',
    format: 'ryder_cup'
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const userData = getUserData();
    setUser(userData);
    setIsLoading(false);

    // Load countries when component mounts
    loadCountries();
  }, []);

  const loadCountries = async () => {
    setLoadingCountries(true);
    setCountriesError(null);

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/api/v1/countries`, {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error(`Failed to load countries: ${response.status}`);
      }

      const data = await response.json();

      // Ensure we have all 166 countries
      if (Array.isArray(data)) {
        setCountries(data);
        console.log(`Loaded ${data.length} countries`);

        if (data.length !== 166) {
          console.warn(`Expected 166 countries but received ${data.length}`);
        }
      } else {
        throw new Error('Invalid countries data format');
      }
    } catch (error) {
      console.error('Error loading countries:', error);
      setCountriesError(error.message);
      toast.error('Failed to load countries. Please try again.');
    } finally {
      setLoadingCountries(false);
    }
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.name || !formData.start_date || !formData.country_id || !formData.location) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/api/v1/competitions`, {
        method: 'POST',
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create competition');
      }

      const competition = await response.json();
      toast.success('Competition created successfully!');
      navigate(`/competitions/${competition.id}`);
    } catch (error) {
      console.error('Error creating competition:', error);
      toast.error(error.message || 'Failed to create competition');
    } finally {
      setSubmitting(false);
    }
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

            {/* Competition Form */}
            <div className="flex flex-col px-4 py-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Competition Details Section */}
                <div className="border border-gray-200 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-gray-900 text-xl font-bold">Competition Details</h3>
                  </div>

                  <div className="space-y-4">
                    {/* Competition Name */}
                    <div>
                      <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-2">
                        Competition Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g., Spring 2025 Ryder Cup"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label htmlFor="description" className="block text-sm font-semibold text-gray-900 mb-2">
                        Description
                      </label>
                      <textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        rows="3"
                        placeholder="Describe your competition..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"
                      />
                    </div>

                    {/* Format */}
                    <div>
                      <label htmlFor="format" className="block text-sm font-semibold text-gray-900 mb-2">
                        Format
                      </label>
                      <select
                        id="format"
                        name="format"
                        value={formData.format}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                      >
                        <option value="ryder_cup">Ryder Cup</option>
                        <option value="match_play">Match Play</option>
                        <option value="stroke_play">Stroke Play</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Schedule Section */}
                <div className="border border-gray-200 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-accent" />
                    </div>
                    <h3 className="text-gray-900 text-xl font-bold">Schedule</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Start Date */}
                    <div>
                      <label htmlFor="start_date" className="block text-sm font-semibold text-gray-900 mb-2">
                        Start Date *
                      </label>
                      <input
                        type="date"
                        id="start_date"
                        name="start_date"
                        value={formData.start_date}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                      />
                    </div>

                    {/* End Date */}
                    <div>
                      <label htmlFor="end_date" className="block text-sm font-semibold text-gray-900 mb-2">
                        End Date
                      </label>
                      <input
                        type="date"
                        id="end_date"
                        name="end_date"
                        value={formData.end_date}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Venue & Location Section */}
                <div className="border border-gray-200 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-gray-900 text-xl font-bold">Venue & Location</h3>
                  </div>

                  {/* Countries Loading/Error States */}
                  {countriesError && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-red-900">Failed to load countries</p>
                        <p className="text-sm text-red-700 mt-1">{countriesError}</p>
                        <button
                          type="button"
                          onClick={loadCountries}
                          className="mt-2 text-sm font-semibold text-red-600 hover:text-red-700 underline"
                        >
                          Try again
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Country Selection */}
                    <div>
                      <label htmlFor="country_id" className="block text-sm font-semibold text-gray-900 mb-2">
                        Country *
                      </label>
                      <select
                        id="country_id"
                        name="country_id"
                        value={formData.country_id}
                        onChange={handleInputChange}
                        required
                        disabled={loadingCountries}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        <option value="">
                          {loadingCountries ? 'Loading countries...' : 'Select a country'}
                        </option>
                        {countries.map((country) => (
                          <option key={country.id} value={country.id}>
                            {country.name}
                          </option>
                        ))}
                      </select>
                      {!loadingCountries && countries.length > 0 && (
                        <p className="mt-1 text-xs text-gray-500">
                          {countries.length} countries available
                        </p>
                      )}
                    </div>

                    {/* Location/City */}
                    <div>
                      <label htmlFor="location" className="block text-sm font-semibold text-gray-900 mb-2">
                        City/Location *
                      </label>
                      <input
                        type="text"
                        id="location"
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g., Rome, Paris, London"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                      />
                    </div>

                    {/* Venue/Course Name */}
                    <div>
                      <label htmlFor="venue" className="block text-sm font-semibold text-gray-900 mb-2">
                        Venue/Course Name
                      </label>
                      <input
                        type="text"
                        id="venue"
                        name="venue"
                        value={formData.venue}
                        onChange={handleInputChange}
                        placeholder="e.g., Marco Simone Golf Club"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleBackToDashboard}
                    className="flex-1 sm:flex-none px-6 py-3 border border-gray-300 rounded-lg text-gray-900 font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || loadingCountries}
                    className="flex-1 sm:flex-none px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Creating...' : 'Create Competition'}
                  </button>
                </div>
              </form>
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
