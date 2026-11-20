import { useState } from 'react';
import ModalShell from '../../ui/ModalShell';
import { useBarrasDeLaCompeticion } from '../../../hooks/useBarrasDeLaCompeticion';
import {
  barrasParaElegir,
  colorHabitual,
} from '../../../utils/barraPorDefecto';

/**
 * Cambiar la barra de un inscrito (FE #1214, RyderCupAm#912): las de los
 * campos de la competición para SU género y las mixtas, y «por defecto» para
 * volver a la habitual de su género. Lo ya jugado no cambia; lo pendiente lo
 * recalcula el servidor.
 *
 * De él se sale siempre, también mientras guarda (el guardado sigue y su
 * resultado sale en un aviso).
 *
 * @param {Object} props
 * @param {Function} props.t
 * @param {string} props.competitionId
 * @param {{id: string, userName?: string, userGender?: string|null, color?: string|null}} props.inscripcion
 * @param {boolean} props.guardando
 * @param {(color: string|null) => void} props.onGuardar
 * @param {Function} props.onClose
 */
const CambiarBarraModal = ({
  t,
  competitionId,
  inscripcion,
  guardando,
  onGuardar,
  onClose,
}) => {
  const actual = inscripcion.color ?? '';
  const [elegida, setElegida] = useState(actual);
  const { barras, cargando, fallo } = useBarrasDeLaCompeticion(
    competitionId,
    true,
  );
  const genero = inscripcion.userGender ?? null;
  const colores = barrasParaElegir(barras, genero);
  const habitual = colorHabitual(genero);
  // La actual siempre se ofrece, aunque ya no esté entre las de sus campos:
  // si no, el selector la perdería sin que nadie la cambiara
  const ofrecidas =
    actual && !colores.includes(actual) ? [actual, ...colores] : colores;

  const guardar = (e) => {
    e.preventDefault();
    onGuardar(elegida || null);
  };

  return (
    <ModalShell
      isOpen
      onClose={onClose}
      labelledBy="cambiar-barra-titulo"
      busy={guardando}
    >
      <form onSubmit={guardar} className="space-y-4">
        <h2
          id="cambiar-barra-titulo"
          className="text-lg font-bold text-gray-900 break-words"
        >
          {t('detail.tee.modalTitle', { name: inscripcion.userName ?? '' })}
        </h2>
        <div>
          <label
            htmlFor="cambiar-barra"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {t('detail.tee.label')}
          </label>
          <select
            id="cambiar-barra"
            value={elegida}
            onChange={(e) => setElegida(e.target.value)}
            className="w-full min-h-11 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          >
            <option value="">
              {habitual
                ? t('detail.tee.default', {
                    color: t(`golfCourses:form.teeColors.${habitual}`),
                  })
                : t('detail.tee.defaultNoColor')}
            </option>
            {ofrecidas.map((color) => (
              <option key={color} value={color}>
                {t(`golfCourses:form.teeColors.${color}`)}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">{t('detail.tee.hint')}</p>
          {cargando && (
            <p role="status" className="mt-1 text-xs text-gray-500">
              {t('detail.tee.loading')}
            </p>
          )}
          {fallo && (
            <p
              data-testid="barras-sin-cargar"
              className="mt-1 text-xs text-amber-800"
            >
              {t('detail.tee.notLoaded')}
            </p>
          )}
          {barras !== null && colores.length === 0 && (
            <p
              data-testid="sin-barras-para-su-genero"
              className="mt-1 text-xs text-amber-800"
            >
              {t('detail.tee.noneForGender')}
            </p>
          )}
        </div>
        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200"
          >
            {t('detail.tee.close')}
          </button>
          <button
            type="submit"
            disabled={guardando || elegida === actual}
            className="min-h-11 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {t('detail.tee.save')}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

export default CambiarBarraModal;
