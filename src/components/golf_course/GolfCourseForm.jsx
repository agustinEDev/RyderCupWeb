import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import customToast from '../../utils/toast';
import { fetchCountriesUseCase } from '../../composition';
import { CountryFlag } from '../../utils/countryUtils';
import { formatCountryName } from '../../services/countries';

const COURSE_TYPES = ['STANDARD_18', 'PITCH_AND_PUTT', 'EXECUTIVE'];

const TEE_CATEGORIES = [
  'CHAMPIONSHIP',
  'AMATEUR',
  'SENIOR',
  'FORWARD',
  'JUNIOR',
];

const TEE_GENDERS = [null, 'MALE', 'FEMALE'];

/**
 * GolfCourseForm Component
 * Complex form for creating/editing golf courses
 * Handles 18 holes + 2-10 tees with validations
 */
const GolfCourseForm = ({ initialData = null, onSubmit, onCancel }) => {
  const { t, i18n } = useTranslation('golfCourses');

  // Basic fields
  const [name, setName] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [courseType, setCourseType] = useState('STANDARD_18');

  // Countries data
  const [allCountries, setAllCountries] = useState([]);

  // Tees (2-10)
  const [tees, setTees] = useState([
    { teeCategory: 'CHAMPIONSHIP', teeGender: null, identifier: '', courseRating: '', slopeRating: '' },
    { teeCategory: 'AMATEUR', teeGender: null, identifier: '', courseRating: '', slopeRating: '' },
  ]);

  // Holes (18 fixed)
  const [holes, setHoles] = useState(
    Array.from({ length: 18 }, (_, i) => ({
      holeNumber: i + 1,
      par: 4,
      strokeIndex: i + 1,
    }))
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load countries on mount (only once)
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const data = await fetchCountriesUseCase.execute();
        const validCountries = Array.isArray(data)
          ? data
              .filter(c => c?.code && (c?.name_en || c?.name_es))
              .map(c => ({
                id: c.code,
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
    fetchCountries();
  }, []);

  // Load initial data if editing
  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setCountryCode(initialData.countryCode || initialData.country_code || '');
      setCourseType(initialData.courseType || initialData.course_type || 'STANDARD_18');

      if (initialData.tees && initialData.tees.length > 0) {
        setTees(initialData.tees.map(tee => ({
          teeCategory: tee.teeCategory || tee.tee_category,
          teeGender: tee.teeGender ?? tee.tee_gender ?? tee.gender ?? null,
          identifier: tee.identifier || '',
          courseRating: tee.courseRating || tee.course_rating || '',
          slopeRating: tee.slopeRating || tee.slope_rating || '',
        })));
      }

      if (initialData.holes && initialData.holes.length === 18) {
        setHoles(initialData.holes.map(hole => ({
          holeNumber: hole.holeNumber || hole.hole_number,
          par: hole.par,
          strokeIndex: hole.strokeIndex || hole.stroke_index,
        })));
      }
    }
  }, [initialData]);

  // Add tee
  const handleAddTee = () => {
    if (tees.length >= 10) {
      customToast.error(t('form.maxTeesReached'));
      return;
    }

    setTees([
      ...tees,
      { teeCategory: 'AMATEUR', teeGender: null, identifier: '', courseRating: '', slopeRating: '' },
    ]);
  };

  // Remove tee
  const handleRemoveTee = (index) => {
    if (tees.length <= 2) {
      customToast.error(t('form.minTeesRequired'));
      return;
    }

    setTees(tees.filter((_, i) => i !== index));
  };

  // Update tee field
  const handleTeeChange = (index, field, value) => {
    const updatedTees = [...tees];
    updatedTees[index][field] = value;
    setTees(updatedTees);
  };

  // Update hole field
  const handleHoleChange = (index, field, value) => {
    const updatedHoles = [...holes];
    updatedHoles[index][field] = parseInt(value, 10) || 0;
    setHoles(updatedHoles);
  };

  // Calculate total par
  const calculateTotalPar = () => {
    return holes.reduce((sum, hole) => sum + hole.par, 0);
  };

  // Validate form
  const validateForm = () => {
    if (!name || name.trim().length < 3) {
      customToast.error(t('form.errors.nameRequired'));
      return false;
    }

    if (!countryCode || countryCode.length !== 2) {
      customToast.error(t('form.errors.countryCodeRequired'));
      return false;
    }

    if (tees.length < 2 || tees.length > 10) {
      customToast.error(t('form.errors.teesRange'));
      return false;
    }

    // Validate gender mixing: cannot mix gendered and unisex tees for the same category
    const categoryGenderMap = {};
    for (const tee of tees) {
      const hasGender = tee.teeGender !== null && tee.teeGender !== '';
      if (!categoryGenderMap[tee.teeCategory]) {
        categoryGenderMap[tee.teeCategory] = { hasGendered: false, hasUnisex: false };
      }
      if (hasGender) {
        categoryGenderMap[tee.teeCategory].hasGendered = true;
      } else {
        categoryGenderMap[tee.teeCategory].hasUnisex = true;
      }
    }
    for (const cat of Object.keys(categoryGenderMap)) {
      if (categoryGenderMap[cat].hasGendered && categoryGenderMap[cat].hasUnisex) {
        customToast.error(t('form.errors.genderMixing'));
        return false;
      }
    }

    // Validate each tee
    for (let i = 0; i < tees.length; i++) {
      const tee = tees[i];
      if (!tee.identifier || tee.identifier.trim().length === 0) {
        customToast.error(t('form.errors.teeIdentifierRequired', { index: i + 1 }));
        return false;
      }

      const courseRating = parseFloat(tee.courseRating);
      if (isNaN(courseRating) || courseRating < 50 || courseRating > 90) {
        customToast.error(t('form.errors.courseRatingRange', { index: i + 1 }));
        return false;
      }

      const slopeRating = parseInt(tee.slopeRating, 10);
      if (isNaN(slopeRating) || slopeRating < 55 || slopeRating > 155) {
        customToast.error(t('form.errors.slopeRatingRange', { index: i + 1 }));
        return false;
      }
    }

    // Validate holes - check strokeIndex range first
    for (let i = 0; i < holes.length; i++) {
      const strokeIndex = parseInt(holes[i].strokeIndex, 10);
      if (isNaN(strokeIndex) || strokeIndex < 1 || strokeIndex > 18) {
        customToast.error(t('form.errors.strokeIndexRange', { index: i + 1 }));
        return false;
      }
    }

    // Validate holes - check uniqueness
    const strokeIndices = holes.map(h => h.strokeIndex);
    const uniqueIndices = new Set(strokeIndices);
    if (uniqueIndices.size !== 18) {
      customToast.error(t('form.errors.uniqueStrokeIndices'));
      return false;
    }

    const totalPar = calculateTotalPar();
    if (totalPar < 66 || totalPar > 76) {
      customToast.error(t('form.errors.totalParRange', { totalPar }));
      return false;
    }

    return true;
  };

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = {
        name: name.trim(),
        countryCode: countryCode.toUpperCase(),
        courseType,
        tees: tees.map(tee => ({
          teeCategory: tee.teeCategory,
          teeGender: tee.teeGender || null,
          identifier: tee.identifier.trim(),
          courseRating: parseFloat(tee.courseRating),
          slopeRating: parseInt(tee.slopeRating, 10),
        })),
        holes: holes.map(hole => ({
          holeNumber: hole.holeNumber,
          par: hole.par,
          strokeIndex: hole.strokeIndex,
        })),
      };

      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting form:', error);
      customToast.error(error.message || t('form.errors.submitFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalPar = calculateTotalPar();
  const parColor = totalPar < 66 || totalPar > 76 ? 'text-red-600' : 'text-green-600';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">{t('form.basicInfo')}</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Name */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('form.name')} *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('form.namePlaceholder')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              required
              minLength={3}
              maxLength={200}
            />
          </div>

          {/* Country Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('form.countryCode')} *
            </label>
            <div className="relative">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className={`w-full py-2 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary bg-white appearance-none pr-10 ${
                  countryCode ? 'pl-12' : 'pl-3'
                }`}
                required
              >
                <option value="">{t('form.selectCountry')}</option>
                {allCountries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {formatCountryName(country, i18n.language)}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              {/* Show flag if country is selected */}
              {countryCode && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <CountryFlag countryCode={countryCode} style={{ width: '24px', height: 'auto' }} />
                </div>
              )}
            </div>
          </div>

          {/* Course Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('form.courseType')} *
            </label>
            <select
              value={courseType}
              onChange={(e) => setCourseType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              required
            >
              {COURSE_TYPES.map(type => (
                <option key={type} value={type}>
                  {t(`form.courseTypes.${type}`)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tees Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">{t('form.tees')} ({tees.length}/10)</h3>
          <button
            type="button"
            onClick={handleAddTee}
            disabled={tees.length >= 10}
            className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            {t('form.addTee')}
          </button>
        </div>

        <div className="space-y-4">
          {tees.map((tee, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 border border-gray-200 rounded-lg bg-gray-50"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">
                  {t('form.tee')} {index + 1}
                </span>
                {tees.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveTee(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {/* Tee Category */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t('form.teeCategory')}
                  </label>
                  <select
                    value={tee.teeCategory}
                    onChange={(e) => handleTeeChange(index, 'teeCategory', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    required
                  >
                    {TEE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>
                        {t(`form.teeCategories.${cat}`)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tee Gender */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t('form.teeGender')}
                  </label>
                  <select
                    value={tee.teeGender || ''}
                    onChange={(e) => handleTeeChange(index, 'teeGender', e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    {TEE_GENDERS.map(g => (
                      <option key={g ?? 'none'} value={g || ''}>
                        {t(`form.teeGenders.${g ?? 'none'}`)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Identifier */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t('form.identifier')}
                  </label>
                  <input
                    type="text"
                    value={tee.identifier}
                    onChange={(e) => handleTeeChange(index, 'identifier', e.target.value)}
                    placeholder={t('form.identifierPlaceholder')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    required
                  />
                </div>

                {/* Course Rating */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t('form.courseRating')}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="50"
                    max="90"
                    value={tee.courseRating}
                    onChange={(e) => handleTeeChange(index, 'courseRating', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    required
                  />
                </div>

                {/* Slope Rating */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t('form.slopeRating')}
                  </label>
                  <input
                    type="number"
                    min="55"
                    max="155"
                    value={tee.slopeRating}
                    onChange={(e) => handleTeeChange(index, 'slopeRating', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    required
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Holes Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">{t('form.holes')}</h3>
          <div className="text-sm">
            <span className="text-gray-600">{t('form.totalPar')}: </span>
            <span className={`font-bold ${parColor}`}>{totalPar}</span>
            <span className="text-gray-500 ml-2">(66-76)</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-medium text-gray-700">{t('form.hole')}</th>
                <th className="text-left py-2 px-3 font-medium text-gray-700">{t('form.par')}</th>
                <th className="text-left py-2 px-3 font-medium text-gray-700">{t('form.strokeIndex')}</th>
              </tr>
            </thead>
            <tbody>
              {holes.map((hole, index) => (
                <tr key={hole.holeNumber} className="border-b border-gray-100">
                  <td className="py-2 px-3 font-medium">{hole.holeNumber}</td>
                  <td className="py-2 px-3">
                    <select
                      value={hole.par}
                      onChange={(e) => handleHoleChange(index, 'par', e.target.value)}
                      className="w-20 px-2 py-1 border border-gray-300 rounded"
                      required
                    >
                      <option value={3}>3</option>
                      <option value={4}>4</option>
                      <option value={5}>5</option>
                    </select>
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      min="1"
                      max="18"
                      value={hole.strokeIndex}
                      onChange={(e) => handleHoleChange(index, 'strokeIndex', e.target.value)}
                      className="w-20 px-2 py-1 border border-gray-300 rounded"
                      required
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          {t('form.cancel')}
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
        >
          {isSubmitting ? t('form.submitting') : (initialData ? t('form.update') : t('form.create'))}
        </button>
      </div>
    </form>
  );
};

export default GolfCourseForm;
