import CampoDeLaPartida from '../scoring/CampoDeLaPartida';

/**
 * La cabecera de la anotación de partida rápida (`QuickMatchScoringPage`): el
 * nombre, el formato, el campo y si está terminada o anulada. Sin estado ni
 * efectos.
 */
const CabeceraDePartidaRapida = ({ t, quickMatch, courseName }) => (
  <div className="flex items-center justify-between gap-3 mb-4">
    {/* min-w-0: sin él, un nombre de campo largo no se recorta y la cabecera se sale */}
    <div className="min-w-0 flex-1">
      <h1 className="text-xl font-bold text-gray-900">
        {quickMatch?.name || t('scoring.matchHeader')}
      </h1>
      <p className="text-sm text-gray-500">
        {quickMatch?.name ? `${t('scoring.matchHeader')} · ` : ''}
        {(quickMatch?.matchFormat ?? quickMatch?.scoringFormat) &&
          t(
            `history.format.${quickMatch.matchFormat ?? quickMatch.scoringFormat}`,
            quickMatch.matchFormat ?? quickMatch.scoringFormat,
          )}
      </p>
      <CampoDeLaPartida nombre={courseName} />
    </div>
    {quickMatch?.isCompleted && (
      <span className="shrink-0 text-sm font-medium text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
        {t('scoring.finish.completed')}
      </span>
    )}
    {/* El resto del grupo no vio el aviso: se entera por aqui, cuando el
        sondeo traiga el estado nuevo. Sin esto su pantalla quedaba
        exactamente igual que antes de cancelarse la partida. */}
    {quickMatch?.isCancelled && (
      <span
        data-testid="quick-match-cancelled-badge"
        className="text-sm font-medium text-red-700 bg-red-100 px-2.5 py-1 rounded-full"
      >
        {t('history.status.CANCELLED')}
      </span>
    )}
  </div>
);

export default CabeceraDePartidaRapida;
