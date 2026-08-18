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
const QuickMatchHoleInput = ({ holeNumber, par, strokeIndex, meters = null, entries, isReadOnly = false, onScoreChange }) => {
  const { t } = useTranslation('scoring');
  const [openParticipantId, setOpenParticipantId] = useState(null);

  const openEntry = entries.find((e) => e.participantId === openParticipantId) || null;

  const handleSelect = (participantId, value) => {
    setOpenParticipantId(null);
    if (onScoreChange) onScoreChange(participantId, value);
  };

  return (
    <div data-testid="quick-match-hole-input" className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-lg font-bold text-gray-900 whitespace-nowrap">{t('input.hole')} {holeNumber}</span>
        <span className="text-sm text-gray-500 whitespace-nowrap">{t('input.par')} {par}</span>
        <span className="text-sm text-gray-500 whitespace-nowrap">{t('input.strokeIndex')} {strokeIndex}</span>
        {/* Los metros son de la barra, y las salidas dadas de alta a mano no
            los traen. Se ensena siempre la etiqueta con un guion en vez de
            esconder el dato: el hueco se lee como "aqui falta", que es lo que
            pasa, y no mueve el resto de la cabecera al cargar. */}
        <span className="text-sm text-gray-500 whitespace-nowrap">
          {t('input.meters')} {meters ?? '-'}
        </span>
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
