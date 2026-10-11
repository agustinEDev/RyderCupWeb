import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { getMyTeeGroupsUseCase } from '../../composition';
import { useLaMasNueva } from '../../hooks/useLaMasNueva';

/**
 * «Tu partida» de cada jornada, arriba de las franjas (FE #824, PR 6; caso 5,
 * decidido con Agustín el 11 oct 2026): franja, día, número, hora, compañeros y
 * a quién marca. Sin partidas no se pinta; si falla la lectura, se queda lo
 * último que se supo.
 *
 * @param {Object} props
 * @param {string} props.competitionId
 * @param {string} props.userId - Quién mira
 * @param {string|number} props.version - Cambia cuando cambian plazas o partidas
 * @param {(dia: string) => string} props.fecha - «sáb 12 oct», la de las franjas
 */
const MisPartidas = ({ competitionId, userId, version, fecha }) => {
  const { t } = useTranslation('schedule');
  const [mias, setMias] = useState([]);
  const lecturas = useLaMasNueva();

  useEffect(() => {
    const turno = lecturas.turno();
    (async () => getMyTeeGroupsUseCase.execute(competitionId))()
      .then((leidas) => lecturas.aplicar(turno) && setMias(leidas))
      .catch(() => {});
  }, [competitionId, version, lecturas]);

  if (mias.length === 0) return null;

  return (
    <ul className="mb-3 space-y-1 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900">
      {mias.map(({ roundId, roundDate, sessionType, group }) => {
        const yo = group.players.find((p) => p.userId === userId);
        const companeros = group.players.filter((p) => p.userId !== userId).map((p) => p.name);
        const marcado = group.players.find((p) => p.userId === yo?.marksUserId);
        const datos = {
          franja: t(`sessions.${sessionType}`),
          dia: fecha(roundDate),
          numero: group.number,
          hora: group.teeTime,
        };
        return (
          <li key={roundId} data-testid={`mi-partida-${roundId}`}>
            {companeros.length > 0
              ? t('partidas.mine', { ...datos, companeros: companeros.join(', ') })
              : t('partidas.mineAlone', datos)}
            {marcado && <span> · {t('partidas.youMark', { jugador: marcado.name })}</span>}
            {/* A anotarla (PR 7): antes de su hora, la pantalla dice cuándo abre */}
            <Link
              to={`/player/groups/${group.id}/scoring?competition=${competitionId}`}
              className="ml-2 inline-flex min-h-11 items-center font-semibold text-primary underline"
            >
              {t('partidas.score')}
            </Link>
          </li>
        );
      })}
    </ul>
  );
};

export default MisPartidas;
