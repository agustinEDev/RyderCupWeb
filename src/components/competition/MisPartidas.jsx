import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { getMyTeeGroupsUseCase } from '../../composition';
import { useLaMasNueva } from '../../hooks/useLaMasNueva';
import { anotaSuTarjeta, companerosDe, esNoPresentado, juegan, seRetiro } from '../../domain/services/PartidasDeLaFranja';
import { conGenero } from '../../utils/genero';
import { nombreDeCompanero } from '../../utils/nombreDeCompanero';

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
 * @param {number|null} [props.categoria] - La suya, si salió más de una (QA del 11 oct 2026)
 */
const MisPartidas = ({ competitionId, userId, version, fecha, categoria = null }) => {
  const { t } = useTranslation('schedule');
  const [mias, setMias] = useState([]);
  const lecturas = useLaMasNueva();

  useEffect(() => {
    const turno = lecturas.turno();
    (async () => getMyTeeGroupsUseCase.execute(competitionId))()
      .then((leidas) => lecturas.aplicar(turno) && setMias(leidas))
      .catch(() => {});
  }, [competitionId, version, lecturas]);

  // Su categoría, también antes de tener partida (/code-review)
  if (mias.length === 0 && categoria == null) return null;

  return (
    <ul className="mb-3 space-y-1 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900">
      {categoria != null && (
        <li data-testid="mi-categoria" className="font-semibold">
          {t('partidas.yourCategory', { categoria })}
        </li>
      )}
      {mias.map(({ roundId, roundDate, sessionType, group }) => {
        const yo = group.players.find((p) => p.userId === userId);
        // Sin los no presentados: siguen en la partida, pero no juegan (QA 2)
        // Quien se retiró sigue, dicho: «con Bea (retirada)» (QA de la release)
        const companeros = companerosDe(group, userId).map((p) =>
          nombreDeCompanero(t, 'partidas.withdrawnPartner', { name: p.name, withdrawn: seRetiro(p), teeGender: p.teeGender })
        );
        // Solo mientras juega: retirado (/code-review) o con su tarjeta ya
        // entregada (QA de la release), ya no marca a nadie
        const marcado =
          (yo?.cardStatus ?? 'JUGANDO') !== 'JUGANDO' ? null : juegan(group).find((p) => p.userId === yo?.marksUserId);
        const datos = {
          franja: t(`sessions.${sessionType}`),
          dia: fecha(roundDate),
          numero: group.number,
          hora: group.teeTime,
        };
        // Si el no presentado soy yo: ni compañeros ni anotar (revisor, 12 oct 2026)
        if (esNoPresentado(yo)) {
          return (
            <li key={roundId} data-testid={`mi-partida-${roundId}`}>
              {t('partidas.youAreNoShow', conGenero(yo.teeGender, datos))}
            </li>
          );
        }
        // Retirado: con quién jugó y su estado, no «de momento sin compañeros» (#853)
        const retirado = yo?.cardStatus === 'RETIRADO';
        const linea = retirado
          ? companeros.length > 0
            ? t('partidas.youRetired', conGenero(yo.teeGender, { ...datos, companeros: companeros.join(', ') }))
            : t('partidas.youRetiredAlone', conGenero(yo.teeGender, datos))
          : companeros.length > 0
            ? t('partidas.mine', { ...datos, companeros: companeros.join(', ') })
            : t('partidas.mineAlone', datos);
        return (
          <li key={roundId} data-testid={`mi-partida-${roundId}`}>
            {linea}
            {marcado && <span> · {t('partidas.youMark', { jugador: marcado.name })}</span>}
            {/* Le pasaron de otra partida para que alguien no se quedara solo
                (QA del 11 oct 2026, BE #539): su hora puede haber cambiado */}
            {yo?.broughtIn && (
              <span data-testid={`traido-${roundId}`} className="block font-semibold text-amber-800">
                {t('partidas.broughtIn', { numero: group.number, hora: group.teeTime })}
              </span>
            )}
            {/* A anotarla (PR 7): antes de su hora, la pantalla dice cuándo abre */}
            <Link
              to={`/player/groups/${group.id}/scoring?competition=${competitionId}`}
              className="ml-2 inline-flex min-h-11 items-center font-semibold text-primary underline"
            >
              {t(anotaSuTarjeta(group, userId) ? 'partidas.score' : 'partidas.viewCard')}
            </Link>
          </li>
        );
      })}
    </ul>
  );
};

export default MisPartidas;
