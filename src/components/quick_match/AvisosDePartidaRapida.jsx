import { claveDelAvisoDelVaciado } from '../../utils/erroresDeAnotacion';
import { loadErrorKeyFor, saveErrorKeyFor } from '../../utils/textosDePartidaRapida';

/**
 * Tres avisos de la anotación de partida rápida (`QuickMatchScoringPage`) con
 * la partida pintada: los hoyos que hay que volver a anotar, el vaciado parado
 * por el almacenamiento y el recuadro rojo de los fallos. Sin estado ni
 * efectos.
 */
const AvisosDePartidaRapida = ({
  t,
  quickMatch,
  perdidos,
  hoyosPerdidos,
  avisoDelVaciado,
  errorDeVerdad,
  saveError,
  loadError,
  refetch,
}) => (
  <>
    {perdidos?.length > 0 && (
      <div className="max-w-4xl mx-auto px-4 pt-4">
        <p
          role="alert"
          data-testid="quick-match-perdidos"
          className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm"
        >
          {/* Un anotador cubre a varios jugadores, así que el mismo hoyo
              puede perderse varias veces: sin agrupar salía «Los hoyos 7, 7,
              7, 8, 8, 8». Lo que el jugador necesita es la lista de hoyos que
              tiene que volver a anotar, cada uno una vez */}
          {t('scoring.offline.lost', {
            count: hoyosPerdidos.length,
            holes: hoyosPerdidos.join(', '),
          })}
        </p>
      </div>
    )}

    {/* El vaciado se paró porque el móvil no admite escrituras. Aparte del
        error general: ese lo limpia cada anotación que sale bien, y esto
        tiene que durar hasta que un vaciado termine bien (FE #551) */}
    {avisoDelVaciado && quickMatch && (
      <div className="max-w-4xl mx-auto px-4 pt-4">
        <p
          role="status"
          data-testid="quick-match-aviso-vaciado"
          className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
        >
          {t(claveDelAvisoDelVaciado(avisoDelVaciado))}
        </p>
      </div>
    )}

    {errorDeVerdad && quickMatch && (
      <div className="max-w-4xl mx-auto px-4 pt-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between">
          <p className="text-sm text-red-600" data-testid="quick-match-scoring-error">
            <span data-testid="quick-match-save-error">
              {saveError ? t(saveErrorKeyFor(saveError)) : t(loadErrorKeyFor(loadError))}
              {/* El hook apunta el hoyo en el error: sin decirlo, el jugador
                  lee la misma frase genérica y no sabe cuál repetir */}
              {saveError?.holeNumber != null
                && ` ${t('scoring.offline.atHole', { hole: saveError.holeNumber })}`}
            </span>
          </p>
          <button onClick={refetch} className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700">
            {t('scoring.retry')}
          </button>
        </div>
      </div>
    )}
  </>
);

export default AvisosDePartidaRapida;
