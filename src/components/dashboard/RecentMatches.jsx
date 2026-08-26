import { useNavigate } from 'react-router';
import { Zap, Flag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import BlockLoader from '../ui/BlockLoader';

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
  const formatLabel = format ? t(`recentMatches.format.${format}`, format) : null;
  // El titular es el rival, o el torneo, o —en una vuelta en solitario— el
  // propio formato. En ese último caso el subtítulo no lo repite: decir
  // "Medal / Medal · St Andrews" no añade nada
  const headline = opponents || match.tournamentName || formatLabel;
  const repeatsHeadline = headline === formatLabel;

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
          {headline}
        </span>
        {/* El formato va aquí y no como último recurso: es lo que distingue dos
            partidas contra el mismo rival, en el mismo campo y el mismo día. El
            marcador del match play le acompaña, porque es con lo que uno cuenta
            la partida después ("le gané 3 y 2") */}
        <span className="block truncate text-xs text-gray-500">
          {[
            repeatsHeadline ? null : formatLabel,
            match.hasResult() ? match.score : null,
            match.golfCourseName,
          ]
            .filter(Boolean)
            .join(' · ')}
        </span>
        {/* La misma marca que en el historial. Sin ella, el resumen de arriba
            —que no la cuenta— y esta lista —que la enseña— se contradicen sin
            que nada lo explique: la vuelta está a la vista pero no suma. */}
        {match.excludedFromStats && (
          <span
            data-testid={`recent-match-excluded-${match.id}`}
            className="mt-1 inline-block rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-700"
          >
            {t('recentMatches.excludedBadge')}
          </span>
        )}
      </span>

      <span className="flex flex-shrink-0 flex-col items-end">
        {/* Los puntos mandan visualmente porque son lo único comparable entre
            vueltas: 36 es jugar a tu hándicap, en cualquier campo y formato */}
        {match.stablefordPoints !== null ? (
          <span className="text-base font-bold text-gray-900">
            {t('recentMatches.points', { count: match.stablefordPoints })}
          </span>
        ) : (
          match.score && (
            <span className="text-base font-bold text-gray-900">{match.score}</span>
          )
        )}
        {match.totalStrokes !== null && (
          <span className="text-[11px] text-gray-500">
            {t('recentMatches.strokesOverHoles', {
              strokes: match.totalStrokes,
              count: match.holesPlayed ?? 18,
            })}
          </span>
        )}
        <span className="text-[10px] text-gray-400">{formatDate(match.date)}</span>
      </span>
    </button>
  );
};

const RecentMatches = ({
  matches = [],
  isLoading = false,
  onCreateQuickMatch,
  titleKey = 'recentMatches.title',
  // Cuando otra espera de la misma pantalla ya se anuncia. Sin esto, un lector
  // de pantalla oye «Cargando...» dos veces seguidas sin nada que las distinga
  esperaSilenciosa = false,
}) => {
  const { t, i18n } = useTranslation('dashboard');
  const navigate = useNavigate();

  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' }) : '';

  if (isLoading) {
    return (
      <section data-testid="recent-matches" aria-busy="true">
        <h2 className="mb-3 text-xl font-bold text-gray-900">{t(titleKey)}</h2>
        {/* El dibujo compartido, no tres rectangulos grises: la aplicacion
            espera siempre con la misma imagen (FE #495). `silencioso` cuando
            acompaña a otra espera en la misma pantalla, o un lector oiria
            «Cargando...» dos veces seguidas */}
        <BlockLoader silencioso={esperaSilenciosa} />
      </section>
    );
  }

  return (
    <section data-testid="recent-matches">
      <h2 className="mb-3 text-xl font-bold text-gray-900">{t(titleKey)}</h2>

      {matches.length === 0 ? (
        <div
          data-testid="recent-matches-empty"
          className="rounded-xl border-2 border-dashed border-gray-200 p-6 text-center"
        >
          <p className="text-sm font-semibold text-gray-900">{t('recentMatches.emptyTitle')}</p>
          <p className="mt-1 text-xs text-gray-500">{t('recentMatches.emptyDescription')}</p>
          {onCreateQuickMatch && (
            <button
              type="button"
              onClick={onCreateQuickMatch}
              data-testid="recent-matches-empty-cta"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600"
            >
              <Zap className="h-4 w-4" aria-hidden="true" />
              {t('recentMatches.emptyAction')}
            </button>
          )}
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
