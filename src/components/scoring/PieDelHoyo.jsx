import { nombreDelEquipo } from '../../utils/lecturaDelPartido';

import { Winner } from '../../domain/value_objects/Winner';
/**
 * Pie de la casilla del hoyo: neto, quién ganó el hoyo y cómo va el partido.
 * Sin nada que decir, sin pie: era una franja vacía que empujaba la navegación.
 *
 * @param {{
 *   t: (clave: string, valores?: object) => string,
 *   netScore?: number | null,
 *   holeResult?: { winner?: string, standingTeam?: string | null } | null,
 *   standing?: string | null,
 *   teamAName?: string,
 *   teamBName?: string,
 * }} props
 */
const PieDelHoyo = ({
  t,
  netScore,
  holeResult,
  standing,
  teamAName,
  teamBName,
}) => {
  const conNeto = netScore !== null && netScore !== undefined;
  if (!conNeto && !holeResult && !standing) return null;

  const ganador =
    holeResult?.winner === Winner.HALVED
      ? t('input.halved')
      : (nombreDelEquipo(holeResult?.winner, teamAName, teamBName) ??
        holeResult?.winner);
  // Sin el equipo que va por delante, solo la ventaja: « 2UP» no decía quién
  // y dejaba un espacio delante (FE #1196)
  const quienVaDelante = nombreDelEquipo(
    holeResult?.standingTeam,
    teamAName,
    teamBName,
  );
  const ventaja =
    standing === 'AS'
      ? t('input.allSquare')
      : [quienVaDelante, standing].filter(Boolean).join(' ');

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
