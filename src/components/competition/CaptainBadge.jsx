import { useTranslation } from 'react-i18next';
import { Crown } from 'lucide-react';

/**
 * Marca a un inscrito como capitán o subcapitán de su equipo (FE #692).
 *
 * Con el nombre del equipo y no «A» o «B»: el organizador los bautizó, y «capitán
 * de Europa» se entiende sin saber qué equipo es cuál.
 *
 * @param {Object} props
 * @param {string} props.userId
 * @param {{teamA, teamB, viceTeamA, viceTeamB}} [props.captains]
 * @param {{a: string, b: string}} props.teamNames
 */
const CaptainBadge = ({ userId, captains, teamNames }) => {
  const { t } = useTranslation('competitions');
  if (!captains || !userId) return null;

  const papeles = [
    [captains.teamA, 'detail.captains.captainOf', teamNames.a],
    [captains.teamB, 'detail.captains.captainOf', teamNames.b],
    [captains.viceTeamA, 'detail.captains.viceCaptainOf', teamNames.a],
    [captains.viceTeamB, 'detail.captains.viceCaptainOf', teamNames.b],
  ];
  const papel = papeles.find(([id]) => id === userId);
  if (!papel) return null;
  const [, clave, equipo] = papel;

  return (
    <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium max-w-full">
      <Crown className="w-3 h-3 shrink-0" aria-hidden="true" />
      <span className="truncate min-w-0">{t(clave, { team: equipo })}</span>
    </span>
  );
};

export default CaptainBadge;
