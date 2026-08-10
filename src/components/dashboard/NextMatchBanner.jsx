import { useNavigate } from 'react-router';
import { Calendar, Zap, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * La pieza central del panel: cuándo juego y contra quién.
 *
 * Cuando no hay nada programado **no desaparece ni se queda hueca**: se
 * convierte en la invitación a montar una partida rápida. Un hueco en mitad del
 * panel se lee como que algo ha fallado, y para la mayoría de la gente, que no
 * está metida en un torneo, ese sería el estado de siempre.
 */
const NextMatchBanner = ({ match, isLoading = false, onCreateQuickMatch }) => {
  const { t, i18n } = useTranslation('dashboard');
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div
        data-testid="next-match-banner"
        aria-busy="true"
        className="h-24 animate-pulse rounded-xl bg-gray-100"
      />
    );
  }

  if (!match) {
    return (
      <button
        type="button"
        onClick={onCreateQuickMatch}
        data-testid="next-match-empty-cta"
        className="flex w-full items-center justify-between gap-3 rounded-xl border-2 border-primary-200 bg-gradient-to-r from-primary-50 to-blue-50 p-5 text-left shadow-sm transition-shadow hover:shadow-md"
      >
        <span className="flex items-center gap-3">
          <span className="rounded-lg bg-primary-500 p-2">
            <Zap className="h-5 w-5 text-white" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-sm font-bold text-primary-900">
              {t('nextMatch.emptyTitle')}
            </span>
            <span className="block text-xs text-primary-700">{t('nextMatch.emptyDescription')}</span>
          </span>
        </span>
        <span className="flex-shrink-0 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-semibold text-white">
          {t('nextMatch.emptyAction')}
        </span>
      </button>
    );
  }

  const when = match.roundDate
    ? new Date(match.roundDate).toLocaleDateString(i18n.language, {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
      })
    : null;
  const session = match.sessionType ? t(`nextMatch.session.${match.sessionType}`) : null;
  const opponents = (match.opponentNames || []).join(', ');
  const partners = (match.partnerNames || []).join(', ');

  return (
    <button
      type="button"
      onClick={() => navigate(`/player/matches/${match.id}/scoring`)}
      data-testid="next-match-banner"
      className="flex w-full items-center gap-3 rounded-xl border-2 border-accent-200 bg-accent-50 p-4 text-left shadow-sm transition-shadow hover:shadow-md md:p-5"
    >
      <span className="hidden flex-shrink-0 rounded-lg bg-accent-500 p-2 md:block">
        <Calendar className="h-5 w-5 text-white" aria-hidden="true" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold uppercase tracking-wide text-amber-700">
          {t('nextMatch.label')}
        </span>
        <span className="block truncate text-base font-bold text-gray-900">
          {[match.matchFormat && t(`nextMatch.format.${match.matchFormat}`), match.competitionName]
            .filter(Boolean)
            .join(' · ')}
        </span>
        {(when || session) && (
          <span className="block truncate text-xs text-amber-800">
            {[when, session, match.golfCourseName].filter(Boolean).join(' · ')}
          </span>
        )}
        {opponents && (
          <span className="mt-0.5 block truncate text-xs text-gray-600">
            {t('nextMatch.versus', { opponents })}
            {partners ? ` · ${t('nextMatch.withPartners', { partners })}` : ''}
          </span>
        )}
      </span>

      <span className="flex flex-shrink-0 items-center gap-1 rounded-lg bg-accent-500 px-3 py-1.5 text-xs font-semibold text-white">
        {t('nextMatch.view')}
        <ChevronRight className="h-3 w-3" aria-hidden="true" />
      </span>
    </button>
  );
};

export default NextMatchBanner;
