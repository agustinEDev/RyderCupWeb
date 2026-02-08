import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Calendar, Trophy, MapPin, Settings, Plus, X, ChevronDown, Flag, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import HeaderAuth from '../components/layout/HeaderAuth';
import { useAuth } from '../hooks/useAuth';
import {
  createCompetitionUseCase,
  updateCompetitionUseCase,
  getCompetitionDetailUseCase,
  getCompetitionGolfCoursesUseCase,
  fetchCountriesUseCase,
  createGolfCourseRequestUseCase,
  addGolfCourseToCompetitionUseCase
} from '../composition';
import { CountryFlag } from '../utils/countryUtils';
import { formatCountryName } from '../services/countries';
import GolfCourseSearchBox from '../components/golf_course/GolfCourseSearchBox';
import GolfCourseRequestModal from '../components/golf_course/GolfCourseRequestModal';
import customToast from '../utils/toast';

const API_URL = import.meta.env.VITE_API_BASE_URL || '';

// Helper function to get message className
const getMessageClassName = (type) => {
  if (type === 'success') return 'bg-green-50 text-green-800 border border-green-200';
  if (type === 'error') return 'bg-red-50 text-red-800 border border-red-200';
  return 'bg-yellow-50 text-yellow-800 border border-yellow-200';
};

