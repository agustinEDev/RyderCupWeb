import { useTranslation } from 'react-i18next';
import SetupModeChooser from '../SetupModeChooser';
import SelectorDeGenero from '../../profile/SelectorDeGenero';
import SoloLectura from './SoloLectura';

/**
 * Lo primero del formulario, antes de los datos: volver a elegir el tipo (al
 * crear), el aviso de que solo se cambian las fechas, el modo de una Ryder y el
 * género del organizador si le falta.
 */
const InicioDelFormulario = ({
  isEditMode,
  soloFechas,
  conEquipos,
  setupMode,
  onVolverAlTipo,
  onElegirModo,
  pideGenero,
  genero,
  onGenero,
}) => {
  const { t } = useTranslation('competitions');
  return (
    <>
      {/* Volver a elegir el tipo. Lo escrito se queda: `formData` no se
      toca al cambiar de paso, que perder el formulario por mirar
      los otros tipos es peor que no dejar mirarlos */}
      {!isEditMode && (
        <button
          type="button"
          data-testid="volver-al-tipo"
          onClick={onVolverAlTipo}
          className="self-start text-sm text-gray-600 hover:text-gray-900"
        >
          {t('create.type.back')}
        </button>
      )}

      {/* Cerrada por el plazo, solo las fechas: se dice arriba */}
      {soloFechas && (
        <p
          data-testid="solo-las-fechas"
          role="status"
          className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
        >
          {t('edit.onlyDates')}
        </p>
      )}

      {/* El modo, a la vista y no dentro de «más opciones»: decide qué
      pasos existen después, así que esconderlo sería esconder el
      resto del camino (FE #695). Al crear ya viene elegido del paso
      anterior; aquí se cambia */}
      {conEquipos && (
        <SoloLectura activa={soloFechas}>
          <div className="border border-gray-200 rounded-xl p-4">
            <SetupModeChooser value={setupMode} onSelect={onElegirModo} />
          </div>
        </SoloLectura>
      )}

      {/* El organizador juega: su género, solo si le falta (#710) */}
      {pideGenero && (
        <div className="border border-gray-200 rounded-xl p-4">
          <SelectorDeGenero value={genero} onChange={onGenero} />
        </div>
      )}
    </>
  );
};

export default InicioDelFormulario;
