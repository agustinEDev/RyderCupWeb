import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Trophy, MapPin, Settings, Plus, X, ChevronDown } from 'lucide-react';
import HeaderAuth from '../components/layout/HeaderAuth';
import { getUserData } from '../utils/secureAuth';
import { createCompetitionUseCase } from '../composition';
import { CountryFlag } from '../utils/countryUtils';

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
  const [isLoadingCountries, setIsLoadingCountries] = useState(false);
  const [adjacentCountries1, setAdjacentCountries1] = useState([]);
  const [adjacentCountries2, setAdjacentCountries2] = useState([]);

  // Form data
  const [formData, setFormData] = useState({
    // Competition Details
    competitionName: '',
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
    numberOfPlayers: undefined,
    teamAssignment: 'manual',
    playerHandicap: 'user'
  });

  useEffect(() => {
    // Fetch user data from secure storage
    const userData = getUserData();
    setUser(userData);
    setIsLoading(false);

    // Fetch all countries
    // eslint-disable-next-line sonar/todo-tag
    // TODO: Move country fetching logic to its own use case
    fetchCountries();
  }, []);

  const fetchCountries = async () => {
    setIsLoadingCountries(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/countries`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const validCountries = Array.isArray(data)
          ? data
              .filter(c => c?.code && (c?.name_en || c?.name_es))
              .map(c => ({
                id: c.code,
                name: c.name_en || c.name_es,
                code: c.code,
                name_en: c.name_en,
                name_es: c.name_es
              }))
          : [];
        setAllCountries(validCountries);
      } else {
        console.error('Failed to fetch countries');
        setAllCountries([]);
      }
    } catch (error) {
      console.error('Error fetching countries:', error);
      setAllCountries([]);
    } finally {
      setIsLoadingCountries(false);
    }
  };

  const fetchAdjacentCountries = async (countryId, level) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/countries/${countryId}/adjacent`);

      if (response.ok) {
        const data = await response.json();
        const mappedData = Array.isArray(data)
          ? data
              .filter(c => c?.code && (c?.name_en || c?.name_es))
              .map(c => ({
                id: c.code,
                name: c.name_en || c.name_es,
                code: c.code,
                name_en: c.name_en,
                name_es: c.name_es
              }))
          : [];

        if (level === 1) {
          setAdjacentCountries1(mappedData);
        } else if (level === 2) {
          const existingIds = new Set(adjacentCountries1.map(c => c.code));
          const combined = [...adjacentCountries1];
          for (const country of mappedData) {
            if (!existingIds.has(country.code) && country.code !== formData.country?.code && country.code !== formData.adjacentCountry1) {
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

    if (message.text) setMessage({ type: '', text: '' });

    if (name === 'handicapType' && value === 'SCRATCH') {
      setFormData(prev => ({
        ...prev,
        handicapType: value,
        handicapPercentage: '100'
      }));
    }
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
    setAdjacentCountries1([]);
    setAdjacentCountries2([]);
    fetchAdjacentCountries(country.code, 1);
  };

  const handleAddAdjacentCountry1 = () => {
    if (formData.country) {
      setFormData(prev => ({ ...prev, showAdjacentCountry1: true }));
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    // UI Validation
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

    const numPlayers = Number.parseInt(formData.numberOfPlayers, 10);
    if (Number.isNaN(numPlayers) || numPlayers < 2) {
      setMessage({ type: 'error', text: 'Number of players must be at least 2' });
      return;
    }

    setIsSubmitting(true);

    try {
      const countries = [];
      if (formData.adjacentCountry1) {
        countries.push(formData.adjacentCountry1);
      }
      if (formData.adjacentCountry2) {
        countries.push(formData.adjacentCountry2);
      }

      const payload = {
        name: formData.competitionName.trim(),
        team_1_name: formData.teamOneName.trim(),
        team_2_name: formData.teamTwoName.trim(),
        start_date: formData.startDate,
        end_date: formData.endDate,
        main_country: formData.country?.code,
        countries: countries,
        handicap_type: formData.handicapType.toUpperCase(),
        number_of_players: numPlayers,
        team_assignment: formData.teamAssignment.toUpperCase()
      };

      if (formData.handicapType === 'PERCENTAGE') {
        payload.handicap_percentage = Number.parseInt(formData.handicapPercentage);
      }

      console.log('📤 [CreateCompetition] Sending payload to backend:', JSON.stringify(payload, null, 2));

      // Use the use case instead of direct API call
      const createdCompetition = await createCompetitionUseCase.execute(payload);

      setMessage({ type: 'success', text: 'Competition created successfully!' });

      setTimeout(() => {
        navigate(`/competitions/${createdCompetition.id}`);
      }, 1500);

    } catch (error) {
      console.error('Error creating competition:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to create competition' });
    } finally {
      setIsSubmitting(false);
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
                      className="w-auto px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
                      className="w-auto px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
                  {/* Country Select */}
                  <div>
                    <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                      Country *
                    </label>
                    <div className="relative">
                      <select
                        id="country"
                        name="country"
                        value={formData.country?.code || ''}
                        onChange={(e) => {
                          const selectedCountry = allCountries.find(c => c.code === e.target.value);
                          if (selectedCountry) {
                            handleCountrySelect(selectedCountry);
                          } else {
                            setFormData(prev => ({
                              ...prev,
                              country: null,
                              adjacentCountry1: '',
                              adjacentCountry2: '',
                              showAdjacentCountry1: false,
                              showAdjacentCountry2: false
                            }));
                          }
                        }}
                        className={`w-full py-2 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary bg-white appearance-none pr-10 ${
                          formData.country ? 'pl-12' : 'pl-3'
                        }`}
                      >
                        <option value="">Select a country</option>
                        {allCountries.map((country) => (
                          <option key={country.code} value={country.code}>
                            {country.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                      {/* Show flag if country is selected */}
                      {formData.country && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          <CountryFlag countryCode={formData.country.code} style={{ width: '24px', height: 'auto' }} />
                        </div>
                      )}
                    </div>
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
                            className={`w-full py-2 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary appearance-none pr-10 ${
                              formData.adjacentCountry1 ? 'pl-12' : 'pl-3'
                            }`}
                          >
                            <option value="">Select adjacent country</option>
                            {adjacentCountries1.map(country => (
                              <option key={country.id} value={country.id}>
                                {country.name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                          {/* Show flag if country is selected */}
                          {formData.adjacentCountry1 && (
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                              <CountryFlag countryCode={formData.adjacentCountry1} style={{ width: '24px', height: 'auto' }} />
                            </div>
                          )}
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
                            className={`w-full py-2 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary appearance-none pr-10 ${
                              formData.adjacentCountry2 ? 'pl-12' : 'pl-3'
                            }`}
                          >
                            <option value="">Select third country</option>
                            {adjacentCountries2
                              .filter(c => c.code !== formData.adjacentCountry1)
                              .map(country => (
                                <option key={country.id} value={country.id}>
                                  {country.name}
                                </option>
                              ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                          {/* Show flag if country is selected */}
                          {formData.adjacentCountry2 && (
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                              <CountryFlag countryCode={formData.adjacentCountry2} style={{ width: '24px', height: 'auto' }} />
                            </div>
                          )}
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
                    <span className="block text-sm font-medium text-gray-700 mb-2">
                      Handicap Type *
                    </span>
                    <div className="flex gap-4">
                      <input
                        id="handicapType-scratch"
                        type="radio"
                        name="handicapType"
                        value="SCRATCH"
                        checked={formData.handicapType === 'SCRATCH'}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-primary focus:ring-primary"
                      />
                      <label htmlFor="handicapType-scratch" className="flex items-center gap-2 cursor-pointer">
                        <span className="text-sm text-gray-700">Scratch</span>
                      </label>
                      <input
                        id="handicapType-percentage"
                        type="radio"
                        name="handicapType"
                        value="PERCENTAGE"
                        checked={formData.handicapType === 'PERCENTAGE'}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-primary focus:ring-primary"
                      />
                      <label htmlFor="handicapType-percentage" className="flex items-center gap-2 cursor-pointer">
                        <span className="text-sm text-gray-700">Percentage</span>
                      </label>
                    </div>
                  </div>

                  {/* Handicap Percentage (only when PERCENTAGE is selected) */}
                  {formData.handicapType === 'PERCENTAGE' && (
                    <div>
                      <span className="block text-sm font-medium text-gray-700 mb-2">
                        Handicap Percentage
                      </span>
                      <div className="flex gap-4">
                        {['100', '95', '90'].map(percentage => (
                          <React.Fragment key={percentage}>
                            <input
                              id={`handicapPercentage-${percentage}`}
                              type="radio"
                              name="handicapPercentage"
                              value={percentage}
                              checked={formData.handicapPercentage === percentage}
                              onChange={handleInputChange}
                              className="w-4 h-4 text-primary focus:ring-primary"
                            />
                            <label htmlFor={`handicapPercentage-${percentage}`} className="flex items-center gap-2 cursor-pointer">
                              <span className="text-sm text-gray-700">{percentage}%</span>
                            </label>
                          </React.Fragment>
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
                      value={formData.numberOfPlayers === undefined ? '' : formData.numberOfPlayers}
                      onChange={handleInputChange}
                      min="1"
                      placeholder="Enter total number of players"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  {/* Team Assignment */}
                  <div>
                    <span className="block text-sm font-medium text-gray-700 mb-2">
                      Team Assignment *
                    </span>
                    <div className="relative">
                      <select
                        id="teamAssignment"
                        name="teamAssignment"
                        value={formData.teamAssignment}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
                      >
                        <option value="manual">Manual</option>
                        <option value="automatic">Automatic</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    </div>
                  </div>

                  {/* Player Handicap Source */}
                  <div>
                    <span className="block text-sm font-medium text-gray-700 mb-2">
                      Player Handicap *
                    </span>
                    <div className="relative">
                      <select
                        id="playerHandicap"
                        name="playerHandicap"
                        value={formData.playerHandicap}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
                      >
                        <option value="custom">Custom by competition creator</option>
                        <option value="user">User handicap</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
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
