import { useTranslation } from 'react-i18next';
import { BARRAS_GENERALES } from '../../utils/barrasGenerales';

/**
 * La barra general de una inscripción (barras por campo): obligatoria al
 * apuntarse o aceptar una invitación. Todos los colores menos OTHER; sin
 * elegir, «Elige una barra», que no se puede mandar.
 *
 * @param {Object} props
 * @param {string} props.id
 * @param {string} props.value - '' sin elegir
 * @param {(color: string) => void} props.onChange
 */
const SelectorDeBarraGeneral = ({ id, value, onChange }) => {
  const { t } = useTranslation(['competitions', 'golfCourses']);
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {t('competitions:enrollment.colorLabel')}
      </label>
      <select
        id={id}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-h-11 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
      >
        <option value="" disabled>
          {t('competitions:tees.choose')}
        </option>
        {BARRAS_GENERALES.map((color) => (
          <option key={color} value={color}>
            {t(`golfCourses:form.teeColors.${color}`)}
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs text-gray-500">
        {t('competitions:enrollment.colorHint')}
      </p>
    </div>
  );
};

export default SelectorDeBarraGeneral;
