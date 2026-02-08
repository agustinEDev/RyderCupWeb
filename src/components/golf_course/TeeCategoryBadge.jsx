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
        return 'bg-black text-white border-black';
      case 'AMATEUR':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'SENIOR':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'FORWARD':
        return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'JUNIOR':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const colorClass = getCategoryColor(category);
  const categoryLabel = t(`form.teeCategories.${category}`, { defaultValue: category });
  const genderLabel = gender ? ` (${t(`form.teeGenders.${gender}`, { defaultValue: gender })})` : '';

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${colorClass}`}>
      {identifier && (
        <span className="font-bold">{identifier}</span>
      )}
      <span>{categoryLabel}{genderLabel}</span>
    </span>
  );
};

export default TeeCategoryBadge;
