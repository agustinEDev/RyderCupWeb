import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { listGolfCoursesUseCase } from '../../composition';

/**
 * GolfCourseSearchBox Component
 *
 * Autocomplete search box for selecting golf courses filtered by country.
 * Shows only APPROVED golf courses.
 *
 * Props:
 * - countryCode: string - Country code to filter courses (required)
 * - selectedCourse: object | null - Currently selected golf course
 * - onCourseSelect: function - Callback when a course is selected
 * - onRequestNewCourse: function - Callback when "Request new course" is clicked
 */
const GolfCourseSearchBox = ({
  countryCode,
  selectedCourse,
  onCourseSelect,
  onRequestNewCourse
}) => {
  const { t } = useTranslation('golfCourses');
  const [searchQuery, setSearchQuery] = useState('');
  const [allCourses, setAllCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState(null);
  const dropdownRef = useRef(null);

  // Load golf courses when country changes
  useEffect(() => {
    const loadGolfCourses = async () => {
      if (!countryCode) {
        setAllCourses([]);
        setFilteredCourses([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Pass countryCode as filter object and only get APPROVED courses
        const courses = await listGolfCoursesUseCase.execute({
          countryCode: countryCode,
          approvalStatus: 'APPROVED'
        });
        setAllCourses(courses);
        setFilteredCourses(courses);
      } catch (err) {
        console.error('Error loading golf courses:', err);
        setError(err.message || t('searchBox.errorLoading', 'Error loading golf courses'));
        setAllCourses([]);
        setFilteredCourses([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadGolfCourses();
  }, [countryCode, t]);

  // Filter courses based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredCourses(allCourses);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = allCourses.filter(course =>
      course.name.toLowerCase().includes(query)
    );
    setFilteredCourses(filtered);
  }, [searchQuery, allCourses]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    setSearchQuery(e.target.value);
    setShowDropdown(true);
  };

  const handleCourseSelect = (course) => {
    onCourseSelect(course);
    setSearchQuery(course.name);
    setShowDropdown(false);
  };

  const handleInputFocus = () => {
    setShowDropdown(true);
  };

  const handleRequestNewCourse = () => {
    setShowDropdown(false);
    onRequestNewCourse();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={selectedCourse ? selectedCourse.name : searchQuery}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={
            !countryCode
              ? t('searchBox.selectCountryFirst', 'Select a country first...')
              : t('searchBox.searchPlaceholder', 'Search golf course...')
          }
          disabled={!countryCode || isLoading}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Dropdown */}
      {showDropdown && countryCode && !isLoading && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredCourses.length > 0 ? (
            <ul className="py-1">
              {filteredCourses.map((course) => (
                <li key={course.id}>
                  <button
                    type="button"
                    onClick={() => handleCourseSelect(course)}
                    className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors flex items-start gap-3"
                  >
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {course.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {t(`courseTypes.${course.courseType}`, course.courseType)} • {course.tees.length} {t('searchBox.tees', 'tees')}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-8 px-4 text-center">
              <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-600 mb-2">
                {t('searchBox.noCoursesFound', 'No golf courses found')}
              </p>
              <p className="text-xs text-gray-500 mb-4">
                {searchQuery
                  ? t('searchBox.tryDifferentSearch', 'Try a different search term or request a new course')
                  : t('searchBox.noCoursesInCountry', 'No approved courses in this country yet')}
              </p>
              <button
                type="button"
                onClick={handleRequestNewCourse}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
              >
                <MapPin className="w-4 h-4" />
                {t('searchBox.requestNewCourse', 'Request new golf course')}
              </button>
            </div>
          )}

          {/* Request new course button (always visible when there are results) */}
          {filteredCourses.length > 0 && (
            <div className="border-t border-gray-200 p-2">
              <button
                type="button"
                onClick={handleRequestNewCourse}
                className="w-full px-4 py-2 text-left text-sm text-primary hover:bg-primary/5 rounded-lg transition-colors font-medium"
              >
                + {t('searchBox.requestNewCourse', 'Request new golf course')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GolfCourseSearchBox;
