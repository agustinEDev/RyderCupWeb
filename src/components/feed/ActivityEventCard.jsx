import { Link } from 'react-router';
import { nombreVisible } from '../../utils/nombreVisible';
import { useTranslation } from 'react-i18next';
import { Award, Flag, Star, TrendingDown, Trophy, Zap } from 'lucide-react';
import Avatar from '../ui/Avatar';

/**
 * Un icono por tipo de logro. Sin esto todas las entradas se ven iguales y el
 * feed se lee como una lista de texto.
 */
const EVENT_ICONS = {
  HOLE_IN_ONE: Zap,
  EAGLE_OR_BETTER: Star,
  BIRDIE: Award,
  NEW_COURSE: Flag,
  PERSONAL_BEST: TrendingDown,
  FIRST_TOURNAMENT: Trophy,
};

const EVENT_TONES = {
  HOLE_IN_ONE: 'bg-amber-100 text-amber-700',
  EAGLE_OR_BETTER: 'bg-violet-100 text-violet-700',
  BIRDIE: 'bg-emerald-100 text-emerald-700',
  NEW_COURSE: 'bg-sky-100 text-sky-700',
  PERSONAL_BEST: 'bg-rose-100 text-rose-700',
  FIRST_TOURNAMENT: 'bg-indigo-100 text-indigo-700',
};

const HALF_ROUND_HOLES = 9;

/**
 * ActivityEventCard - Una entrada del feed.
 *
 * El texto sale del tipo de evento y de `payload`, que trae lo propio de cada
 * uno: cuántos birdies y en qué hoyos, qué diferencial batió a cuál. Los
 * birdies vienen ya agrupados por vuelta desde el backend — "3 birdies" es una
 * entrada, no tres.
 *
 * `courseName` llega resuelto desde fuera, igual que `author`: el `payload` solo
 * guarda el id del campo y el nombre viaja aparte en la respuesta del feed. Es
 * opcional — un campo borrado, o un id que el backend no supo leer, deja la
 * entrada sin nombre en vez de sin pintar.
 */
const ActivityEventCard = ({ event, author, courseName }) => {
  const { t, i18n } = useTranslation(['feed', 'common']);

  const Icon = EVENT_ICONS[event.type] || Award;
  const tone = EVENT_TONES[event.type] || 'bg-gray-100 text-gray-700';
  const count = event.payload?.count ?? 1;
  const holes = event.payload?.holes ?? [];

  const nombre = nombreVisible(author);
  const titulo = t(`feed:events.${event.type}`, { count, defaultValue: event.type });

  const fecha = event.occurredAt
    ? new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short' }).format(
        event.occurredAt
      )
    : '';

  const detalles = [];
  if (holes.length > 0) {
    detalles.push(t('feed:detail.holes', { count: holes.length, holes: holes.join(', ') }));
  }
  if (event.payload?.differential && event.payload?.previous_best) {
    detalles.push(
      t('feed:detail.differential', {
        differential: event.payload.differential,
        previous: event.payload.previous_best,
      })
    );
  }
  if (event.payload?.holes_played === HALF_ROUND_HOLES) {
    detalles.push(t('feed:detail.halfRound'));
  }
  if (event.payload?.from_tournament) {
    detalles.push(t('feed:detail.fromTournament'));
  }
  // El campo va el último: es el dato que menos distingue una entrada de otra,
  // porque se repite en todos los logros de la misma vuelta
  if (courseName) {
    detalles.push(courseName);
  }

  return (
    <article
      className="flex gap-3 p-4 bg-white border border-gray-200 rounded-lg"
      data-testid={`activity-event-${event.id}`}
    >
      <Link to={`/players/${event.userId}`} className="shrink-0" aria-label={nombre}>
        <Avatar userId={event.userId} size="md" />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              to={`/players/${event.userId}`}
              className="text-sm font-semibold text-gray-900 hover:underline truncate block"
            >
              {nombre}
            </Link>
            <p className="text-sm text-gray-700">{titulo}</p>
          </div>
          <span
            className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-full ${tone}`}
            aria-hidden="true"
          >
            <Icon className="w-4 h-4" />
          </span>
        </div>

        {detalles.length > 0 && (
          <p className="mt-1 text-xs text-gray-500">{detalles.join(' · ')}</p>
        )}
        {fecha && <p className="mt-1 text-xs text-gray-400">{fecha}</p>}
      </div>
    </article>
  );
};

export default ActivityEventCard;
