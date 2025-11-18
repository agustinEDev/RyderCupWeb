import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar, Users, Trophy, MapPin, Settings,
  ArrowLeft, Save, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import HeaderAuth from '../components/layout/HeaderAuth';
import { getUserData } from '../utils/secureAuth';
import { createCompetition } from '../services/competitions';

const CreateCompetition = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    name: '',
    start_date: '',
    end_date: '',
    country_code: '',
    secondary_country_code: '',
    tertiary_country_code: '',
    max_players: '',
    handicap_type: 'OFFICIAL',
    handicap_percentage: '',
    team_assignment: 'MANUAL',
  });

  useEffect(() => {
    const userData = getUserData();
    setUser(userData);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Competition name is required';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Name must be at least 3 characters';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Name must not exceed 100 characters';
    }

    // Date validations
    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    } else {
      const startDate = new Date(formData.start_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (startDate < today) {
        newErrors.start_date = 'Start date must be in the future';
      }
    }

    if (!formData.end_date) {
      newErrors.end_date = 'End date is required';
    } else if (formData.start_date && formData.end_date) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      if (endDate < startDate) {
        newErrors.end_date = 'End date must be after start date';
      }
    }

    // Country code validation
    if (!formData.country_code.trim()) {
      newErrors.country_code = 'Primary country is required';
    } else if (formData.country_code.trim().length !== 2) {
      newErrors.country_code = 'Country code must be 2 characters (e.g., ES, FR, IT)';
    }

    // Max players validation (optional)
    if (formData.max_players && parseInt(formData.max_players) < 2) {
      newErrors.max_players = 'Maximum players must be at least 2';
    }

    // Handicap percentage validation
    if (formData.handicap_percentage) {
      const percentage = parseFloat(formData.handicap_percentage);
      if (percentage < 0 || percentage > 100) {
        newErrors.handicap_percentage = 'Percentage must be between 0 and 100';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    setIsLoading(true);

    try {
      // Prepare request data
      const requestData = {
        name: formData.name.trim(),
        start_date: formData.start_date,
        end_date: formData.end_date,
        country_code: formData.country_code.trim().toUpperCase(),
        handicap_type: formData.handicap_type,
        team_assignment: formData.team_assignment,
      };

      // Add optional fields
      if (formData.secondary_country_code?.trim()) {
        requestData.secondary_country_code = formData.secondary_country_code.trim().toUpperCase();
      }
      if (formData.tertiary_country_code?.trim()) {
        requestData.tertiary_country_code = formData.tertiary_country_code.trim().toUpperCase();
      }
      if (formData.max_players) {
        requestData.max_players = parseInt(formData.max_players);
      }
      if (formData.handicap_percentage) {
        requestData.handicap_percentage = parseFloat(formData.handicap_percentage);
      }

      const response = await createCompetition(requestData);

      toast.success('Competition created successfully!');
      navigate(`/competitions/${response.id}`);
    } catch (error) {
      console.error('Error creating competition:', error);
      toast.error(error.message || 'Failed to create competition');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/competitions');
  };

  if (!user) {
    return null;
  }

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-white">
      <div className="layout-container flex h-full grow flex-col">
        <HeaderAuth user={user} />

        <div className="px-4 md:px-40 flex flex-1 justify-center py-5">
          <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-wrap justify-between items-center gap-3 p-4"
            >
              <div>
                <p className="text-gray-900 tracking-tight text-3xl md:text-[32px] font-bold leading-tight">
                  Create Competition
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  Set up your Ryder Cup tournament
                </p>
              </div>
            </motion.div>

            {/* Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="p-4"
            >
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Trophy className="w-5 h-5 text-primary" />
                    <h3 className="text-gray-900 font-bold text-lg">Basic Information</h3>
                  </div>

                  <div className="space-y-4">
                    {/* Competition Name */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Competition Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="e.g., Europe vs USA 2025"
                        className={`w-full px-4 py-3 rounded-lg border-2 transition-all ${
                          errors.name
                            ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                            : 'border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20'
                        } outline-none`}
                        disabled={isLoading}
                      />
                      {errors.name && (
                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.name}
                        </p>
                      )}
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Start Date */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Start Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          name="start_date"
                          value={formData.start_date}
                          onChange={handleChange}
                          className={`w-full px-4 py-3 rounded-lg border-2 transition-all ${
                            errors.start_date
                              ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                              : 'border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20'
                          } outline-none`}
                          disabled={isLoading}
                        />
                        {errors.start_date && (
                          <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.start_date}
                          </p>
                        )}
                      </div>

                      {/* End Date */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          End Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          name="end_date"
                          value={formData.end_date}
                          onChange={handleChange}
                          className={`w-full px-4 py-3 rounded-lg border-2 transition-all ${
                            errors.end_date
                              ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                              : 'border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20'
                          } outline-none`}
                          disabled={isLoading}
                        />
                        {errors.end_date && (
                          <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.end_date}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="w-5 h-5 text-primary" />
                    <h3 className="text-gray-900 font-bold text-lg">Location</h3>
                  </div>

                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Specify up to 3 adjacent countries where the tournament will take place.
                      Use ISO 2-letter country codes (e.g., ES, FR, IT).
                    </p>

                    {/* Primary Country */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Primary Country Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="country_code"
                        value={formData.country_code}
                        onChange={handleChange}
                        placeholder="ES"
                        maxLength={2}
                        className={`w-full px-4 py-3 rounded-lg border-2 transition-all uppercase ${
                          errors.country_code
                            ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                            : 'border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20'
                        } outline-none`}
                        disabled={isLoading}
                      />
                      {errors.country_code && (
                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.country_code}
                        </p>
                      )}
                    </div>

                    {/* Secondary & Tertiary Countries */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Secondary Country Code (Optional)
                        </label>
                        <input
                          type="text"
                          name="secondary_country_code"
                          value={formData.secondary_country_code}
                          onChange={handleChange}
                          placeholder="FR"
                          maxLength={2}
                          className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none uppercase"
                          disabled={isLoading}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Tertiary Country Code (Optional)
                        </label>
                        <input
                          type="text"
                          name="tertiary_country_code"
                          value={formData.tertiary_country_code}
                          onChange={handleChange}
                          placeholder="IT"
                          maxLength={2}
                          className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none uppercase"
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Players & Teams */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="w-5 h-5 text-primary" />
                    <h3 className="text-gray-900 font-bold text-lg">Players & Teams</h3>
                  </div>

                  <div className="space-y-4">
                    {/* Max Players */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Maximum Players (Optional)
                      </label>
                      <input
                        type="number"
                        name="max_players"
                        value={formData.max_players}
                        onChange={handleChange}
                        placeholder="Leave empty for unlimited"
                        min="2"
                        className={`w-full px-4 py-3 rounded-lg border-2 transition-all ${
                          errors.max_players
                            ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                            : 'border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20'
                        } outline-none`}
                        disabled={isLoading}
                      />
                      {errors.max_players && (
                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.max_players}
                        </p>
                      )}
                    </div>

                    {/* Team Assignment */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Team Assignment <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="team_assignment"
                        value={formData.team_assignment}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                        disabled={isLoading}
                      >
                        <option value="MANUAL">Manual - I'll assign teams</option>
                        <option value="AUTOMATIC">Automatic - Assign by handicap</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        {formData.team_assignment === 'MANUAL'
                          ? 'You will manually assign players to teams'
                          : 'Players will be automatically assigned to balance teams by handicap'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Handicap Settings */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Settings className="w-5 h-5 text-primary" />
                    <h3 className="text-gray-900 font-bold text-lg">Handicap Settings</h3>
                  </div>

                  <div className="space-y-4">
                    {/* Handicap Type */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Handicap Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="handicap_type"
                        value={formData.handicap_type}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                        disabled={isLoading}
                      >
                        <option value="OFFICIAL">Official Handicap</option>
                        <option value="CUSTOM">Custom Handicap</option>
                        <option value="MIXED">Mixed (Official + Custom)</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        {formData.handicap_type === 'OFFICIAL' &&
                          'Use official handicaps from player profiles'}
                        {formData.handicap_type === 'CUSTOM' &&
                          'Allow custom handicaps to be set for this competition'}
                        {formData.handicap_type === 'MIXED' &&
                          'Allow both official and custom handicaps'}
                      </p>
                    </div>

                    {/* Handicap Percentage */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Handicap Percentage (Optional)
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          name="handicap_percentage"
                          value={formData.handicap_percentage}
                          onChange={handleChange}
                          placeholder="100"
                          min="0"
                          max="100"
                          step="0.1"
                          className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                            errors.handicap_percentage
                              ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                              : 'border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20'
                          } outline-none`}
                          disabled={isLoading}
                        />
                        <span className="text-gray-700 font-medium">%</span>
                      </div>
                      {errors.handicap_percentage && (
                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.handicap_percentage}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Percentage of handicap to apply (e.g., 90% for competitive play)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4">
                  <motion.button
                    type="button"
                    onClick={handleCancel}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                    disabled={isLoading}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Cancel</span>
                  </motion.button>

                  <motion.button
                    type="submit"
                    whileHover={{ scale: isLoading ? 1 : 1.02 }}
                    whileTap={{ scale: isLoading ? 1 : 0.98 }}
                    className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all shadow-md ${
                      isLoading
                        ? 'bg-gray-400 cursor-not-allowed text-white'
                        : 'bg-primary text-white hover:bg-primary/90'
                    }`}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Create Competition</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </form>
            </motion.div>

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
