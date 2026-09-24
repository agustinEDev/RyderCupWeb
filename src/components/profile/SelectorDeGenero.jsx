import { useTranslation } from 'react-i18next';

/**
 * El género, para quien no lo tiene y se apunta a una competición (#710).
 *
 * Obligatorio y con su porqué al lado: sin él no se sabe desde qué barras juega.
 *
 * @param {Object} props
 * @param {string} props.value - '' mientras no se elija, MALE o FEMALE
 * @param {Function} props.onChange - Con el valor elegido
 * @param {string} [props.id='genero-para-apuntarse']
 */
const SelectorDeGenero = ({ value, onChange, id = 'genero-para-apuntarse' }) => {
  const { t } = useTranslation('profile');

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {t('edit.personalInfo.gender')}
      </label>
      <select
        id={id}
        data-testid="selector-de-genero"
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
      >
        <option value="">{t('edit.personalInfo.genderPlaceholder')}</option>
        <option value="MALE">{t('edit.personalInfo.genderOptions.MALE')}</option>
        <option value="FEMALE">{t('edit.personalInfo.genderOptions.FEMALE')}</option>
      </select>
      <p className="mt-1 text-xs text-gray-500">{t('genderForCompetitions')}</p>
    </div>
  );
};

export default SelectorDeGenero;
