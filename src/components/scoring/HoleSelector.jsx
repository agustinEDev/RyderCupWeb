import { useTranslation } from 'react-i18next';

/**
 * @param {number[]} [props.noGuardados] Hoyos que no se pudieron guardar
 *   (FE #622): llevan un punto rojo para encontrarlos después de seguir
 *   adelante. Punto y no fondo: el fondo rojo ya dice «desacuerdo». Dentro del
 *   botón y no asomando: el último de cada fila llega al borde a 360 px, y en
 *   el móvil no puede haber scroll lateral
 */
const HoleSelector = ({ currentHole, onSelect, scores = [], totalHoles = 18, noGuardados = [] }) => {
  const { t } = useTranslation('scoring');

  const getHoleStatus = (holeNumber) => {
    const holeScore = scores.find(s => s.holeNumber === holeNumber);
    if (!holeScore) return 'empty';
    const hasPlayers = Array.isArray(holeScore.playerScores) && holeScore.playerScores.length > 0;
    if (!hasPlayers) return 'pending';
    const hasAllMatch = holeScore.playerScores.every(ps => ps.validationStatus === 'match');
    if (hasAllMatch) return 'validated';
    const hasMismatch = holeScore.playerScores.some(ps => ps.validationStatus === 'mismatch');
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
          type="button"
          key={hole}
          data-testid={`hole-btn-${hole}`}
          onClick={() => onSelect(hole)}
          className={`relative w-8 h-8 rounded text-sm font-medium transition-colors
            ${hole === currentHole ? 'ring-2 ring-primary ring-offset-1' : ''}
            ${statusColors[getHoleStatus(hole)] || statusColors.empty}
          `}
        >
          {hole}
          {noGuardados.includes(hole) && (
            <>
              <span
                data-testid={`no-guardado-${hole}`}
                aria-hidden="true"
                className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-red-600 ring-1 ring-white"
              />
              <span className="sr-only">{`, ${t('holeSelector.noGuardado')}`}</span>
            </>
          )}
        </button>
      ))}
    </div>
  );
};

export default HoleSelector;
