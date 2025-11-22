import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, Trophy, MapPin, Settings, Plus, X, ChevronDown } from 'lucide-react';
import HeaderAuth from '../components/layout/HeaderAuth';
import { getUserData, getAuthToken } from '../utils/secureAuth'; // Re-add getAuthToken
import { createCompetitionUseCase } from '../composition';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'; // Re-add API_URL

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
  const [countrySearch, setCountrySearch] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [adjacentCountries1, setAdjacentCountries1] = useState([]);
  const [adjacentCountries2, setAdjacentCountries2] = useState([]);
  const countryInputRef = useRef(null);

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
    // TODO: Move country fetching logic to its own use case
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
    setIsLoadingCountries(true);
    try {
      const response = await fetch('/api/v1/countries', {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const validCountries = Array.isArray(data) 
          ? data
              .filter(c => c && c.code && (c.name_en || c.name_es))
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
      const response = await fetch(`/api/v1/countries/${countryId}/adjacent`);

      if (response.ok) {
        const data = await response.json();
        const mappedData = Array.isArray(data)
          ? data
              .filter(c => c && c.code && (c.name_en || c.name_es))
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
    if (countryId) fetchAdjacentCountries(countryId, 2);
  };

  const handleAddAdjacentCountry2 = () => {
    if (formData.adjacentCountry1) {
      setFormData(prev => ({ ...prev, showAdjacentCountry2: true }));
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
    setFormData(prev => ({ ...prev, adjacentCountry2: '', showAdjacentCountry2: false }));
  };

  const filteredCountries = allCountries.filter(country =>
    country && country.name && country.name.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    // UI Validation
    if (!formData.competitionName.trim()) {
      setMessage({ type: 'error', text: 'Competition name is required' });
      return;
    }
    // ... other validations remain the same ...
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
    const numPlayers = parseInt(formData.numberOfPlayers, 10);
    if (isNaN(numPlayers) || numPlayers < 2) {
      setMessage({ type: 'error', text: 'Number of players must be at least 2' });
      return;
    }

    setIsSubmitting(true);

    try {
      const countries = [];
      if (formData.adjacentCountry1) countries.push(formData.adjacentCountry1);
      if (formData.adjacentCountry2) countries.push(formData.adjacentCountry2);

      const payload = {
        name: formData.competitionName.trim(),
        team_one_name: formData.teamOneName.trim(),
        team_two_name: formData.teamTwoName.trim(),
        start_date: formData.startDate,
        end_date: formData.endDate,
        main_country: formData.country.code,
        countries: countries,
        handicap_type: formData.handicapType,
        max_players: numPlayers,
        team_assignment: formData.teamAssignment,
        player_handicap: formData.playerHandicap
      };

      if (formData.handicapType === 'PERCENTAGE') {
        payload.handicap_percentage = parseInt(formData.handicapPercentage);
      }

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
      {/* ... The rest of the JSX remains the same ... */}
    </div>
  );
};

export default CreateCompetition;
