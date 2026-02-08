import { useTranslation } from 'react-i18next';

/**
 * TeeCategoryBadge Component
 * Displays tee category with appropriate color coding and optional gender suffix
 */
const TeeCategoryBadge = ({ category, identifier, gender }) => {
  const { t } = useTranslation('golfCourses');

  const getCategoryColor = (cat) => {
    switch (cat) {
      case 'CHAMPIONSHIP':
        return 'bg-white text-gray-800 border-gray-300';
      case 'AMATEUR':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'SENIOR':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'FORWARD':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'JUNIOR':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const colorClass = getCategoryColor(category);
  const label = identifier || t(`form.teeCategories.${category}`, { defaultValue: category });
  const genderSuffix = gender === 'MALE' ? ' (M)' : gender === 'FEMALE' ? ' (F)' : '';

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${colorClass}`}>
      {label}{genderSuffix}
    </span>
  );
};

export default TeeCategoryBadge;
