import { useTranslation } from 'react-i18next';

/**
 * Lo que se acepta si nadie abre «Más opciones» (FE #637). No puede prometer
 * lo que el envío va a rechazar: si algo de dentro no vale, lo dice.
 */
const ResumenDeLasOpciones = ({ faltaAlgo, conEquipos, formData }) => {
  const { t } = useTranslation('competitions');
  return (
    <p
      data-testid="resumen-opciones"
      className="px-4 pb-4 text-sm text-gray-600"
    >
      {faltaAlgo
        ? t('create.moreOptionsIncomplete')
        : // Sin el reparto de equipos: ya no se decide aquí, lo
          // decide el modo, que está a la vista arriba (FE #695)
          t(
            conEquipos
              ? 'create.moreOptionsSummary'
              : 'create.moreOptionsSummaryNoTeams',
            {
              equipo1: formData.teamOneName,
              equipo2: formData.teamTwoName,
              handicap: formData.maxPlayingHandicap
                ? t('create.summaryHandicapLimit', {
                    limite: formData.maxPlayingHandicap,
                  })
                : t('create.summaryNoHandicapLimit'),
            },
          )}
    </p>
  );
};

export default ResumenDeLasOpciones;
