import { useTranslation } from 'react-i18next';
import { nombreDelEquipo } from '../../utils/lecturaDelPartido';

/**
 * Pie de la casilla del hoyo: neto, quién ganó el hoyo y cómo va el partido.
 * Sin nada que decir, sin pie: era una franja vacía que empujaba la navegación.
 *
 * @param {{
 *   netScore?: number | null,
 *   holeResult?: { winner?: string, standingTeam?: string | null } | null,
 *   standing?: string | null,
 *   teamAName?: string,
 *   teamBName?: string,
 * }} props
 */
const PieDelHoyo = ({
  netScore,
  holeResult,
  standing,
  teamAName,
  teamBName,
}) => {
  const { t } = useTranslation('scoring');
  const conNeto = netScore !== null && netScore !== undefined;
  if (!conNeto && !holeResult && !standing) return null;

  const ganador =
    holeResult?.winner === 'HALVED'
      ? t('input.halved')
      : (nombreDelEquipo(holeResult?.winner, teamAName, teamBName) ??
        holeResult?.winner);
  const ventaja =
    standing === 'AS'
      ? t('input.allSquare')
      : `${nombreDelEquipo(holeResult?.standingTeam, teamAName, teamBName) ?? ''} ${standing}`;

  return (
    <div
      data-testid="pie-del-hoyo"
      className="flex flex-wrap items-center justify-between gap-2 text-sm border-t border-gray-100 pt-3"
    >
      {conNeto && (
        <span className="text-gray-600">
          {t('input.netScore')}: <strong>{netScore}</strong>
        </span>
      )}
      {holeResult && <span className="text-gray-600">{ganador}</span>}
      {standing && <span className="font-medium text-primary">{ventaja}</span>}
    </div>
  );
};

export default PieDelHoyo;
