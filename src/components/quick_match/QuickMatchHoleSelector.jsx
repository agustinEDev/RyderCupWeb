/**
 * Hole grid selector for quick match scoring.
 * Status reflects whether every score this screen expects for that hole is in
 * — quick match has no dual-validation concept, so there's no "mismatch"
 * state, only empty/partial/complete.
 *
 * `expectedScoreIdGroups` es UN GRUPO POR CASILLA de la pantalla, con los
 * participantes a cuyo nombre puede estar guardado ese golpe: un jugador en
 * casi todos los formatos, y los dos del BANDO en foursomes, donde la pareja
 * juega una sola bola. Contando participantes en vez de casillas, un hoyo de
 * foursomes con las dos bolas anotadas daba 2 de 4 y se quedaba en amarillo
 * para siempre; y mirando solo al titular de la tarjeta, una bola anotada a
 * nombre del compañero se veía en su casilla pero no aquí.
 */
const QuickMatchHoleSelector = ({ currentHole, onSelect, holeScores = [], expectedScoreIdGroups = [], totalHoles = 18 }) => {
  const getHoleStatus = (holeNumber) => {
    if (expectedScoreIdGroups.length === 0) return 'empty';
    const scoredCount = expectedScoreIdGroups.filter((scoreIds) =>
      // Basta con que HAYA anotación: una raya (`score` nulo) es un hoyo
      // cerrado, no uno pendiente. Exigiendo número, un hoyo recogido dejaba la
      // casilla en amarillo para siempre y la partida sin poder darse por
      // terminada de un vistazo.
      holeScores.some((hs) => hs.holeNumber === holeNumber && scoreIds.includes(hs.participantId))
    ).length;
    if (scoredCount === 0) return 'empty';
    if (scoredCount === expectedScoreIdGroups.length) return 'complete';
    return 'partial';
  };

  const statusColors = {
    empty: 'bg-gray-100 text-gray-600',
    partial: 'bg-yellow-100 text-yellow-800',
    complete: 'bg-green-100 text-green-800',
  };

  return (
    <div data-testid="quick-match-hole-selector" className="grid grid-cols-9 gap-1">
      {Array.from({ length: totalHoles }, (_, i) => i + 1).map((hole) => (
        <button
          type="button"
          key={hole}
          data-testid={`quick-match-hole-btn-${hole}`}
          onClick={() => onSelect(hole)}
          className={`w-8 h-8 rounded text-sm font-medium transition-colors
            ${hole === currentHole ? 'ring-2 ring-primary ring-offset-1' : ''}
            ${statusColors[getHoleStatus(hole)]}
          `}
        >
          {hole}
        </button>
      ))}
    </div>
  );
};

export default QuickMatchHoleSelector;
