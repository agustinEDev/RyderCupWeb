/**
 * Hole grid selector for quick match scoring.
 * Status reflects whether the current scorer's covered participants all
 * have a recorded score for that hole — quick match has no dual-validation
 * concept, so there's no "mismatch" state, only empty/partial/complete.
 */
const QuickMatchHoleSelector = ({ currentHole, onSelect, holeScores = [], coveredParticipantIds = [], totalHoles = 18 }) => {
  const getHoleStatus = (holeNumber) => {
    if (coveredParticipantIds.length === 0) return 'empty';
    const scoredCount = coveredParticipantIds.filter((participantId) =>
      holeScores.some((hs) => hs.holeNumber === holeNumber && hs.participantId === participantId && hs.score != null)
    ).length;
    if (scoredCount === 0) return 'empty';
    if (scoredCount === coveredParticipantIds.length) return 'complete';
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
