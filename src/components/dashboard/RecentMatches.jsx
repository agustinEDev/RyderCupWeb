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
  // El titular es el NOMBRE: el que le puso quien creó la partida rápida, o el
  // de la competición si es de torneo. Es como uno reconoce la partida que
  // jugó, y titular con el rival dejaba el nombre sin aparecer en ningún sitio
  // (#575). Una partida rápida puede no tener nombre, y entonces el rival
  // vuelve arriba; en una vuelta en solitario no hay ni una cosa ni la otra y
  // queda el propio formato, que el subtítulo entonces no repite: decir
  // "Medal / Medal · St Andrews" no añade nada
  const name = match.matchName || match.tournamentName;
  const headline = name || opponents || formatLabel;
  // Se compara con lo que HAY, no con el texto: una partida rápida que su
  // creador llamara «Medal» daba igualdad por casualidad y se quedaba sin
  // formato en el subtítulo
  const repeatsHeadline = !name && !opponents;
  // El rival, cuando no es él quien titula. Repetirlo arriba y abajo gastaría
  // la única línea que queda para el formato, el marcador y el campo
  const opponentsLine =
    name && opponents ? t('recentMatches.versus', { opponents }) : null;
  // Los golpes y los hoyos viven aquí y no en la columna de la derecha: medido
  // en el iPhone, «85 golpes · 18 hoyos» ensanchaba esa columna a 107 px —el
  // resultado pide 31 y la fecha 33— y estrangulaba al nombre y al rival, que
  // se cortaban los dos. Abajo tiene la línea entera y es el dato que menos
  // duele truncar (#575)
  const strokesLabel =
    match.totalStrokes !== null
      ? // Sin `holesPlayed` no se dicen los hoyos. El `?? 18` de antes afirmaba
        // dieciocho sin saberlo, y «45 golpes · 18 hoyos» en una vuelta de nueve
        // parece un juegazo — es la confusión que la propia entidad documenta en
        // `isHalfRound()`. Antes vivía arrinconado a la derecha; ahora tiene una
        // línea entera, así que la mentira se lee
        match.holesPlayed !== null && match.holesPlayed !== undefined
        ? t('recentMatches.strokesOverHoles', {
            strokes: match.totalStrokes,
            count: match.holesPlayed,
          })
        : t('recentMatches.strokesOnly', { strokes: match.totalStrokes })
      : null;

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
        {/* Contra quién, en su propia línea. Medido en un móvil de 390: el
            subtítulo tiene 224 px y «vs Rivalillo, Cuarto Prueba · Foursomes ·
            Son Parc - Par 71» pide 329, así que en una sola línea las parejas
            se comían el campo. Cualquier apaño en una línea —resumir los
            rivales, quitar el campo— se vuelve a cortar en cuanto los nombres
            crecen un poco (#575) */}
        {opponentsLine && (
          <span className="block truncate text-xs text-gray-500">{opponentsLine}</span>
        )}
        {/* El formato va aquí y no como último recurso: es lo que distingue dos
            partidas contra el mismo rival, en el mismo campo y el mismo día */}
        <span className="block truncate text-xs text-gray-500">
          {[
            repeatsHeadline ? null : formatLabel,
            // El marcador solo cuando la columna de la derecha está ocupada por
            // los puntos: si no, esa columna ya lo enseña en grande, y
            // repetirlo aquí volvía a dejar el campo fuera
            match.hasResult() && match.stablefordPoints !== null ? match.score : null,
            match.golfCourseName,
          ]
            .filter(Boolean)
            .join(' · ')}
        </span>
        {/* Los golpes, en su propia línea. Puestos delante del campo se lo
            comían entero —«Stableford · 85 golpes · 18 hoyos · Axis…»— y el
            campo es lo que dice dónde jugaste; con el campo delante, los
            golpes no se veían nunca en campos de nombre largo. Aquí caben los
            dos: la línea de arriba pide 211 px de 235, y esta 120 (#575) */}
        {strokesLabel && (
          <span className="block truncate text-xs text-gray-500">{strokesLabel}</span>
        )}
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
