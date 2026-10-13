import { Link } from 'react-router';
import { Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import EtiquetaDelTipo from '../competition/EtiquetaDelTipo';
import { diaCorto } from '../../utils/diaDeLaSesion';

/**
 * Una tarjeta de «Mis próximos partidos» (FE #845): un partido de la Ryder o
 * una partida de stroke play, compacta para que quepan varias a 360 px.
 *
 *   - El tipo de torneo y el nombre, que lleva a la competición.
 *   - Cuándo: «Jue 24 sept · Tarde · Fourball» en la Ryder (sin hora: la
 *     sesión no la tiene); «Lun 12 oct · 08:10 · 2.ª partida» en stroke play.
 *   - Con quién, visto desde quien mira: «Tú y Nacho vs Luna y Óscar», o
 *     «Con Bea, Cris y Dani» (sin los no presentados, que no juegan).
 *   - Un único botón, a su pantalla: «Anotar» si se puede; si no, «Ver tarjeta».
 *   - De estado, solo «En juego»: «Programado» lo es todo lo demás.
 *
 * @param {Object} props
 * @param {Object} props.partido - De `GetUpcomingMatchesUseCase` o `GetUpcomingTeeGroupsUseCase`
 * @param {boolean} props.puedeAnotar
 */
const TarjetaDeLoProximo = ({ partido, puedeAnotar }) => {
  const { t, i18n } = useTranslation('dashboard');
  const { t: tSchedule } = useTranslation('schedule');
  const lista = (nombres) => {
    // Un idioma mal escrito («es_ES») hace lanzar a `Intl`: comas, sin más
    try {
      return new Intl.ListFormat(i18n.language, { type: 'conjunction' }).format(nombres);
    } catch {
      return nombres.join(', ');
    }
  };

  const esPartida = Boolean(partido.esPartidaDeFranja);
  const cuando = [
    diaCorto(partido.roundDate, i18n.language),
    ...(esPartida
      ? [partido.teeTime, t('upcomingMatches.teeGroup', { numero: partido.matchNumber })]
      : [
          partido.sessionType && tSchedule(`sessions.${partido.sessionType}`),
          // Una sesión sin formato todavía no pinta «formats.null» (RyderCupAm#541)
          partido.matchFormat && tSchedule(`formats.${partido.matchFormat}`),
        ]),
  ].filter(Boolean);

  const companeros = partido.partnerNames ?? [];
  const conQuien = esPartida
    ? companeros.length > 0
      ? t('upcomingMatches.with', { companeros: lista(companeros) })
      : t('upcomingMatches.alone')
    : t('upcomingMatches.versus', {
        nosotros: lista([t('upcomingMatches.you'), ...companeros]),
        // Sin rivales todavía, «por decidir»: no «Tú vs » (revisión de la FE-B)
        ellos: partido.opponentNames?.length ? lista(partido.opponentNames) : t('upcomingMatches.toBeDecided'),
      });

  const destino = esPartida
    ? `/player/groups/${partido.id}/scoring?competition=${partido.competitionId}`
    : `/player/matches/${partido.id}/scoring`;

  return (
    <article
      data-testid="upcoming-match-card"
      data-id={partido.id}
      className="min-w-0 rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
    >
      <div className="flex min-w-0 items-center gap-2">
        <EtiquetaDelTipo tipo={partido.tournamentType} />
        <Link
          to={`/competitions/${partido.competitionId}`}
          className="min-w-0 truncate text-sm font-semibold text-primary hover:underline"
        >
          {partido.competitionName}
        </Link>
        {partido.status === 'IN_PROGRESS' && (
          <span className="ml-auto shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700">
            {t('upcomingMatches.inPlay')}
          </span>
        )}
      </div>

      <div className="mt-2 flex min-w-0 items-end justify-between gap-3">
        <div className="min-w-0">
          <p data-testid="cuando" className="text-xs text-gray-500">
            {cuando.join(' · ')}
          </p>
          <p data-testid="con-quien" className="mt-0.5 break-words text-sm font-medium text-gray-900">
            {conQuien}
          </p>
        </div>
        <Link
          to={destino}
          className={`inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-3 text-xs font-semibold transition-colors ${
            puedeAnotar
              ? 'bg-primary text-white hover:bg-primary/90'
              : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          {puedeAnotar && <Play className="h-3 w-3" aria-hidden="true" />}
          {t(puedeAnotar ? 'upcomingMatches.scoreMatch' : 'upcomingMatches.viewCard')}
        </Link>
      </div>
    </article>
  );
};

export default TarjetaDeLoProximo;
