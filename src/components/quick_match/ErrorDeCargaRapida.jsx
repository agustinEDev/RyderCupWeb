import { loadErrorKeyFor } from '../../utils/textosDePartidaRapida';

/**
 * La partida rápida no llegó a cargar (`QuickMatchScoringPage`). Sin estado ni
 * efectos.
 *
 * La misma regla que en el resto de la pantalla: quedarse sin cobertura no es
 * un error, y aquí llegaba como «ha ocurrido un error», que suena a que algo
 * se ha roto.
 */
const ErrorDeCargaRapida = ({ t, sondeoSinRespuesta, loadError, refetch }) => (
  <div className="max-w-4xl mx-auto px-4 py-6 text-center">
    <p
      className={sondeoSinRespuesta ? 'text-amber-800' : 'text-red-600'}
      data-testid="quick-match-scoring-error"
    >
      {sondeoSinRespuesta
        ? t('scoring.offline.noSeActualiza')
        : t(loadErrorKeyFor(loadError))}
    </p>
    <button
      onClick={refetch}
      className="mt-4 px-4 py-2 bg-primary text-white rounded-lg"
    >
      {t('scoring.retry')}
    </button>
  </div>
);

export default ErrorDeCargaRapida;
