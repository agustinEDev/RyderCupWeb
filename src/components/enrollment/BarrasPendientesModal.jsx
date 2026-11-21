import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ModalShell from '../ui/ModalShell';

/**
 * «Elige tu barra en {campo}» (barras por campo, F1): un campo que no tiene
 * su barra general, con las que se le pueden fijar. «Ahora no» pasa al
 * siguiente; «Cerrar» deja este y el resto para la ficha. De él se sale
 * siempre, salvo mientras guarda (el guardado decide qué sigue).
 *
 * @param {Object} props
 * @param {{golfCourseId: string, golfCourseName: string, options: string[]}|null} props.campo
 * @param {boolean} props.guardando
 * @param {(color: string) => void} props.onGuardar
 * @param {Function} props.onSaltar
 * @param {Function} props.onClose
 */
const BarrasPendientesModal = ({
  campo,
  guardando,
  onGuardar,
  onSaltar,
  onClose,
}) => {
  if (!campo) return null;
  return (
    <Contenido
      key={campo.golfCourseId}
      campo={campo}
      guardando={guardando}
      onGuardar={onGuardar}
      onSaltar={onSaltar}
      onClose={onClose}
    />
  );
};

const Contenido = ({ campo, guardando, onGuardar, onSaltar, onClose }) => {
  const { t } = useTranslation(['competitions', 'golfCourses']);
  const [color, setColor] = useState('');
  return (
    <ModalShell
      isOpen
      closeOnBackdrop={false}
      onClose={onClose}
      labelledBy="barra-pendiente-titulo"
      describedBy="barra-pendiente-texto"
      closeOnEscape={!guardando}
      busy={guardando}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (color && !guardando) onGuardar(color);
        }}
        className="space-y-4"
      >
        <h2
          id="barra-pendiente-titulo"
          className="text-lg font-bold text-gray-900 break-words"
        >
          {t('competitions:tees.chooseOnCourse', {
            course: campo.golfCourseName,
          })}
        </h2>
        <p id="barra-pendiente-texto" className="text-sm text-gray-600">
          {t('competitions:tees.chooseOnCourseHint')}
        </p>
        <div>
          <label
            htmlFor="barra-pendiente"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {t('competitions:tees.label')}
          </label>
          <select
            id="barra-pendiente"
            required
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-full min-h-11 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          >
            <option value="" disabled>
              {t('competitions:tees.choose')}
            </option>
            {campo.options.map((opcion) => (
              <option key={opcion} value={opcion}>
                {t(`golfCourses:form.teeColors.${opcion}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap justify-end gap-3 pt-2">
          {/* Salir sin elegir y sin saltar: lo que falte lo avisa la ficha */}
          <button
            type="button"
            disabled={guardando}
            onClick={onClose}
            className="min-h-11 px-4 py-2 text-gray-700 rounded-lg font-medium hover:bg-gray-100 disabled:opacity-50"
          >
            {t('competitions:tees.close')}
          </button>
          <button
            type="button"
            disabled={guardando}
            onClick={onSaltar}
            className="min-h-11 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50"
          >
            {t('competitions:tees.notNow')}
          </button>
          <button
            type="submit"
            disabled={!color || guardando}
            className="min-h-11 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {t('competitions:tees.save')}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

export default BarrasPendientesModal;
