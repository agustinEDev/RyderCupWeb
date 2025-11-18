import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, Trophy, MapPin, Settings, Plus, X, ChevronDown } from 'lucide-react';
import HeaderAuth from '../components/layout/HeaderAuth';
import { getUserData, getAuthToken } from '../utils/secureAuth';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Helper function to get message className
const getMessageClassName = (type) => {
  if (type === 'success') return 'bg-green-50 text-green-800 border border-green-200';
  if (type === 'error') return 'bg-red-50 text-red-800 border border-red-200';
  return 'bg-yellow-50 text-yellow-800 border border-yellow-200';
};

const CreateCompetition = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Countries data
  const [allCountries, setAllCountries] = useState([]);
  const [countrySearch, setCountrySearch] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [adjacentCountries1, setAdjacentCountries1] = useState([]);
  const [adjacentCountries2, setAdjacentCountries2] = useState([]);
  const countryInputRef = useRef(null);

  // Form data
  const [formData, setFormData] = useState({
    // Competition Details
    competitionName: '',
    description: '',
    teamOneName: 'Europe',
    teamTwoName: 'USA',

    // Schedule
    startDate: '',
    endDate: '',

    // Location
    country: null,
    adjacentCountry1: '',
    adjacentCountry2: '',
    showAdjacentCountry1: false,
    showAdjacentCountry2: false,

    // RyderCup Settings
    handicapType: 'SCRATCH',
    handicapPercentage: '100',
    numberOfPlayers: '',
    teamAssignment: 'manual',
    playerHandicap: 'user'
  });

  useEffect(() => {
    // Fetch user data from secure storage
    const userData = getUserData();
    setUser(userData);
    setIsLoading(false);

    // Fetch all countries
    fetchCountries();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (countryInputRef.current && !countryInputRef.current.contains(event.target)) {
        setShowCountryDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchCountries = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_URL}/api/v1/countries`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAllCountries(data);
      }
    } catch (error) {
      console.error('Error fetching countries:', error);
    }
  };

  const fetchAdjacentCountries = async (countryId, level) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_URL}/api/v1/countries/${countryId}/adjacent`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (level === 1) {
          setAdjacentCountries1(data);
        } else if (level === 2) {
          // For second adjacent, combine adjacents of both selected countries
          const existingIds = new Set(adjacentCountries1.map(c => c.id));
          const combined = [...adjacentCountries1];
          for (const country of data) {
            if (!existingIds.has(country.id) && country.id !== formData.country?.id && country.id !== formData.adjacentCountry1) {
              combined.push(country);
            }
          }
          setAdjacentCountries2(combined);
        }
      }
    } catch (error) {
      console.error('Error fetching adjacent countries:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear message when user types
    if (message.text) setMessage({ type: '', text: '' });

    // Handle handicap type change
    if (name === 'handicapType' && value === 'SCRATCH') {
      setFormData(prev => ({
        ...prev,
        handicapType: value,
        handicapPercentage: '100'
      }));
    }
  };

  const handleCountrySearch = (e) => {
    setCountrySearch(e.target.value);
    setShowCountryDropdown(true);
  };

  const handleCountrySelect = (country) => {
    setFormData(prev => ({
      ...prev,
      country: country,
      adjacentCountry1: '',
      adjacentCountry2: '',
      showAdjacentCountry1: false,
      showAdjacentCountry2: false
    }));
    setCountrySearch(country.name);
    setShowCountryDropdown(false);
    setAdjacentCountries1([]);
    setAdjacentCountries2([]);

    // Fetch adjacent countries for this country
    fetchAdjacentCountries(country.id, 1);
  };

  const handleAddAdjacentCountry1 = () => {
    if (formData.country) {
      setFormData(prev => ({
        ...prev,
        showAdjacentCountry1: true
      }));
    }
  };

  const handleAdjacentCountry1Change = (e) => {
    const countryId = e.target.value;
    setFormData(prev => ({
      ...prev,
      adjacentCountry1: countryId,
      adjacentCountry2: '',
      showAdjacentCountry2: false
    }));

    if (countryId) {
      fetchAdjacentCountries(countryId, 2);
    }
  };

  const handleAddAdjacentCountry2 = () => {
    if (formData.adjacentCountry1) {
      setFormData(prev => ({
        ...prev,
        showAdjacentCountry2: true
      }));
    }
  };

  const handleRemoveAdjacentCountry1 = () => {
    setFormData(prev => ({
      ...prev,
      adjacentCountry1: '',
      adjacentCountry2: '',
      showAdjacentCountry1: false,
      showAdjacentCountry2: false
    }));
    setAdjacentCountries2([]);
  };

  const handleRemoveAdjacentCountry2 = () => {
    setFormData(prev => ({
      ...prev,
      adjacentCountry2: '',
      showAdjacentCountry2: false
    }));
  };

  const filteredCountries = allCountries.filter(country =>
    country.name.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    // Validation
    if (!formData.competitionName.trim()) {
      setMessage({ type: 'error', text: 'Competition name is required' });
      return;
    }

    if (!formData.teamOneName.trim() || !formData.teamTwoName.trim()) {
      setMessage({ type: 'error', text: 'Both team names are required' });
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      setMessage({ type: 'error', text: 'Start and end dates are required' });
      return;
    }

    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      setMessage({ type: 'error', text: 'End date must be after start date' });
      return;
    }

    if (!formData.country) {
      setMessage({ type: 'error', text: 'Please select a country' });
      return;
    }

    if (!formData.numberOfPlayers || formData.numberOfPlayers < 1) {
      setMessage({ type: 'error', text: 'Number of players must be at least 1' });
      return;
    }

    setIsSubmitting(true);

    try {
      const token = getAuthToken();

      // Build the countries array
      const countries = [formData.country.id];
      if (formData.adjacentCountry1) {
        countries.push(parseInt(formData.adjacentCountry1));
      }
      if (formData.adjacentCountry2) {
        countries.push(parseInt(formData.adjacentCountry2));
      }

      const payload = {
        name: formData.competitionName.trim(),
        description: formData.description.trim(),
        team_one_name: formData.teamOneName.trim(),
        team_two_name: formData.teamTwoName.trim(),
        start_date: formData.startDate,
        end_date: formData.endDate,
        countries: countries,
        handicap_type: formData.handicapType,
        handicap_percentage: formData.handicapType === 'PERCENTAGE' ? parseInt(formData.handicapPercentage) : null,
        number_of_players: parseInt(formData.numberOfPlayers),
        team_assignment: formData.teamAssignment,
        player_handicap: formData.playerHandicap
      };

      const response = await fetch(`${API_URL}/api/v1/competitions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create competition');
      }

      const data = await response.json();
      setMessage({ type: 'success', text: 'Competition created successfully!' });

      // Redirect to competition page after a short delay
      setTimeout(() => {
        navigate(`/competitions/${data.id}`);
      }, 1500);

    } catch (error) {
      console.error('Error creating competition:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to create competition' });
    } finally {
      setIsSubmitting(false);
    }
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
                Create Competition
              </p>
            </div>

            {/* Message Display */}
            {message.text && (
              <div className={`mx-4 mb-4 p-4 rounded-lg ${getMessageClassName(message.type)}`}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-6 px-4">
              {/* Section 1: Competition Details */}
              <div className="border border-gray-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-gray-900 font-bold text-lg">Competition Details</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="competitionName" className="block text-sm font-medium text-gray-700 mb-1">
                      Competition Name *
                    </label>
                    <input
                      id="competitionName"
                      type="text"
                      name="competitionName"
                      value={formData.competitionName}
                      onChange={handleInputChange}
                      placeholder="Enter competition name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Enter competition description"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="teamOneName" className="block text-sm font-medium text-gray-700 mb-1">
                        Team 1 Name *
                      </label>
                      <input
                        id="teamOneName"
                        type="text"
                        name="teamOneName"
                        value={formData.teamOneName}
                        onChange={handleInputChange}
                        placeholder="e.g., Europe"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label htmlFor="teamTwoName" className="block text-sm font-medium text-gray-700 mb-1">
                        Team 2 Name *
                      </label>
                      <input
                        id="teamTwoName"
                        type="text"
                        name="teamTwoName"
                        value={formData.teamTwoName}
                        onChange={handleInputChange}
                        placeholder="e.g., USA"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Schedule */}
              <div className="border border-gray-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-accent" />
                  </div>
                  <h3 className="text-gray-900 font-bold text-lg">Schedule</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date *
                    </label>
                    <input
                      id="startDate"
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                      End Date *
                    </label>
                    <input
                      id="endDate"
                      type="date"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Location */}
              <div className="border border-gray-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-navy/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-navy" />
                  </div>
                  <h3 className="text-gray-900 font-bold text-lg">Location</h3>
                </div>

                <div className="space-y-4">
                  {/* Country Search */}
                  <div ref={countryInputRef} className="relative">
                    <label htmlFor="countrySearch" className="block text-sm font-medium text-gray-700 mb-1">
                      Country *
                    </label>
                    <input
                      id="countrySearch"
                      type="text"
                      value={countrySearch}
                      onChange={handleCountrySearch}
                      onFocus={() => setShowCountryDropdown(true)}
                      placeholder="Search for a country..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />

                    {showCountryDropdown && filteredCountries.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredCountries.map(country => (
                          <button
                            key={country.id}
                            type="button"
                            onClick={() => handleCountrySelect(country)}
                            className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                          >
                            {country.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Adjacent Country 1 */}
                  {formData.country && !formData.showAdjacentCountry1 && adjacentCountries1.length > 0 && (
                    <button
                      type="button"
                      onClick={handleAddAdjacentCountry1}
                      className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      Add adjacent country
                    </button>
                  )}

                  {formData.showAdjacentCountry1 && (
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label htmlFor="adjacentCountry1" className="block text-sm font-medium text-gray-700 mb-1">
                          Adjacent Country
                        </label>
                        <div className="relative">
                          <select
                            id="adjacentCountry1"
                            name="adjacentCountry1"
                            value={formData.adjacentCountry1}
                            onChange={handleAdjacentCountry1Change}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
                          >
                            <option value="">Select adjacent country</option>
                            {adjacentCountries1.map(country => (
                              <option key={country.id} value={country.id}>
                                {country.name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveAdjacentCountry1}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  )}

                  {/* Adjacent Country 2 */}
                  {formData.adjacentCountry1 && !formData.showAdjacentCountry2 && adjacentCountries2.length > 0 && (
                    <button
                      type="button"
                      onClick={handleAddAdjacentCountry2}
                      className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      Add third country
                    </button>
                  )}

                  {formData.showAdjacentCountry2 && (
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label htmlFor="adjacentCountry2" className="block text-sm font-medium text-gray-700 mb-1">
                          Third Country
                        </label>
                        <div className="relative">
                          <select
                            id="adjacentCountry2"
                            name="adjacentCountry2"
                            value={formData.adjacentCountry2}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
                          >
                            <option value="">Select third country</option>
                            {adjacentCountries2
                              .filter(c => c.id !== parseInt(formData.adjacentCountry1))
                              .map(country => (
                                <option key={country.id} value={country.id}>
                                  {country.name}
                                </option>
                              ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveAdjacentCountry2}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 4: RyderCup Settings */}
              <div className="border border-gray-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Settings className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-gray-900 font-bold text-lg">RyderCup Settings</h3>
                </div>

                <div className="space-y-4">
                  {/* Handicap Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Handicap Type *
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="handicapType"
                          value="SCRATCH"
                          checked={formData.handicapType === 'SCRATCH'}
                          onChange={handleInputChange}
                          className="w-4 h-4 text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-gray-700">Scratch</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="handicapType"
                          value="PERCENTAGE"
                          checked={formData.handicapType === 'PERCENTAGE'}
                          onChange={handleInputChange}
                          className="w-4 h-4 text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-gray-700">Percentage</span>
                      </label>
                    </div>
                  </div>

                  {/* Handicap Percentage (only when PERCENTAGE is selected) */}
                  {formData.handicapType === 'PERCENTAGE' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Handicap Percentage
                      </label>
                      <div className="flex gap-4">
                        {['100', '95', '90'].map(percentage => (
                          <label key={percentage} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="handicapPercentage"
                              value={percentage}
                              checked={formData.handicapPercentage === percentage}
                              onChange={handleInputChange}
                              className="w-4 h-4 text-primary focus:ring-primary"
                            />
                            <span className="text-sm text-gray-700">{percentage}%</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Number of Players */}
                  <div>
                    <label htmlFor="numberOfPlayers" className="block text-sm font-medium text-gray-700 mb-1">
                      Number of Players *
                    </label>
                    <input
                      id="numberOfPlayers"
                      type="number"
                      name="numberOfPlayers"
                      value={formData.numberOfPlayers}
                      onChange={handleInputChange}
                      min="1"
                      placeholder="Enter number of players per team"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                  {/* Team Assignment */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Team Assignment *
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="teamAssignment"
                          value="manual"
                          checked={formData.teamAssignment === 'manual'}
                          onChange={handleInputChange}
                          className="w-4 h-4 text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-gray-700">Manual</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="teamAssignment"
                          value="automatic"
                          checked={formData.teamAssignment === 'automatic'}
                          onChange={handleInputChange}
                          className="w-4 h-4 text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-gray-700">Automatic</span>
                      </label>
                    </div>
                  </div>

                  {/* Player Handicap Source */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Player Handicap *
                    </label>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="playerHandicap"
                          value="custom"
                          checked={formData.playerHandicap === 'custom'}
                          onChange={handleInputChange}
                          className="w-4 h-4 text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-gray-700">Custom by competition creator</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="playerHandicap"
                          value="user"
                          checked={formData.playerHandicap === 'user'}
                          onChange={handleInputChange}
                          className="w-4 h-4 text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-gray-700">User handicap</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-3 pt-2 pb-6">
                <button
                  type="button"
                  onClick={() => navigate('/competitions')}
                  className="px-6 py-2.5 bg-gray-100 text-gray-900 text-sm font-bold rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Creating...' : 'Create Competition'}
                </button>
              </div>
            </form>

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
