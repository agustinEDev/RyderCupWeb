import { TrendingUp, TrendingDown, Trophy, Target, Minus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Las tres cifras que responden al "¿cómo voy?" del panel.
 *
 * En móvil van a tres columnas y no a una: son datos que se leen de un vistazo
 * y en columna ocupaban tres pantallas ellos solos. De ahí la variante compacta
 * (cifras y padding menores, texto secundario oculto por debajo de `md`).
 *
 * La pareja hándicap / "juegas a" es el titular: el primero es el oficial de la
 * federación y el segundo, a qué está jugando de verdad según sus últimas
 * vueltas. Enseñar uno sin el otro pierde justamente la comparación.
 */

const StatCard = ({ icon: Icon, label, value, hint, tone, testId }) => (
  <div
    data-testid={testId}
    className={`relative overflow-hidden rounded-xl border p-3 md:p-6 ${tone.container}`}
  >
    <div className={`inline-flex rounded-lg p-1.5 md:p-2.5 shadow-sm ${tone.iconBackground}`}>
      <Icon className="h-4 w-4 md:h-5 md:w-5 text-white" aria-hidden="true" />
    </div>
    <p className={`mt-2 text-[10px] md:text-sm font-medium leading-tight ${tone.label}`}>{label}</p>
    <p className={`text-2xl md:text-4xl font-bold leading-tight ${tone.value}`}>{value}</p>
    {hint}
    <div className="pointer-events-none absolute -bottom-6 -right-6 hidden opacity-10 md:block">
      <Icon className={`h-32 w-32 ${tone.value}`} aria-hidden="true" />
    </div>
  </div>
);

const TONES = {
  handicap: {
    container: 'bg-accent-50 border-accent-200',
    iconBackground: 'bg-accent-500',
    label: 'text-amber-700',
    value: 'text-amber-800',
  },
  playing: {
    container: 'bg-green-50 border-green-200',
    iconBackground: 'bg-green-600',
    label: 'text-green-700',
    value: 'text-green-800',
  },
  tournaments: {
    container: 'bg-primary-50 border-primary-200',
    iconBackground: 'bg-primary-500',
    label: 'text-primary-600',
    value: 'text-primary-700',
  },
};

/**
 * @param {Object} props
 * @param {number|null} [props.fallbackHandicap] - Hándicap del perfil
 * @param {number} [props.fallbackTournaments] - Torneos ya cargados por la página
 *
 * Los dos fallbacks existen porque el panel **ya sabe** el hándicap y cuántos
 * torneos tiene el jugador antes de pedir las estadísticas: vienen del perfil y
 * del listado de competiciones. Si el resumen falla o el backend todavía no
 * expone el endpoint, no hay razón para tirar dos datos que ya están en la
 * mano y enseñar "--" al lado de una tarjeta de perfil que dice "Hándicap: 18".
 */
const PlayerStatsCards = ({
  stats,
  isLoading = false,
  fallbackHandicap = null,
  fallbackTournaments = 0,
}) => {
  const { t } = useTranslation('dashboard');

  const formatNumber = (value) => (value === null || value === undefined ? '--' : value.toFixed(1));

  const handicap = stats?.handicap ?? fallbackHandicap;
  const trend = stats?.handicapTrend;
  const isImproving = stats?.isImproving?.() ?? false;
  // Un cambio de exactamente cero es información, no ausencia de tendencia:
  // significa que el jugador se mantiene, y merece su propio icono
  const isSteady = trend === 0;
  const TrendIcon = isSteady ? Minus : isImproving ? TrendingDown : TrendingUp;

  return (
    <div className="grid grid-cols-3 gap-2 md:gap-4" data-testid="player-stats-cards">
      <StatCard
        testId="stat-card-handicap"
        icon={TrendingUp}
        tone={TONES.handicap}
        label={t('statistics.handicap')}
        // Sin gatear por isLoading: el hándicap del perfil ya está, y parpadear
        // de "--" a "18" cuando llegan las estadísticas es peor que enseñarlo
        // desde el principio
        value={formatNumber(handicap)}
        hint={
          trend !== null && trend !== undefined && !isLoading ? (
            <p
              data-testid="handicap-trend"
              className={`mt-0.5 flex items-center gap-0.5 text-[10px] md:text-xs font-medium ${
                isSteady ? 'text-gray-600' : isImproving ? 'text-green-700' : 'text-red-700'
              }`}
            >
              <TrendIcon className="h-3 w-3" aria-hidden="true" />
              {/* El valor absoluto, porque la flecha ya dice la dirección: un
                  "-0.4" junto a una flecha hacia abajo se lee dos veces */}
              <span>{Math.abs(trend).toFixed(1)}</span>
              <span className="sr-only">
                {isSteady
                  ? t('statistics.trendSteady')
                  : isImproving
                    ? t('statistics.trendImproving')
                    : t('statistics.trendWorsening')}
              </span>
            </p>
          ) : null
        }
      />

      <StatCard
        testId="stat-card-playing-to"
        icon={Target}
        tone={TONES.playing}
        label={t('statistics.playingTo')}
        value={isLoading ? '--' : formatNumber(stats?.estimatedIndex)}
        hint={
          <p className="mt-0.5 text-[10px] md:text-xs text-green-700">
            {stats?.hasEstimatedIndex?.()
              ? t('statistics.overRounds', { count: stats.roundsWithDifferential })
              : t('statistics.needsMoreRounds')}
          </p>
        }
      />

      <StatCard
        testId="stat-card-tournaments"
        icon={Trophy}
        tone={TONES.tournaments}
        label={t('statistics.tournaments')}
        // Mismo motivo que el hándicap: la página ya cargó las competiciones
        value={stats?.tournamentsTotal ?? fallbackTournaments}
        hint={
          <p className="mt-0.5 text-[10px] md:text-xs text-primary-600">
            {t('statistics.activeCount', { count: stats?.tournamentsActive ?? 0 })}
          </p>
        }
      />
    </div>
  );
};

export default PlayerStatsCards;
