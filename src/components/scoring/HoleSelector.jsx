const HoleSelector = ({ currentHole, onSelect, scores = [], totalHoles = 18 }) => {

  const getHoleStatus = (holeNumber) => {
    const holeScore = scores.find(s => s.holeNumber === holeNumber);
    if (!holeScore) return 'empty';
    const hasAllMatch = holeScore.playerScores?.every(ps => ps.validationStatus === 'match');
    if (hasAllMatch) return 'validated';
    const hasMismatch = holeScore.playerScores?.some(ps => ps.validationStatus === 'mismatch');
    if (hasMismatch) return 'mismatch';
    return 'pending';
  };

  const statusColors = {
    empty: 'bg-gray-100 text-gray-600',
    pending: 'bg-yellow-100 text-yellow-800',
    validated: 'bg-green-100 text-green-800',
    mismatch: 'bg-red-100 text-red-800',
  };

  return (
    <div data-testid="hole-selector" className="grid grid-cols-9 gap-1">
      {Array.from({ length: totalHoles }, (_, i) => i + 1).map(hole => (
        <button
          key={hole}
          data-testid={`hole-btn-${hole}`}
          onClick={() => onSelect(hole)}
          className={`w-8 h-8 rounded text-sm font-medium transition-colors
            ${hole === currentHole ? 'ring-2 ring-primary ring-offset-1' : ''}
            ${statusColors[getHoleStatus(hole)] || statusColors.empty}
          `}
        >
          {hole}
        </button>
      ))}
    </div>
  );
};

export default HoleSelector;
