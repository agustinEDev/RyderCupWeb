import { Link } from 'react-router';
import { ChevronRight, Loader } from 'lucide-react';
import { rutaDeAnotacion } from '../../utils/rutaDeAnotacion';

const ESTILO_DEL_RESULTADO = {
  WON: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  HALVED: 'text-gray-700 bg-gray-50 border-gray-200',
  LOST: 'text-red-700 bg-red-50 border-red-200',
};
const SIN_RESULTADO = 'text-gray-500 bg-white border-gray-200';

/**
 * Adónde lleva una partida jugada juntos; null si faltan datos para abrirla.
 *
 * Las dos la jugasteis, así que siempre se lleva a la partida y nunca al
 * perfil. La de franja (stroke play de torneo) necesita su competición para
 * leerse: sin ella no se enlaza.
 */
const rutaDePartidaJuntos = (partida) => {
  if (partida.kind === 'QUICK_MATCH') {
    return partida.quickMatchId ? `/quick-matches/${partida.quickMatchId}/scoring` : null;
  }
  if (partida.kind === 'TOURNAMENT_MATCH') {
    return partida.matchId ? rutaDeAnotacion({ id: partida.matchId }) : null;
  }
  // Un torneo stroke play entero (J): su id es el del torneo
  if (partida.kind === 'TOURNAMENT_STROKE_PLAY') {
    const torneo = partida.competitionId ?? partida.id;
    return torneo ? `/competitions/${torneo}` : null;
  }
  if (partida.kind === 'TOURNAMENT_GROUP') {
    return partida.matchId && partida.competitionId
      ? rutaDeAnotacion({
          id: partida.matchId,
          competitionId: partida.competitionId,
          esPartidaDeFranja: true,
        })
      : null;
  }
  return null;
};

/**
 * «15 oct 2026». El día llega sin hora («2026-10-15») y se lee como día local:
 * pasarlo por `new Date(texto)` lo tomaría como medianoche UTC y en América
 * caería el día anterior. `Intl` es estricto con la etiqueta de idioma, así
 * que solo se le pasan las dos que hay.
 */
const fechaDe = (dia, idioma) => {
  // Un instante (la partida rápida, H5) se pinta en su día local
  const partes = dia instanceof Date ? null : /^(\d{4})-(\d{2})-(\d{2})$/.exec(dia || '');
  if (!partes && !(dia instanceof Date)) return dia || '';
  const fecha = dia instanceof Date ? dia : new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]));
  const locale = String(idioma || '').toLowerCase().startsWith('en') ? 'en-GB' : 'es-ES';
  try {
    return fecha.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dia;
  }
};

const puestoDe = (position, tied, t) => {
  const texto = t('playerProfile:gamesTogether.position', { count: position, ordinal: true });
  return tied ? t('playerProfile:gamesTogether.tied', { position: texto }) : texto;
};

/**
 * «4.º y 7.º de 16»: el tuyo y el suyo en la general de un torneo stroke play.
 * Sin los dos puestos o sin el total no se dice nada: a medias se leería mal.
 */
const puestosDelTorneo = (partida, t) => {
  if (partida.myPosition == null || partida.theirPosition == null || !partida.totalPlayers) return null;
  return t('playerProfile:gamesTogether.positions', {
    mine: puestoDe(partida.myPosition, partida.myTied, t),
    theirs: puestoDe(partida.theirPosition, partida.theirTied, t),
    total: partida.totalPlayers,
  });
};

const FilaDePartida = ({ partida, t, idioma }) => {
  const ruta = rutaDePartidaJuntos(partida);
  const esTorneo = partida.kind === 'TOURNAMENT_STROKE_PLAY';
  // De un torneo stroke play no hay campo: el título es el torneo, y debajo,
  // los puestos de los dos
  const titulo = esTorneo
    ? partida.competitionName || t('playerProfile:gamesTogether.unknownTournament')
    : partida.golfCourseName || t('playerProfile:gamesTogether.unknownCourse');
  const subtitulo = esTorneo ? null : partida.competitionName;
  const puestos = esTorneo ? puestosDelTorneo(partida, t) : null;
  const resultado = partida.result
    ? t(`playerProfile:gamesTogether.result.${partida.result}`)
    : t('playerProfile:gamesTogether.result.none');
  const detalle = [
    fechaDe(partida.playedAt ?? partida.playedOn, idioma),
    partida.format ? t(`playerProfile:gamesTogether.format.${partida.format}`) : null,
    partida.relation ? t(`playerProfile:gamesTogether.relation.${partida.relation}`) : null,
  ].filter(Boolean);

  const contenido = (
    <>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 truncate">{titulo}</p>
        {subtitulo && <p className="text-xs text-gray-500 truncate">{subtitulo}</p>}
        {puestos && (
          <p className="text-xs text-gray-700" data-testid="player-profile-game-positions">
            {puestos}
          </p>
        )}
        <p className="text-xs text-gray-500">{detalle.join(' · ')}</p>
      </div>
      <span
        className={`shrink-0 px-2 py-0.5 text-xs font-medium border rounded-full ${
          ESTILO_DEL_RESULTADO[partida.result] || SIN_RESULTADO
        }`}
      >
        {resultado}
      </span>
      {ruta && <ChevronRight className="w-4 h-4 shrink-0 text-gray-400" aria-hidden="true" />}
    </>
  );

  const clases =
    'flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg';
  const testId = `player-profile-game-${partida.id}`;

  return ruta ? (
    <Link to={ruta} className={`${clases} hover:bg-gray-50`} data-testid={testId}>
      {contenido}
    </Link>
  ) : (
    <div className={clases} data-testid={testId}>
      {contenido}
    </div>
  );
};

/**
 * Las partidas terminadas que habéis jugado juntos, de la más reciente a la
 * más antigua (el orden lo pone el backend), de 5 en 5 con «Ver más». Sin
 * ninguna no se pinta, igual que un apartado vacío del cara a cara.
 */
const GamesTogether = ({ games, nextCursor, isLoadingMore, onLoadMore, t, idioma }) => {
  // Una página puede llegar vacía y con cursor: entonces queda «Ver más»
  const sinPartidas = !games || games.length === 0;
  if (sinPartidas && !nextCursor) return null;

  return (
    <section className="mt-4" data-testid="player-profile-games">
      <h3 className="mb-2 text-sm font-semibold text-gray-900">
        {t('playerProfile:gamesTogether.title')}
      </h3>
      <ul className="space-y-2">
        {(games ?? []).map((partida) => (
          <li key={`${partida.kind}-${partida.id}`}>
            <FilaDePartida partida={partida} t={t} idioma={idioma} />
          </li>
        ))}
      </ul>
      {nextCursor && (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={isLoadingMore}
          className="mt-3 w-full py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-60"
          data-testid="player-profile-games-more"
        >
          {isLoadingMore ? (
            <Loader className="w-4 h-4 animate-spin mx-auto" aria-hidden="true" />
          ) : (
            t('playerProfile:gamesTogether.loadMore')
          )}
        </button>
      )}
    </section>
  );
};

export default GamesTogether;
