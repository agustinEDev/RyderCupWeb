import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ScoreInputPanel from '../scoring/ScoreInputPanel';
import GolfFigure from '../scoring/GolfFigure';

/**
 * Hole score entry for quick matches: one score button per participant the
 * current user is responsible for (their own, plus anyone delegated to them).
 * Reuses the same numpad (ScoreInputPanel) and score bubble (GolfFigure) as
 * the tournament scoring screen — only the "own + marker" pairing from
 * HoleInput doesn't fit the delegated (1-to-N) quick match model.
 */
const QuickMatchHoleInput = ({ holeNumber, par, strokeIndex, entries, isReadOnly = false, onScoreChange }) => {
  const { t } = useTranslation('scoring');
  const [openParticipantId, setOpenParticipantId] = useState(null);

  const openEntry = entries.find((e) => e.participantId === openParticipantId) || null;

  const handleSelect = (participantId, value) => {
    setOpenParticipantId(null);
    if (onScoreChange) onScoreChange(participantId, value);
  };

  return (
    <div data-testid="quick-match-hole-input" className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-lg font-bold text-gray-900">{t('input.hole')} {holeNumber}</span>
        <span className="text-sm text-gray-500">{t('input.par')} {par}</span>
        <span className="text-sm text-gray-500">{t('input.strokeIndex')} {strokeIndex}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {entries.map((entry) => (
          <div key={entry.participantId} className="space-y-1">
            <label className="text-xs font-medium text-gray-500 truncate block">{entry.name}</label>
            {!isReadOnly ? (
              <button
                type="button"
                data-testid={`quick-match-score-button-${entry.participantId}`}
                onClick={() => setOpenParticipantId(entry.participantId)}
                className="w-full h-14 flex items-center justify-center bg-gray-100 rounded-xl hover:bg-gray-200 active:bg-gray-300 transition-colors"
              >
                <GolfFigure score={entry.score} par={par} />
              </button>
            ) : (
              <div className="w-full h-14 flex items-center justify-center">
                <GolfFigure score={entry.score} par={par} />
              </div>
            )}
          </div>
        ))}
      </div>

      {openEntry && (
        <ScoreInputPanel
          value={openEntry.score}
          onSelect={(value) => handleSelect(openEntry.participantId, value)}
          onClose={() => setOpenParticipantId(null)}
          label={openEntry.name}
          par={par}
        />
      )}
    </div>
  );
};

export default QuickMatchHoleInput;