const CreateCompetition = () => {
  const navigate = useNavigate();
  const { id: competitionId } = useParams();
  const { t, i18n } = useTranslation('competitions');
  const { user, loading: isLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingCompetition, setLoadingCompetition] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Ref para cleanup del timer de navegación (prevenir memory leak)
  const navigationTimerRef = useRef(null);

  // Countries data
  const [allCountries, setAllCountries] = useState([]);
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

    // Golf Courses (array of { countryCode, course })
    golfCourses: [],

    // RyderCup Settings
    playMode: 'HANDICAP',
    numberOfPlayers: undefined,
    teamAssignment: 'manual',
    playerHandicap: 'user'
  });

  // Golf Course Request Modal
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestModalCountry, setRequestModalCountry] = useState(null);

  /**
   * Cleanup: limpiar timer de navegación al desmontar
   * Previene memory leak si el componente se desmonta antes de que se ejecute setTimeout
   */
  useEffect(() => {
    return () => {
      if (navigationTimerRef.current) {
        clearTimeout(navigationTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Fetch all countries
    fetchCountries();
  }, []);

  /**
   * Load competition data when in edit mode
   */
  useEffect(() => {
    const loadCompetitionData = async () => {
      if (!competitionId || !allCountries.length) return;

      setIsEditMode(true);
      setLoadingCompetition(true);

      try {
        // Fetch competition details
        const competition = await getCompetitionDetailUseCase.execute(competitionId);

        // Extract main country code from location
        // The mapper returns location as a string or we need to extract from countries array
        let mainCountryCode = null;
        if (competition.countries && competition.countries.length > 0) {
          // First country in array is the main country
          mainCountryCode = competition.countries[0].code;
        }

        // Find main country object from allCountries
        const mainCountry = allCountries.find(c => c.code === mainCountryCode);

        // Prepare adjacent countries (all countries except the first one)
        const adjacentCountriesArray = competition.countries?.slice(1) || [];
        const adjacentCountry1 = adjacentCountriesArray[0]?.code || '';
        const adjacentCountry2 = adjacentCountriesArray[1]?.code || '';

        // Fetch adjacent countries lists if needed
        if (mainCountryCode) {
          await fetchAdjacentCountries(mainCountryCode, 1);
        }
        if (adjacentCountry1) {
          await fetchAdjacentCountries(adjacentCountry1, 2);
        }

        // Fetch golf courses for this competition
        let golfCoursesData = [];
        try {
          const coursesResult = await getCompetitionGolfCoursesUseCase.execute(competitionId);

          // Map the result to the format expected by formData
          if (Array.isArray(coursesResult)) {
            golfCoursesData = coursesResult.map(item => ({
              countryCode: item.golf_course?.country_code || competition.main_country,
              course: {
                id: item.golf_course?.id || item.golf_course_id,
                name: item.golf_course?.name || 'Unknown',
                approvalStatus: item.golf_course?.approval_status || 'APPROVED'
              }
            }));
          }
        } catch (error) {
          console.error('Error loading golf courses:', error);
        }

        // Populate form with competition data
        // NOTE: The mapper returns camelCase, not snake_case
        const formDataToSet = {
          competitionName: competition.name || '',
          teamOneName: competition.team1Name || 'Europe',
          teamTwoName: competition.team2Name || 'USA',
          startDate: competition.startDate || '',
          endDate: competition.endDate || '',
          country: mainCountry || null,
          adjacentCountry1: adjacentCountry1,
          adjacentCountry2: adjacentCountry2,
          showAdjacentCountry1: !!adjacentCountry1,
          showAdjacentCountry2: !!adjacentCountry2,
          golfCourses: golfCoursesData,
          playMode: competition.playMode || 'HANDICAP',
          numberOfPlayers: competition.maxPlayers || undefined,
          teamAssignment: competition.teamAssignment?.toLowerCase() || 'manual',
          playerHandicap: 'user' // Default value, not stored in competition
        };

        setFormData(formDataToSet);

      } catch (error) {
        console.error('Error loading competition:', error);
        customToast.error(t('edit.errorLoading'));
        navigate('/competitions');
      } finally {
        setLoadingCompetition(false);
      }
    };

    loadCompetitionData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competitionId, allCountries]);

  const fetchCountries = async () => {
    try {
      const data = await fetchCountriesUseCase.execute();
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
    } catch (error) {
      console.error('Error fetching countries:', error);
      setAllCountries([]);
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

    if (name === 'playMode') {
      setFormData(prev => ({
        ...prev,
        playMode: value
      }));
    }
  };

  const handleCountrySelect = (country) => {
    setFormData(prev => {
      // Keep only golf courses for the main country
      const newGolfCourses = prev.golfCourses.filter(gc => gc.countryCode === country.code);

      return {
        ...prev,
        country: country,
        adjacentCountry1: '',
        adjacentCountry2: '',
        showAdjacentCountry1: false,
        showAdjacentCountry2: false,
        golfCourses: newGolfCourses
      };
    });
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
    setFormData(prev => {
      // Remove golf courses for both adjacent countries
      const newGolfCourses = prev.golfCourses.filter(
        gc => gc.countryCode !== prev.adjacentCountry1 && gc.countryCode !== prev.adjacentCountry2
      );

      return {
        ...prev,
        adjacentCountry1: '',
        adjacentCountry2: '',
        showAdjacentCountry1: false,
        showAdjacentCountry2: false,
        golfCourses: newGolfCourses
      };
    });
    setAdjacentCountries2([]);
  };

  const handleRemoveAdjacentCountry2 = () => {
    setFormData(prev => {
      // Remove golf courses for second adjacent country
      const newGolfCourses = prev.golfCourses.filter(gc => gc.countryCode !== prev.adjacentCountry2);

      return {
        ...prev,
        adjacentCountry2: '',
        showAdjacentCountry2: false,
        golfCourses: newGolfCourses
      };
    });
  };

  const handleGolfCourseSelect = (countryCode, course) => {
    setFormData(prev => ({
      ...prev,
      golfCourses: [...prev.golfCourses, { countryCode, course }]
    }));
  };

  const handleRemoveGolfCourse = (index) => {
    setFormData(prev => ({
      ...prev,
      golfCourses: prev.golfCourses.filter((_, i) => i !== index)
    }));
  };

  const handleRequestNewCourse = (countryCode) => {
    setRequestModalCountry(countryCode);
    setShowRequestModal(true);
  };

  const handleRequestModalClose = () => {
    setShowRequestModal(false);
    setRequestModalCountry(null);
  };

  const handleRequestSuccess = (createdCourse) => {
    // Auto-select the newly requested course for its country
    if (requestModalCountry) {
      setFormData(prev => ({
        ...prev,
        golfCourses: [...prev.golfCourses, { countryCode: requestModalCountry, course: createdCourse }]
      }));
    }
  };

  // Get courses for a specific country
  const getCoursesForCountry = (countryCode) => {
    return formData.golfCourses.filter(gc => gc.countryCode === countryCode);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    // UI Validation
    if (!formData.competitionName.trim()) {
      setMessage({ type: 'error', text: t('create.errors.nameRequired') });
      return;
    }

    if (!formData.teamOneName.trim() || !formData.teamTwoName.trim()) {
      setMessage({ type: 'error', text: t('create.errors.teamNamesRequired') });
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      setMessage({ type: 'error', text: t('create.errors.datesRequired') });
      return;
    }

    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      setMessage({ type: 'error', text: t('create.errors.endDateAfterStart') });
      return;
    }

    if (!formData.country) {
      setMessage({ type: 'error', text: t('create.errors.countryRequired') });
      return;
    }

    // Validate golf courses for all countries
    const selectedCountries = [formData.country?.code];
    if (formData.adjacentCountry1) selectedCountries.push(formData.adjacentCountry1);
    if (formData.adjacentCountry2) selectedCountries.push(formData.adjacentCountry2);

    // Check that each country has at least one golf course
    const missingCourses = selectedCountries.filter(code => {
      return !formData.golfCourses.some(gc => gc.countryCode === code);
    });

    if (missingCourses.length > 0) {
      const countryNames = missingCourses.map(code => {
        const country = allCountries.find(c => c.code === code) ||
                        adjacentCountries1.find(c => c.code === code) ||
                        adjacentCountries2.find(c => c.code === code);
        return formatCountryName(country, i18n.language);
      }).join(', ');
      setMessage({ type: 'error', text: t('create.errors.golfCoursesRequired', { countries: countryNames }) });
      return;
    }

    const numPlayers = Number.parseInt(formData.numberOfPlayers, 10);
    if (Number.isNaN(numPlayers) || numPlayers < 2) {
      setMessage({ type: 'error', text: t('create.errors.playersMinimum') });
      return;
    }

    if (numPlayers > 100) {
      setMessage({ type: 'error', text: t('create.errors.playersMaximum') });
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
        play_mode: formData.playMode.toUpperCase(),
        number_of_players: numPlayers,
        team_assignment: formData.teamAssignment.toUpperCase()
      };

      if (isEditMode) {
        // EDIT MODE: Update existing competition
        await updateCompetitionUseCase.execute(competitionId, payload);

        customToast.success(t('edit.success'));

        // Navigate to competition detail
        navigationTimerRef.current = setTimeout(() => {
          navigate(`/competitions/${competitionId}`);
        }, 1000);

      } else {
        // CREATE MODE: Create new competition
        // STEP 1: Create competition
        const createdCompetition = await createCompetitionUseCase.execute(payload);

        // STEP 2: Associate each golf course one by one
        let successCount = 0;
        let failedCourses = [];

        for (const gc of formData.golfCourses) {
          try {
            await addGolfCourseToCompetitionUseCase.execute(
              createdCompetition.id,
              gc.course.id
            );
            successCount++;
          } catch (courseError) {
            console.error(`Error adding golf course ${gc.course.name}:`, courseError);
            failedCourses.push(gc.course.name);
          }
        }

        // Show appropriate message based on results
        if (failedCourses.length === 0) {
          customToast.success(t('create.success'));
        } else if (successCount > 0) {
          customToast.warning(
            t('create.partialSuccess', {
              success: successCount,
              failed: failedCourses.length,
              courses: failedCourses.join(', ')
            })
          );
        } else {
          customToast.error(t('create.errorAddingCourses'));
        }

        // Navigate to competition detail
        navigationTimerRef.current = setTimeout(() => {
          navigate(`/competitions/${createdCompetition.id}`);
        }, 1500);
      }

    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} competition:`, error);
      customToast.error(error.message || t(isEditMode ? 'edit.error' : 'create.error'));
      setMessage({ type: 'error', text: error.message || t(isEditMode ? 'edit.error' : 'create.error') });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || loadingCompetition) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">{loadingCompetition ? (t('edit.loading') || 'Loading competition...') : t('common:loading')}</p>
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
                {isEditMode ? (t('edit.title') || 'Edit Competition') : t('create.title')}
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
                  <h3 className="text-gray-900 font-bold text-lg">{t('create.competitionDetails')}</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="competitionName" className="block text-sm font-medium text-gray-700 mb-1">
                      {t('create.competitionName')}
                    </label>
                    <input
                      id="competitionName"
                      type="text"
                      name="competitionName"
                      value={formData.competitionName}
                      onChange={handleInputChange}
                      placeholder={t('create.competitionNamePlaceholder')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>


                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="teamOneName" className="block text-sm font-medium text-gray-700 mb-1">
                        {t('create.teamOneName')}
                      </label>
                      <input
                        id="teamOneName"
                        type="text"
                        name="teamOneName"
                        value={formData.teamOneName}
                        onChange={handleInputChange}
                        placeholder={t('create.teamOneNamePlaceholder')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label htmlFor="teamTwoName" className="block text-sm font-medium text-gray-700 mb-1">
                        {t('create.teamTwoName')}
                      </label>
                      <input
                        id="teamTwoName"
                        type="text"
                        name="teamTwoName"
                        value={formData.teamTwoName}
                        onChange={handleInputChange}
                        placeholder={t('create.teamTwoNamePlaceholder')}
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
                  <h3 className="text-gray-900 font-bold text-lg">{t('create.schedule')}</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                      {t('create.startDate')}
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
                      {t('create.endDate')}
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
                  <h3 className="text-gray-900 font-bold text-lg">{t('create.location')}</h3>
                </div>

                <div className="space-y-4">
                  {/* Country Select */}
                  <div>
                    <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                      {t('create.country')}
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
                        <option value="">{t('create.selectCountry')}</option>
                        {allCountries.map((country) => (
                          <option key={country.code} value={country.code}>
                            {formatCountryName(country, i18n.language)}
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
                      {t('create.addAdjacentCountry')}
                    </button>
                  )}

                  {formData.showAdjacentCountry1 && (
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label htmlFor="adjacentCountry1" className="block text-sm font-medium text-gray-700 mb-1">
                          {t('create.adjacentCountry')}
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
                            <option value="">{t('create.selectAdjacentCountry')}</option>
                            {adjacentCountries1.map(country => (
                              <option key={country.id} value={country.id}>
                                {formatCountryName(country, i18n.language)}
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
                      {t('create.addThirdCountry')}
                    </button>
                  )}

                  {formData.showAdjacentCountry2 && (
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label htmlFor="adjacentCountry2" className="block text-sm font-medium text-gray-700 mb-1">
                          {t('create.thirdCountry')}
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
                            <option value="">{t('create.selectThirdCountry')}</option>
                            {adjacentCountries2
                              .filter(c => c.code !== formData.adjacentCountry1)
                              .map(country => (
                                <option key={country.id} value={country.id}>
                                  {formatCountryName(country, i18n.language)}
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

              {/* Section 4: Golf Courses - Hidden in edit mode */}
              {!isEditMode && (
              <div className="border border-gray-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <Flag className="w-5 h-5 text-green-700" />
                  </div>
                  <div>
                    <h3 className="text-gray-900 font-bold text-lg">{t('create.golfCourses')}</h3>
                    <p className="text-sm text-gray-500">{t('create.golfCoursesSubtitle')}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Main Country Golf Courses */}
                  {formData.country && (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <CountryFlag countryCode={formData.country.code} style={{ width: '24px', height: 'auto' }} />
                        <h4 className="text-base font-semibold text-gray-900">
                          {formatCountryName(formData.country, i18n.language)}
                        </h4>
                        <span className="text-xs text-gray-500">
                          ({getCoursesForCountry(formData.country.code).length} {t('create.coursesSelected')})
                        </span>
                      </div>

                      {/* List of selected courses */}
                      {getCoursesForCountry(formData.country.code).map((gc, index) => {
                        const globalIndex = formData.golfCourses.findIndex(
                          item => item.countryCode === gc.countryCode && item.course.id === gc.course.id
                        );
                        return (
                          <div key={`${gc.course.id}-${index}`} className="mb-2 p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{gc.course.name}</p>
                              {gc.course.approvalStatus === 'PENDING_APPROVAL' && (
                                <p className="text-xs text-yellow-700 mt-1 flex items-center gap-1">
                                  <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full"></span>
                                  {t('create.coursePendingApproval')}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveGolfCourse(globalIndex)}
                              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}

                      {/* Add course button/search */}
                      <div className="mt-3">
                        <GolfCourseSearchBox
                          countryCode={formData.country.code}
                          selectedCourse={null}
                          onCourseSelect={(course) => handleGolfCourseSelect(formData.country.code, course)}
                          onRequestNewCourse={() => handleRequestNewCourse(formData.country.code)}
                        />
                      </div>
                    </div>
                  )}

                  {/* Adjacent Country 1 Golf Courses */}
                  {formData.adjacentCountry1 && (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <CountryFlag countryCode={formData.adjacentCountry1} style={{ width: '24px', height: 'auto' }} />
                        <h4 className="text-base font-semibold text-gray-900">
                          {formatCountryName(
                            allCountries.find(c => c.code === formData.adjacentCountry1) || adjacentCountries1.find(c => c.code === formData.adjacentCountry1),
                            i18n.language
                          )}
                        </h4>
                        <span className="text-xs text-gray-500">
                          ({getCoursesForCountry(formData.adjacentCountry1).length} {t('create.coursesSelected')})
                        </span>
                      </div>

                      {/* List of selected courses */}
                      {getCoursesForCountry(formData.adjacentCountry1).map((gc, index) => {
                        const globalIndex = formData.golfCourses.findIndex(
                          item => item.countryCode === gc.countryCode && item.course.id === gc.course.id
                        );
                        return (
                          <div key={`${gc.course.id}-${index}`} className="mb-2 p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{gc.course.name}</p>
                              {gc.course.approvalStatus === 'PENDING_APPROVAL' && (
                                <p className="text-xs text-yellow-700 mt-1 flex items-center gap-1">
                                  <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full"></span>
                                  {t('create.coursePendingApproval')}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveGolfCourse(globalIndex)}
                              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}

                      {/* Add course button/search */}
                      <div className="mt-3">
                        <GolfCourseSearchBox
                          countryCode={formData.adjacentCountry1}
                          selectedCourse={null}
                          onCourseSelect={(course) => handleGolfCourseSelect(formData.adjacentCountry1, course)}
                          onRequestNewCourse={() => handleRequestNewCourse(formData.adjacentCountry1)}
                        />
                      </div>
                    </div>
                  )}

                  {/* Adjacent Country 2 Golf Courses */}
                  {formData.adjacentCountry2 && (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <CountryFlag countryCode={formData.adjacentCountry2} style={{ width: '24px', height: 'auto' }} />
                        <h4 className="text-base font-semibold text-gray-900">
                          {formatCountryName(
                            allCountries.find(c => c.code === formData.adjacentCountry2) || adjacentCountries2.find(c => c.code === formData.adjacentCountry2),
                            i18n.language
                          )}
                        </h4>
                        <span className="text-xs text-gray-500">
                          ({getCoursesForCountry(formData.adjacentCountry2).length} {t('create.coursesSelected')})
                        </span>
                      </div>

                      {/* List of selected courses */}
                      {getCoursesForCountry(formData.adjacentCountry2).map((gc, index) => {
                        const globalIndex = formData.golfCourses.findIndex(
                          item => item.countryCode === gc.countryCode && item.course.id === gc.course.id
                        );
                        return (
                          <div key={`${gc.course.id}-${index}`} className="mb-2 p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{gc.course.name}</p>
                              {gc.course.approvalStatus === 'PENDING_APPROVAL' && (
                                <p className="text-xs text-yellow-700 mt-1 flex items-center gap-1">
                                  <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full"></span>
                                  {t('create.coursePendingApproval')}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveGolfCourse(globalIndex)}
                              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}

                      {/* Add course button/search */}
                      <div className="mt-3">
                        <GolfCourseSearchBox
                          countryCode={formData.adjacentCountry2}
                          selectedCourse={null}
                          onCourseSelect={(course) => handleGolfCourseSelect(formData.adjacentCountry2, course)}
                          onRequestNewCourse={() => handleRequestNewCourse(formData.adjacentCountry2)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              )}

              {/* Section 5: RyderCup Settings */}
              <div className="border border-gray-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Settings className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-gray-900 font-bold text-lg">{t('create.ryderCupSettings')}</h3>
                </div>

                <div className="space-y-4">
                  {/* Play Mode */}
                  <div>
                    <label htmlFor="playMode" className="block text-sm font-medium text-gray-700 mb-1">
                      {t('create.playMode')}
                    </label>
                    <select
                      id="playMode"
                      name="playMode"
                      value={formData.playMode}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    >
                      <option value="HANDICAP">{t('create.handicap')}</option>
                      <option value="SCRATCH">{t('create.scratch')}</option>
                    </select>
                  </div>

                  {/* Number of Players */}
                  <div>
                    <label htmlFor="numberOfPlayers" className="block text-sm font-medium text-gray-700 mb-1">
                      {t('create.numberOfPlayers')}
                    </label>
                    <input
                      id="numberOfPlayers"
                      type="number"
                      name="numberOfPlayers"
                      value={formData.numberOfPlayers === undefined ? '' : formData.numberOfPlayers}
                      onChange={handleInputChange}
                      min="2"
                      max="100"
                      placeholder={t('create.numberOfPlayersPlaceholder')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  {/* Team Assignment */}
                  <div>
                    <span className="block text-sm font-medium text-gray-700 mb-2">
                      {t('create.teamAssignment')}
                    </span>
                    <div className="relative">
                      <select
                        id="teamAssignment"
                        name="teamAssignment"
                        value={formData.teamAssignment}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
                      >
                        <option value="manual">{t('create.manual')}</option>
                        <option value="automatic">{t('create.automatic')}</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    </div>
                  </div>

                  {/* Player Handicap Source */}
                  <div>
                    <span className="block text-sm font-medium text-gray-700 mb-2">
                      {t('create.playerHandicap')}
                    </span>
                    <div className="relative">
                      <select
                        id="playerHandicap"
                        name="playerHandicap"
                        value={formData.playerHandicap}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
                      >
                        <option value="custom">{t('create.customByCreator')}</option>
                        <option value="user">{t('create.userHandicap')}</option>
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
                  {t('create.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting
                    ? (isEditMode ? (t('edit.updating') || 'Updating...') : t('create.creating'))
                    : (isEditMode ? (t('edit.updateCompetition') || 'Update Competition') : t('create.createCompetition'))
                  }
                </button>
              </div>
            </form>

            {/* Footer */}
            <footer className="flex flex-col gap-6 px-5 py-10 text-center">
              <p className="text-gray-500 text-base font-normal leading-normal">
                {t('footer')}
              </p>
            </footer>
          </div>
        </div>
      </div>

      {/* Golf Course Request Modal */}
      <GolfCourseRequestModal
        isOpen={showRequestModal}
        onClose={handleRequestModalClose}
        onSuccess={handleRequestSuccess}
        countryCode={requestModalCountry}
        createGolfCourseRequestUseCase={createGolfCourseRequestUseCase}
      />
    </div>
  );
};

export default CreateCompetition;
