import { Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import StrokePlaySettings from '../StrokePlaySettings';
import { diasDelTorneo } from '../../../utils/ajustesDeStrokePlay';

/**
 * Los ajustes de un Stableford o un Medal, a la vista: las categorías y las
 * jornadas sí se deciden al crear (FE #824).
 */
const AjustesDeStrokePlayDelAlta = ({ formData, onCambio }) => {
  const { t } = useTranslation('competitions');
  return (
    <div
      data-testid="ajustes-stroke-play"
      className="border border-gray-200 rounded-xl p-4"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Settings className="w-4 h-4 text-primary" />
        </div>
        <h3 className="text-gray-900 font-bold text-base">
          {t('create.strokePlay.title', {
            tipo: t(`create.type.${formData.tournamentType}.title`),
          })}
        </h3>
      </div>
      <StrokePlaySettings
        valor={formData.strokePlay}
        onCambio={onCambio}
        tipo={formData.tournamentType}
        dias={diasDelTorneo(formData.startDate, formData.endDate)}
      />
    </div>
  );
};

export default AjustesDeStrokePlayDelAlta;
