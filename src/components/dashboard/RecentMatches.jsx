import { useNavigate } from 'react-router';
import { Zap, Flag } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Las últimas partidas del jugador: la respuesta a "¿cómo quedó lo último?".
 *
 * Mezcla torneo y partidas rápidas, que es como se juega en realidad. La fila
 * intenta decir de un vistazo qué pasó: cómo acabó, contra quién, dónde y
 * cuándo, y con qué marcador.
 */

const RESULT_TONES = {
  WON: 'bg-green-100 text-green-700',
  LOST: 'bg-red-100 text-red-700',
  HALVED: 'bg-gray-100 text-gray-700',
};

const MatchRow = ({ match, onOpen, t, formatDate }) => {
  const opponents = match.opponents.join(', ');
  const format = match.matchFormat || match.scoringFormat;

  return (
    <button
      type="button"
      onClick={() => onOpen(match)}
      data-testid={`recent-match-${match.id}`}
      className="flex w-full items-center gap-3 border-b border-gray-100 px-1 py-3 text-left last:border-b-0 hover:bg-gray-50"
    >
      {match.hasResult() ? (
        <span
          data-testid="result-badge"
          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            RESULT_TONES[match.result] ?? RESULT_TONES.HALVED
          }`}
        >
          {t(`recentMatches.resultShort.${match.result}`)}
          <span className="sr-only">{t(`recentMatches.result.${match.result}`)}</span>
        </span>
      ) : (
        // Medal y Stableford no se ganan a nadie: no hay resultado que marcar
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
          <Flag className="h-4 w-4 text-gray-500" aria-hidden="true" />
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-gray-900">
          {opponents || match.tournamentName || t(`recentMatches.format.${format}`, format)}
        </span>
        <span className="block truncate text-xs text-gray-500">
          {[match.golfCourseName, formatDate(match.date)].filter(Boolean).join(' · ')}
        </span>
      </span>

      {(match.score || match.stablefordPoints !== null) && (
        <span className="flex-shrink-0 text-sm font-bold text-gray-900">
          {match.stablefordPoints !== null
            ? t('recentMatches.points', { count: match.stablefordPoints })
            : match.score}
        </span>
      )}
    </button>
  );
};

const RecentMatches = ({ matches = [], isLoading = false, onCreateQuickMatch }) => {
  const { t, i18n } = useTranslation('dashboard');
  const navigate = useNavigate();

  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' }) : '';

  if (isLoading) {
    return (
      <section data-testid="recent-matches" aria-busy="true">
        <h2 className="mb-3 text-xl font-bold text-gray-900">{t('recentMatches.title')}</h2>
        <div className="space-y-2">
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-14 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section data-testid="recent-matches">
      <h2 className="mb-3 text-xl font-bold text-gray-900">{t('recentMatches.title')}</h2>

      {matches.length === 0 ? (
        <div
          data-testid="recent-matches-empty"
          className="rounded-xl border-2 border-dashed border-gray-200 p-6 text-center"
        >
          <p className="text-sm font-semibold text-gray-900">{t('recentMatches.emptyTitle')}</p>
          <p className="mt-1 text-xs text-gray-500">{t('recentMatches.emptyDescription')}</p>
          <button
            type="button"
            onClick={onCreateQuickMatch}
            data-testid="recent-matches-empty-cta"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600"
          >
            <Zap className="h-4 w-4" aria-hidden="true" />
            {t('recentMatches.emptyAction')}
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 px-3">
          {matches.map((match) => (
            <MatchRow
              key={match.id}
              match={match}
              onOpen={(target) => navigate(target.detailPath)}
              t={t}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default RecentMatches;
