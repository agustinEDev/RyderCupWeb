import { Link } from 'react-router';
import CampoDeLaPartida from './CampoDeLaPartida';

/**
 * La cabecera de la anotación de competición (`ScoringPage`): la vuelta al
 * calendario, el partido, su formato, su campo y el marcador. Sin estado ni
 * efectos. `t` es la del espacio `scoring` y `tSchedule` la de `schedule`.
 */
const CabeceraDelPartido = ({ t, tSchedule, scoringView, marcador, resultadoDecidido, cerradoSinJugar }) => (
  <>
    {/* Back to schedule */}
    {scoringView?.competitionId && (
      <Link
        to={`/competitions/${scoringView.competitionId}/schedule`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-3"
      >
        &larr; {t('summary.backToSchedule')}
      </Link>
    )}

    {/* Match header */}
    <div className="flex items-center justify-between gap-3 mb-4">
      {/* min-w-0: sin él, un nombre de campo largo no se recorta y la cabecera se sale */}
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-bold text-gray-900">
          {t('matchHeader', { number: scoringView?.matchNumber })}
        </h1>
        {/* El formato, traducido («Foursomes», no «FOURSOMES») */}
        <p className="text-sm text-gray-500">{scoringView?.matchFormat && tSchedule(`formats.${scoringView.matchFormat}`)}</p>
        <CampoDeLaPartida nombre={scoringView?.roundInfo?.golfCourseName} />
      </div>
      {(resultadoDecidido || cerradoSinJugar || scoringView?.matchStanding) && (
        <div className="shrink-0 text-right" data-testid="marcador-del-partido">
          <p className="text-lg font-bold text-primary">{marcador}</p>
          {scoringView?.matchStanding && (
            <p className="text-xs text-gray-500">
              {t('holesPlayed', { count: scoringView.matchStanding.holesPlayed })}
            </p>
          )}
        </div>
      )}
    </div>
  </>
);

export default CabeceraDelPartido;
