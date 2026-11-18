import { Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SoloLectura from './SoloLectura';
import VisibilidadDeLaCompeticion from './VisibilidadDeLaCompeticion';
import NombreDeLaCompeticion from './NombreDeLaCompeticion';
import JuegaElOrganizador from './JuegaElOrganizador';
import FechasDeLaCompeticion from './FechasDeLaCompeticion';
import PaisesDeLaCompeticion from './PaisesDeLaCompeticion';

/**
 * Lo básico de la competición, en UNA tarjeta: nombre, fechas y país eran
 * tres, y cada una pagaba su icono y su marco. Medido a 360 px, ese adorno
 * costaba 230 px de scroll (Agustín, 19 sep). Cerrada por el plazo, todo se ve
 * pero solo se cambian las fechas.
 */
const DatosBasicos = ({
  soloFechas,
  isEditMode,
  conEquipos,
  formData,
  setFormData,
  onChange,
  errorDelNombre,
  campoDelNombre,
  errorDeLasFechas,
  avisoDeLasFechas,
  paises,
}) => {
  const { t } = useTranslation('competitions');
  return (
    <div
      data-testid="bloque-basico"
      className="border border-gray-200 rounded-xl p-4"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Trophy className="w-4 h-4 text-primary" />
        </div>
        <h3 className="text-gray-900 font-bold text-base">
          {t('create.competitionDetails')}
        </h3>
      </div>

      <div className="space-y-3">
        <SoloLectura activa={soloFechas} className="space-y-3">
          <VisibilidadDeLaCompeticion
            visibility={formData.visibility}
            onElegir={(cual) =>
              setFormData((prev) => ({
                ...prev,
                visibility: cual,
              }))
            }
          />

          <NombreDeLaCompeticion
            ref={campoDelNombre}
            valor={formData.competitionName}
            onChange={onChange}
            error={errorDelNombre}
            tournamentType={formData.tournamentType}
            conEquipos={conEquipos}
          />

          {!isEditMode && formData.tournamentType && !conEquipos && (
            <JuegaElOrganizador
              marcada={formData.organizerPlays}
              onCambio={(marcada) =>
                setFormData((prev) => ({
                  ...prev,
                  organizerPlays: marcada,
                }))
              }
            />
          )}
        </SoloLectura>

        <FechasDeLaCompeticion
          ref={avisoDeLasFechas}
          startDate={formData.startDate}
          endDate={formData.endDate}
          onChange={onChange}
          error={errorDeLasFechas}
        />

        <PaisesDeLaCompeticion
          soloFechas={soloFechas}
          formData={formData}
          {...paises}
        />
      </div>
    </div>
  );
};

export default DatosBasicos;
