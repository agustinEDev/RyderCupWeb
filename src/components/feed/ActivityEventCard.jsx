import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Award,
  CalendarCheck,
  Clock,
  Flag,
  Mail,
  Medal,
  Star,
  Swords,
  TrendingDown,
  TrendingUp,
  Trophy,
  UserPlus,
  XCircle,
  Zap,
} from 'lucide-react';
import Avatar from '../ui/Avatar';
import { rutaDeAnotacion } from '../../utils/rutaDeAnotacion';
import { conJugador, rutaEnSuFila } from '../../utils/rutasDeUnAmigo';
import FraseDeActividad, { NombreDePersona } from './FraseDeActividad';
import {
  diaDeLaVuelta,
  fechasDelTorneo,
  fraseCon,
  fraseDeTexto,
  horaDeLaTarjeta,
  horaDeSalida,
  invitadoDe,
  personaDe,
  unaTrasOtra,
} from './textosDeActividad';
import NombrePequeno from '../ui/NombrePequeno';
import { MatchOutcome } from '../../domain/value_objects/MatchOutcome';
import { ScoringFormat } from '../../domain/value_objects/ScoringFormat';
import { Team } from '../../domain/value_objects/Team';
import { TournamentType } from '../../domain/value_objects/TournamentType';
import { ActivityEventType } from '../../domain/value_objects/ActivityEventType';

/**
 * Un icono por tipo. Sin esto todas las entradas se ven iguales y el feed se
 * lee como una lista de texto.
 */
const ICONOS = {
  [ActivityEventType.HOLE_IN_ONE]: Zap,
  [ActivityEventType.EAGLE_OR_BETTER]: Star,
  [ActivityEventType.BIRDIE]: Award,
  [ActivityEventType.NEW_COURSE]: Flag,
  [ActivityEventType.PERSONAL_BEST]: TrendingDown,
  [ActivityEventType.FIRST_TOURNAMENT]: Trophy,
  [ActivityEventType.ENROLLMENT_APPROVED]: CalendarCheck,
  [ActivityEventType.ENROLLMENT_CONFIRMED]: CalendarCheck,
  [ActivityEventType.TEE_TIME_ASSIGNED]: Clock,
  [ActivityEventType.INVITED_TO_TOURNAMENT]: Mail,
  [ActivityEventType.ENROLLMENT_REQUEST_CLOSED]: XCircle,
  [ActivityEventType.ENROLLMENT_REJECTED]: XCircle,
  [ActivityEventType.ENROLLMENT_REMOVED]: XCircle,
  [ActivityEventType.PLAYER_JOINED]: UserPlus,
  [ActivityEventType.PLACE_FROM_WAITING_LIST]: CalendarCheck,
  [ActivityEventType.ENROLLMENT_NO_PLACE]: XCircle,
  [ActivityEventType.TEE_WINDOW_REMOVED]: XCircle,
  [ActivityEventType.TEAMS_CHANGED]: Mail,
  [ActivityEventType.ENROLLED_IN_TOURNAMENT]: UserPlus,
  [ActivityEventType.TOURNAMENT_MATCH_RESULT]: Swords,
  [ActivityEventType.TOURNAMENT_FINAL_STANDING]: Medal,
  [ActivityEventType.QUICK_MATCH_FINISHED]: Flag,
  [ActivityEventType.HANDICAPS_NOT_UPDATED]: TrendingUp,
  [ActivityEventType.RFEG_HANDICAP_NOT_FOUND]: TrendingUp,
  [ActivityEventType.ENROLLMENTS_CLOSED]: CalendarCheck,
  [ActivityEventType.ENROLLMENT_CLOSE_BLOCKED]: AlertTriangle,
  [ActivityEventType.INVITATION_ACCEPTABLE_AGAIN]: Mail,
  [ActivityEventType.TEAMS_UNDONE_BY_ENTRY]: UserPlus,
};

const TONOS = {
  [ActivityEventType.HOLE_IN_ONE]: 'bg-amber-100 text-amber-700',
  [ActivityEventType.EAGLE_OR_BETTER]: 'bg-violet-100 text-violet-700',
  [ActivityEventType.BIRDIE]: 'bg-emerald-100 text-emerald-700',
  [ActivityEventType.NEW_COURSE]: 'bg-sky-100 text-sky-700',
  [ActivityEventType.PERSONAL_BEST]: 'bg-rose-100 text-rose-700',
  [ActivityEventType.FIRST_TOURNAMENT]: 'bg-indigo-100 text-indigo-700',
  [ActivityEventType.ENROLLMENT_APPROVED]: 'bg-emerald-100 text-emerald-700',
  [ActivityEventType.ENROLLMENT_CONFIRMED]: 'bg-emerald-100 text-emerald-700',
  [ActivityEventType.TEE_TIME_ASSIGNED]: 'bg-sky-100 text-sky-700',
  [ActivityEventType.INVITED_TO_TOURNAMENT]: 'bg-sky-100 text-sky-700',
  [ActivityEventType.ENROLLMENT_REQUEST_CLOSED]: 'bg-gray-100 text-gray-600',
  [ActivityEventType.ENROLLMENT_REJECTED]: 'bg-gray-100 text-gray-600',
  [ActivityEventType.ENROLLMENT_REMOVED]: 'bg-gray-100 text-gray-600',
  [ActivityEventType.PLAYER_JOINED]: 'bg-emerald-100 text-emerald-700',
  [ActivityEventType.PLACE_FROM_WAITING_LIST]:
    'bg-emerald-100 text-emerald-700',
  [ActivityEventType.ENROLLMENT_NO_PLACE]: 'bg-gray-100 text-gray-600',
  [ActivityEventType.TEE_WINDOW_REMOVED]: 'bg-gray-100 text-gray-600',
  [ActivityEventType.TEAMS_CHANGED]: 'bg-sky-100 text-sky-700',
  [ActivityEventType.TOURNAMENT_MATCH_RESULT]: 'bg-indigo-100 text-indigo-700',
  [ActivityEventType.TOURNAMENT_FINAL_STANDING]: 'bg-amber-100 text-amber-700',
  [ActivityEventType.QUICK_MATCH_FINISHED]: 'bg-primary-100 text-primary-700',
  [ActivityEventType.HANDICAPS_NOT_UPDATED]: 'bg-amber-100 text-amber-700',
  [ActivityEventType.RFEG_HANDICAP_NOT_FOUND]: 'bg-amber-100 text-amber-700',
  [ActivityEventType.ENROLLMENTS_CLOSED]: 'bg-sky-100 text-sky-700',
  [ActivityEventType.ENROLLMENT_CLOSE_BLOCKED]: 'bg-red-100 text-red-700',
  [ActivityEventType.INVITATION_ACCEPTABLE_AGAIN]: 'bg-sky-100 text-sky-700',
  [ActivityEventType.TEAMS_UNDONE_BY_ENTRY]: 'bg-amber-100 text-amber-700',
};

const LOGROS = new Set([
  ActivityEventType.HOLE_IN_ONE,
  ActivityEventType.EAGLE_OR_BETTER,
  ActivityEventType.BIRDIE,
  ActivityEventType.NEW_COURSE,
  ActivityEventType.PERSONAL_BEST,
  ActivityEventType.FIRST_TOURNAMENT,
]);

const AVISOS_DE_INSCRIPCION = new Set([
  ActivityEventType.ENROLLMENT_APPROVED,
  ActivityEventType.ENROLLMENT_CONFIRMED,
  ActivityEventType.INVITED_TO_TOURNAMENT,
  ActivityEventType.ENROLLMENT_REQUEST_CLOSED,
  ActivityEventType.ENROLLMENT_REJECTED,
  ActivityEventType.ENROLLMENT_REMOVED,
]);

// Los de la inscripción directa y los equipos que cambian (release social 3)
const AVISOS_DE_LA_ESPERA = new Set([
  ActivityEventType.PLAYER_JOINED,
  ActivityEventType.PLACE_FROM_WAITING_LIST,
  ActivityEventType.ENROLLMENT_NO_PLACE,
  ActivityEventType.TEE_WINDOW_REMOVED,
  ActivityEventType.TEAMS_CHANGED,
]);

/**
 * La frase de un aviso de la inscripción directa: quién se apuntó (al
 * organizador), la plaza que dio la espera, la que no hubo, la franja que se
 * quitó y los equipos que cambiaron. La hora es la primera salida de la franja.
 */
const fraseDeLaEspera = (tipo, payload, t, { ahora, idioma } = {}) => {
  const competition = nombreDelTorneo(payload, t);
  const hora = horaDeSalida(payload.tee_time);
  // Con el día, si viene: para saber cuál de las de esa hora (code-review)
  const dia =
    hora && payload.round_date
      ? diaDeLaVuelta(payload.round_date, ahora ?? new Date(), idioma)
      : '';
  const time = dia ? `${hora} (${dia})` : hora;
  if (tipo === ActivityEventType.PLAYER_JOINED) {
    // `player` y no `name`: fraseCon reserva `name` para las personas con enlace
    const player = payload.player_name || t('feed:cards.aPlayer');
    let clave = 'feed:cards.playerJoinedNoWindow';
    if (time)
      clave = payload.waiting
        ? 'feed:cards.playerJoinedWaiting'
        : 'feed:cards.playerJoined';
    return fraseCon(t, clave, { competition, player, time });
  }
  // Sin la hora de la franja, la frase sin ella (revisor)
  const clave = time ? `feed:cards.${tipo}` : `feed:cards.${tipo}_NoTime`;
  return fraseCon(t, clave, { competition, time });
};

// Los avisos al organizador o al jugador de los hándicaps con la RFEG y del
// plazo de inscripción (15 nov 2026)
const AVISOS_DEL_PLAZO_Y_LA_RFEG = new Set([
  ActivityEventType.HANDICAPS_NOT_UPDATED,
  ActivityEventType.RFEG_HANDICAP_NOT_FOUND,
  ActivityEventType.ENROLLMENTS_CLOSED,
  ActivityEventType.ENROLLMENT_CLOSE_BLOCKED,
  // Invitaciones en espera y equipos deshechos al entrar alguien (15 nov 2026)
  ActivityEventType.INVITATION_ACCEPTABLE_AGAIN,
  ActivityEventType.TEAMS_UNDONE_BY_ENTRY,
]);

// Por qué no se pudieron cerrar solas: un motivo que no se conoce, sin cuántos
const MOTIVOS_DEL_BLOQUEO = new Set(['NO_TEE_WINDOW', 'NO_HANDICAP']);

const fraseDelPlazoYLaRfeg = (tipo, payload, t) => {
  const competition = nombreDelTorneo(payload, t);
  if (tipo === ActivityEventType.HANDICAPS_NOT_UPDATED)
    return fraseCon(t, 'feed:cards.HANDICAPS_NOT_UPDATED', {
      competition,
      count: payload.count ?? 0,
    });
  if (tipo === ActivityEventType.TEAMS_UNDONE_BY_ENTRY) {
    // `player` y no `name`: fraseCon reserva `name` para las personas con enlace
    return fraseCon(t, 'feed:cards.TEAMS_UNDONE_BY_ENTRY', {
      competition,
      player: payload.player_name || t('feed:cards.aPlayer'),
    });
  }
  if (tipo === ActivityEventType.ENROLLMENT_CLOSE_BLOCKED) {
    if (!MOTIVOS_DEL_BLOQUEO.has(payload.reason))
      return fraseCon(t, 'feed:cards.ENROLLMENT_CLOSE_BLOCKED', {
        competition,
      });
    return fraseCon(
      t,
      `feed:cards.ENROLLMENT_CLOSE_BLOCKED_${payload.reason}`,
      {
        competition,
        count: payload.player_count ?? 0,
      },
    );
  }
  return fraseCon(t, `feed:cards.${tipo}`, { competition });
};

const HALF_ROUND_HOLES = 9;
const FULL_ROUND_HOLES = 18;

// El tanteo como se dice: «3&2» tal cual; una concesión o una incomparecencia
// con palabras, no con el código del backend
const TANTEOS_CON_PALABRAS = new Set(['CONCEDED', 'W/O']);

const tanteo = (score, t) => {
  if (!score) return '';
  return TANTEOS_CON_PALABRAS.has(score) ? t(`feed:score.${score}`) : score;
};

const puesto = (payload, t) => {
  const texto = t('feed:position', { count: payload.position, ordinal: true });
  return payload.tied ? t('feed:tied', { position: texto }) : texto;
};

const esMedal = (payload) =>
  payload.scoring_format === ScoringFormat.MEDAL ||
  (payload.points == null && payload.net_strokes != null);

// «34 puntos» o «72 netos»; con los golpes brutos detrás si se piden y vienen
const resultado = (payload, t, conBruto) => {
  const base = esMedal(payload)
    ? t('feed:result.net', { count: payload.net_strokes })
    : t('feed:result.points', { count: payload.points ?? 0 });
  return conBruto && payload.gross_strokes != null
    ? t('feed:result.withGross', { result: base, gross: payload.gross_strokes })
    : base;
};

const nombreDelTorneo = (payload, t) =>
  payload.competition_name || t('feed:cards.aTournament');

// Una partida rápida que se cerró sin acabar: no se gana, no se empata ni
// tiene puesto. Vale cualquiera de las dos señales del backend
const sinTerminar = (payload) =>
  payload.unfinished === true || payload.outcome === MatchOutcome.UNFINISHED;

// Hay número que decir: los netos en Medal, los puntos en Stableford. Una
// partida sin terminar puede llegar sin él, y «· netos» a secas no se dice
const tieneResultado = (payload) =>
  esMedal(payload) ? payload.net_strokes != null : payload.points != null;

// « · 9 hoyos» detrás de una vuelta que cuenta y no llegó a 18
const conHoyos = (frase, payload, t) => {
  const hoyos = payload.holes_played;
  if (!Number.isInteger(hoyos) || hoyos <= 0 || hoyos >= FULL_ROUND_HOLES)
    return frase;
  return unaTrasOtra(
    frase,
    fraseDeTexto(` · ${t('feed:result.holes', { count: hoyos })}`),
  );
};

// Quien mira jugó esa partida rápida: es el autor, o sale entre sus rivales o
// compañeros
const jugoLaPartida = (tarjeta, yoId) => {
  if (!yoId) return false;
  if (tarjeta.autorId === yoId) return true;
  const payload = tarjeta.eventos[0].payload || {};
  return ['opponents', 'partners'].some(
    (clave) =>
      Array.isArray(payload[clave]) &&
      payload[clave].some((p) => p?.user_id === yoId),
  );
};

/**
 * Una partida rápida: quien la jugó va a su pantalla de anotación; quien no,
 * a verla en solo lectura (K), con el autor apuntado para volver a su perfil
 * si el servidor no la deja ver (403). Sin el autor entre los autores
 * (bloqueado, desactivado) no se lleva a ningún sitio; sin el id de la
 * partida, a su perfil, como antes.
 */
const destinoDePartidaRapida = (quickMatchId, jugo, tarjeta, autores) => {
  if (jugo)
    return {
      ruta: quickMatchId ? `/quick-matches/${quickMatchId}/scoring` : null,
    };
  const perfil = personaDe(tarjeta.autorId, autores, () => '').enlace;
  if (!perfil || !quickMatchId) return { ruta: perfil };
  return {
    ruta: `/quick-matches/${quickMatchId}/shared`,
    estado: { perfilDe: tarjeta.autorId },
  };
};

/**
 * Si quien mira jugó el grupo o el partido de un logro de torneo. El backend
 * manda en `player_ids` a todos los de ese grupo o partido, autor incluido:
 * si viene, manda esa lista (o ser el autor). Los logros de antes, sin ella,
 * siguen con la regla de siempre: autor o nombrado.
 */
const jugoElLogroDeTorneo = (evento, tarjeta, yoId, jugoSegunLoDeAntes) => {
  const jugadores = evento.payload.player_ids;
  if (!Array.isArray(jugadores)) return jugoSegunLoDeAntes;
  if (!yoId) return false;
  return tarjeta.autorId === yoId || jugadores.includes(yoId);
};

// La tarjeta de solo lectura de la partida (o el partido) de un amigo; sin
// saber cuál, la clasificación en su fila (F4)
const deUnAmigo = (competitionId, kind, groupId, matchId, autorId) => {
  if (kind === 'TEE_GROUP' && groupId)
    return conJugador(
      `/competitions/${competitionId}/groups/${groupId}`,
      autorId,
    );
  if (kind === 'MATCH' && matchId)
    return conJugador(
      `/competitions/${competitionId}/matches/${matchId}`,
      autorId,
    );
  return rutaEnSuFila(competitionId, autorId);
};

// La clave de un texto en tercera persona, si es de un amigo: «finalStanding»
// → «friendFinalStanding» (release social 2)
const claveDeQuien = (mia, clave) =>
  mia ? clave : `friend${clave[0].toUpperCase()}${clave.slice(1)}`;

/**
 * Un logro de torneo que dice dónde fue (L): `competition_id` y `kind`, y
 * `group_id` si fue en un grupo de stroke play. Quien lo jugó va a su
 * tarjeta; quien no, a la de su amigo en solo lectura (release social 2), y
 * sin saber cuál, a la clasificación en su fila.
 */
const destinoDeLogroDeTorneo = (evento, jugo, autorId) => {
  const {
    competition_id: competitionId,
    kind,
    group_id: groupId,
  } = evento.payload;
  const ficha = `/competitions/${competitionId}`;
  // De un amigo, sin haberla jugado: su tarjeta, en solo lectura; sin saber
  // cuál, la clasificación en su fila (release social 2, F4)
  if (!jugo)
    return {
      ruta: deUnAmigo(
        competitionId,
        kind,
        groupId,
        evento.sourceMatchId,
        autorId,
      ),
    };
  if (kind === 'TEE_GROUP' && groupId) {
    return {
      ruta: rutaDeAnotacion({
        id: groupId,
        competitionId,
        esPartidaDeFranja: true,
      }),
    };
  }
  if (kind === 'MATCH' && evento.sourceMatchId) {
    return { ruta: rutaDeAnotacion({ id: evento.sourceMatchId }) };
  }
  return { ruta: ficha };
};

/**
 * Adónde lleva tocar la tarjeta: `{ ruta, estado }`, con la ruta en null si
 * faltan los datos para saberlo.
 *
 * A la anotación de una partida solo se lleva a quien la jugó: la pantalla de
 * otro le dejaría fuera.
 */
const destinoDe = (tarjeta, yoId, autores) => {
  const [primero] = tarjeta.eventos;
  const payload = primero.payload || {};
  const jugo = jugoLaPartida(tarjeta, yoId);
  if (LOGROS.has(tarjeta.tipo)) {
    const deTorneo = tarjeta.eventos.some((e) => e.payload?.from_tournament);
    if (!deTorneo)
      return destinoDePartidaRapida(
        primero.sourceMatchId,
        jugo,
        tarjeta,
        autores,
      );
    const conSitio = tarjeta.eventos.find(
      (e) =>
        e.payload?.from_tournament &&
        e.payload?.competition_id &&
        e.payload?.kind,
    );
    if (conSitio) {
      return destinoDeLogroDeTorneo(
        conSitio,
        jugoElLogroDeTorneo(conSitio, tarjeta, yoId, jugo),
        tarjeta.autorId,
      );
    }
    // Los de antes, sin torneo ni tipo: como siempre. Sin haberlo jugado, al
    // perfil del amigo (sin él en los autores no hay perfil al que ir)
    if (!jugo)
      return { ruta: personaDe(tarjeta.autorId, autores, () => '').enlace };
    return {
      ruta: primero.sourceMatchId
        ? `/player/matches/${primero.sourceMatchId}/scoring`
        : null,
    };
  }
  if (tarjeta.tipo === ActivityEventType.QUICK_MATCH_FINISHED) {
    return destinoDePartidaRapida(
      primero.sourceMatchId,
      jugo,
      tarjeta,
      autores,
    );
  }
  // Solo llega a uno mismo (SELF): siempre lo jugó
  if (tarjeta.tipo === ActivityEventType.TOURNAMENT_MATCH_RESULT) {
    return {
      ruta: primero.sourceMatchId
        ? `/player/matches/${primero.sourceMatchId}/scoring`
        : null,
    };
  }
  // La RFEG no le encontró: el nombre se arregla en su perfil (15 nov 2026)
  if (tarjeta.tipo === ActivityEventType.RFEG_HANDICAP_NOT_FOUND)
    return { ruta: '/profile/edit' };
  // Los que no se actualizaron: a la ficha, con su tarjeta de hándicaps a la
  // vista, como desde «Requiere tu Atención»
  if (
    tarjeta.tipo === ActivityEventType.HANDICAPS_NOT_UPDATED &&
    payload.competition_id
  )
    return {
      ruta: `/competitions/${payload.competition_id}`,
      estado: { verHandicaps: true },
    };
  // La posición final de un amigo: la clasificación, en su fila (F5)
  if (
    tarjeta.tipo === ActivityEventType.TOURNAMENT_FINAL_STANDING &&
    tarjeta.autorId !== yoId &&
    payload.competition_id
  ) {
    return { ruta: rutaEnSuFila(payload.competition_id, tarjeta.autorId) };
  }
  return {
    ruta: payload.competition_id
      ? `/competitions/${payload.competition_id}`
      : null,
  };
};

/** Los rivales de una partida rápida: con cuenta por su id; invitados, por su nombre. */
const rivalesDePartidaRapida = (payload, autores, t) =>
  (Array.isArray(payload.opponents) ? payload.opponents : []).map((rival) =>
    rival?.user_id
      ? personaDe(rival.user_id, autores, t)
      : invitadoDe(rival?.name, t),
  );

const rivalesDeTorneo = (payload, autores, t) =>
  (Array.isArray(payload.opponent_ids) ? payload.opponent_ids : []).map((id) =>
    personaDe(id, autores, t),
  );

const SIN_RIVALES = (t) => [{ nombre: t('feed:someone'), enlace: null }];

/** Lo que dice una partida de match play, tuya o de un amigo. */
const fraseDeMatchPlay = (
  payload,
  { t, idioma, mia, autor, rivales, rapida = false },
) => {
  const score = tanteo(payload.score, t);
  // Solo una partida rápida se queda sin terminar: un partido de torneo nunca
  // se lee como tal, traiga lo que traiga
  if (rapida && sinTerminar(payload)) {
    return mia
      ? fraseCon(
          t,
          'feed:cards.unfinishedMatch',
          {},
          {
            rivales: rivales.length > 0 ? rivales : SIN_RIVALES(t),
            idioma,
          },
        )
      : fraseCon(t, 'feed:cards.friendUnfinishedMatch', {}, { persona: autor });
  }
  if (mia) {
    const clave =
      {
        [MatchOutcome.WON]: 'won',
        [MatchOutcome.LOST]: 'lost',
      }[payload.outcome] || 'halved';
    return fraseCon(
      t,
      `feed:cards.${clave}`,
      { score },
      {
        rivales: rivales.length > 0 ? rivales : SIN_RIVALES(t),
        idioma,
      },
    );
  }
  const clave =
    {
      [MatchOutcome.WON]: 'friendWon',
      [MatchOutcome.LOST]: 'friendLost',
    }[payload.outcome] || 'friendHalved';
  return fraseCon(t, `feed:cards.${clave}`, { score }, { persona: autor });
};

/**
 * Una partida rápida de match play. Si cuenta y se jugó a menos de 18 hoyos
 * sin decidirse antes, lleva « · 9 hoyos»: «Ganaste 1UP a Pedro · 9 hoyos».
 * Decidida antes de tiempo (3&2) no: los hoyos que faltan no se jugaron por
 * eso. Sin `decided_early` (backend viejo) tampoco, por no saberlo.
 */
const fraseDeMatchPlayRapida = (payload, contexto) => {
  const frase = fraseDeMatchPlay(payload, { ...contexto, rapida: true });
  if (sinTerminar(payload) || payload.decided_early !== false) return frase;
  return conHoyos(frase, payload, contexto.t);
};

/** Una partida rápida de Stableford o Medal que se quedó sin terminar. */
const fraseSinTerminar = (payload, { t, mia, autor, campo }) => {
  if (!tieneResultado(payload)) {
    if (mia) {
      return fraseCon(
        t,
        campo
          ? 'feed:cards.unfinishedStrokeNoResult'
          : 'feed:cards.unfinishedStrokeNoCourseNoResult',
        { course: campo },
      );
    }
    return fraseCon(
      t,
      'feed:cards.friendUnfinishedMatch',
      {},
      { persona: autor },
    );
  }
  const result = resultado(payload, t, false);
  if (mia) {
    return fraseCon(
      t,
      campo
        ? 'feed:cards.unfinishedStroke'
        : 'feed:cards.unfinishedStrokeNoCourse',
      {
        course: campo,
        result,
      },
    );
  }
  return fraseCon(
    t,
    'feed:cards.friendUnfinishedStroke',
    { result },
    { persona: autor },
  );
};

/** Lo que dice una partida rápida de Stableford o Medal. */
const fraseDeStrokePlay = (payload, contexto) => {
  if (sinTerminar(payload)) return fraseSinTerminar(payload, contexto);
  return conHoyos(
    fraseDeStrokePlayAcabada(payload, contexto),
    payload,
    contexto.t,
  );
};

const fraseDeStrokePlayAcabada = (payload, { t, mia, autor, campo }) => {
  const conPuesto = payload.position != null;
  if (mia) {
    if (conPuesto) {
      return fraseCon(
        t,
        campo
          ? 'feed:cards.quickMatchRanked'
          : 'feed:cards.quickMatchRankedNoCourse',
        {
          position: puesto(payload, t),
          total: payload.total_players,
          course: campo,
          result: resultado(payload, t, true),
        },
      );
    }
    return fraseCon(
      t,
      campo ? 'feed:cards.quickMatchSolo' : 'feed:cards.quickMatchSoloNoCourse',
      {
        course: campo,
        result: resultado(payload, t, false),
      },
    );
  }
  if (conPuesto) {
    return fraseCon(
      t,
      'feed:cards.friendQuickMatchRanked',
      { position: puesto(payload, t), result: resultado(payload, t, false) },
      { persona: autor },
    );
  }
  return fraseCon(
    t,
    'feed:cards.friendQuickMatchSolo',
    { result: resultado(payload, t, false) },
    { persona: autor },
  );
};

// «15½», «½», «14»: los puntos de una Ryder, con el medio como se escribe
const puntosDeRyder = (n) => {
  const enteros = Math.trunc(n);
  if (n - enteros !== 0.5) return String(n);
  return enteros === 0 ? '½' : `${enteros}½`;
};

const RESULTADOS_DE_RYDER = {
  [MatchOutcome.WON]: 'ryderWon',
  [MatchOutcome.LOST]: 'ryderLost',
  [MatchOutcome.HALVED]: 'ryderHalved',
};

/**
 * El final de una Ryder (I): «Clasificación final de X: tu equipo (Europa)
 * ganó 15½–12½». No hay puesto: hay equipos, y el tuyo va primero en el
 * marcador. Sin resultado conocido o sin los dos tanteos, solo que es final.
 */
const fraseDeLaRyder = (payload, t, { mia = true, autor } = {}) => {
  const competition = nombreDelTorneo(payload, t);
  const clave = RESULTADOS_DE_RYDER[payload.outcome];
  const deA = payload.team_a_points;
  const deB = payload.team_b_points;
  const esA = payload.my_team !== Team.B;
  // La de un amigo, en tercera persona: «El equipo de Pedro (Europa) ganó…»
  // (release social 2); `my_team` es el suyo
  const deQuien = (c) => claveDeQuien(mia, c);
  const persona = mia ? {} : { persona: autor };
  if (!clave || !Number.isFinite(deA) || !Number.isFinite(deB)) {
    return fraseCon(
      t,
      `feed:cards.${deQuien('ryderFinalBare')}`,
      { competition },
      persona,
    );
  }
  const [mios, suyos] = esA ? [deA, deB] : [deB, deA];
  const equipo = esA ? payload.team_a_name : payload.team_b_name;
  return fraseCon(
    t,
    `feed:cards.${deQuien(clave)}${equipo ? '' : 'NoName'}`,
    {
      competition,
      team: equipo,
      score: `${puntosDeRyder(mios)}–${puntosDeRyder(suyos)}`,
    },
    persona,
  );
};

const personasDe = (ids, autores, t) =>
  (Array.isArray(ids) ? ids : []).map((id) => personaDe(id, autores, t));

/**
 * El aviso de una salida o un partido de torneo, propio (SELF):
 * «Ya tienes salida en X: sáb 24 oct · 9:10 · con Pedro y Juan» o «Ya tienes
 * partido en X: sáb 24 oct, mañana · con Pedro contra Juan y Luis». Con
 * `changed`, «Ha cambiado tu salida/partido en X: …».
 *
 * La sesión va en los partidos y, en una salida, solo si falta la hora. Quien
 * no viene en los autores (bloqueado, desactivado) es «un jugador».
 */
const fraseDeSalida = (payload, { t, idioma, autores, ahora }) => {
  const esPartido = payload.kind === 'MATCH';
  const hora = horaDeSalida(payload.tee_time);
  const sesion = t(`feed:teeTime.session.${payload.session_type}`, {
    defaultValue: '',
  });
  const dia = diaDeLaVuelta(payload.round_date, ahora, idioma);
  const cuando = [
    [dia, esPartido || !hora ? sesion : ''].filter(Boolean).join(', '),
    hora,
  ]
    .filter(Boolean)
    .join(' · ');

  const base = `${esPartido ? 'match' : 'group'}${payload.changed ? 'Changed' : ''}`;
  const cabeza = fraseCon(t, `feed:teeTime.${cuando ? base : `${base}Bare`}`, {
    competition: nombreDelTorneo(payload, t),
    when: cuando,
  });

  const companeros = personasDe(payload.partner_ids, autores, t);
  const rivales = personasDe(payload.opponent_ids, autores, t);
  let clave = null;
  if (companeros.length > 0)
    clave = rivales.length > 0 ? 'withAgainst' : 'with';
  else if (rivales.length > 0) clave = 'against';
  if (!clave) return cabeza;
  return unaTrasOtra(
    cabeza,
    fraseCon(
      t,
      `feed:teeTime.${clave}`,
      {},
      {
        companeros: companeros.length > 0 ? companeros : undefined,
        rivales: rivales.length > 0 ? rivales : undefined,
        idioma,
      },
    ),
  );
};

/**
 * Qué dice la tarjeta: la frase (con sus enlaces y en texto plano), una
 * etiqueta opcional y los detalles de debajo.
 */
const contenidoDe = (tarjeta, { t, idioma, autores, campos, yoId, ahora }) => {
  const [primero] = tarjeta.eventos;
  const payload = primero.payload || {};
  const autor = personaDe(tarjeta.autorId, autores, t);
  const mia = !!yoId && tarjeta.autorId === yoId;
  const campo = campos?.[payload.golf_course_id] || '';

  if (LOGROS.has(tarjeta.tipo)) {
    const titulos = tarjeta.eventos.map((e) =>
      t(`feed:events.${e.type}`, {
        count: e.payload?.count ?? 1,
        defaultValue: e.type,
      }),
    );
    const detalles = [];
    const conHoyos = tarjeta.eventos.filter(
      (e) => (e.payload?.holes ?? []).length > 0,
    );
    // Los hoyos solo si no hay duda de a qué logro van
    if (conHoyos.length === 1) {
      const hoyos = conHoyos[0].payload.holes;
      detalles.push(
        t('feed:detail.holes', {
          count: hoyos.length,
          holes: hoyos.join(', '),
        }),
      );
    }
    for (const e of tarjeta.eventos) {
      if (e.payload?.differential && e.payload?.previous_best) {
        detalles.push(
          t('feed:detail.differential', {
            differential: e.payload.differential,
            previous: e.payload.previous_best,
          }),
        );
      }
    }
    if (
      tarjeta.eventos.some((e) => e.payload?.holes_played === HALF_ROUND_HOLES)
    ) {
      detalles.push(t('feed:detail.halfRound'));
    }
    if (tarjeta.eventos.some((e) => e.payload?.from_tournament)) {
      detalles.push(t('feed:detail.fromTournament'));
    }
    // El campo va el último: se repite en todos los logros de la misma vuelta
    if (campo) detalles.push(campo);
    const texto = titulos.join(' · ');
    return {
      cabecera: autor,
      frase: { ...fraseDeTexto(texto), texto: `${autor.nombre}: ${texto}` },
      detalles,
    };
  }

  if (tarjeta.tipo === ActivityEventType.QUICK_MATCH_FINISHED) {
    const esMatchPlay = !!payload.match_format || !!payload.outcome;
    const frase = esMatchPlay
      ? fraseDeMatchPlayRapida(payload, {
          t,
          idioma,
          mia,
          autor,
          rivales: rivalesDePartidaRapida(payload, autores, t),
        })
      : fraseDeStrokePlay(payload, { t, mia, autor, campo });
    // En las frases de stroke play propias el campo ya va dentro
    const detalles = campo && (esMatchPlay || !mia) ? [campo] : [];
    return {
      frase,
      etiqueta: payload.best_gross_in_group
        ? t(
            payload.best_gross_tied
              ? 'feed:cards.bestGrossTied'
              : 'feed:cards.bestGross',
          )
        : null,
      detalles,
    };
  }

  if (tarjeta.tipo === ActivityEventType.TOURNAMENT_MATCH_RESULT) {
    return {
      frase: fraseDeMatchPlay(payload, {
        t,
        idioma,
        mia: true,
        autor,
        rivales: rivalesDeTorneo(payload, autores, t),
      }),
      detalles: payload.competition_name ? [payload.competition_name] : [],
    };
  }

  if (
    tarjeta.tipo === ActivityEventType.TOURNAMENT_FINAL_STANDING &&
    payload.tournament_type === TournamentType.RYDER_CUP
  ) {
    return { frase: fraseDeLaRyder(payload, t, { mia, autor }), detalles: [] };
  }

  if (tarjeta.tipo === ActivityEventType.TOURNAMENT_FINAL_STANDING) {
    const competition = nombreDelTorneo(payload, t);
    // La de un amigo, en tercera persona (release social 2)
    const clave = (c) => `feed:cards.${claveDeQuien(mia, c)}`;
    const persona = mia ? {} : { persona: autor };
    const frase =
      payload.position != null
        ? fraseCon(
            t,
            clave('finalStanding'),
            {
              competition,
              position: puesto(payload, t),
              total: payload.total_players,
            },
            persona,
          )
        : fraseCon(
            t,
            clave('finalStandingNoPosition'),
            { competition },
            persona,
          );
    return { frase, detalles: [] };
  }

  if (tarjeta.tipo === ActivityEventType.TEE_TIME_ASSIGNED) {
    return {
      frase: fraseDeSalida(payload, { t, idioma, autores, ahora }),
      detalles: [],
    };
  }

  if (AVISOS_DE_LA_ESPERA.has(tarjeta.tipo)) {
    return {
      frase: fraseDeLaEspera(tarjeta.tipo, payload, t, { ahora, idioma }),
      detalles: [],
    };
  }

  if (AVISOS_DEL_PLAZO_Y_LA_RFEG.has(tarjeta.tipo)) {
    return {
      frase: fraseDelPlazoYLaRfeg(tarjeta.tipo, payload, t),
      detalles: [],
    };
  }

  if (AVISOS_DE_INSCRIPCION.has(tarjeta.tipo)) {
    return {
      frase: fraseCon(t, `feed:cards.${tarjeta.tipo}`, {
        competition: nombreDelTorneo(payload, t),
      }),
      detalles: [],
    };
  }

  // ENROLLED_IN_TOURNAMENT: un amigo se ha apuntado a un torneo público
  const dates = fechasDelTorneo(
    payload.start_date,
    payload.end_date,
    ahora,
    idioma,
  );
  return {
    frase: fraseCon(
      t,
      dates ? 'feed:cards.friendEnrolled' : 'feed:cards.friendEnrolledNoDates',
      { competition: nombreDelTorneo(payload, t), dates },
      { persona: autor },
    ),
    detalles: [],
  };
};

/**
 * ActivityEventCard - Una tarjeta de Actividad (FE-1).
 *
 * Una tarjeta puede llevar varios eventos: los logros de una misma vuelta van
 * juntos, con sus cuentas. La frase sale del tipo y del `payload`; los nombres
 * de las personas enlazan a su perfil, y tocar la tarjeta lleva a la partida o
 * al torneo, si se sabe cuál es.
 *
 * `autores` y `campos` llegan resueltos desde fuera: el `payload` solo guarda
 * ids. Un nombre que falte deja la tarjeta con «un jugador» o sin el campo,
 * nunca sin pintar. `perfilActualId`: el perfil que se está viendo, al que la
 * tarjeta no enlaza.
 */
const ActivityEventCard = ({
  tarjeta,
  autores = {},
  campos = {},
  yoId,
  perfilActualId,
  ahora = new Date(),
}) => {
  const { t, i18n } = useTranslation(['feed', 'common']);
  const idioma = i18n.language;

  const contenido = contenidoDe(tarjeta, {
    t,
    idioma,
    autores,
    campos,
    yoId,
    ahora,
  });
  // En el perfil de alguien, llevar a ese mismo perfil no lleva a ningún sitio:
  // repetiría la entrada del historial y un enlace vacío para los lectores
  const posible = destinoDe(tarjeta, yoId, autores);
  const mismoPerfil =
    !posible.ruta ||
    (perfilActualId && posible.ruta === `/players/${perfilActualId}`)
      ? null
      : posible;
  // Desde el perfil de ese mismo amigo, la vista de solo lectura sabe que si
  // no se puede ver tiene que volver atrás, no apilar su perfil otra vez
  const destino =
    mismoPerfil?.estado &&
    perfilActualId &&
    mismoPerfil.estado.perfilDe === perfilActualId
      ? {
          ...mismoPerfil,
          estado: { ...mismoPerfil.estado, desdeSuPerfil: true },
        }
      : mismoPerfil;
  const mia = !!yoId && tarjeta.autorId === yoId;
  const autor = personaDe(tarjeta.autorId, autores, t);
  const hora = horaDeLaTarjeta(tarjeta.instante, ahora, t, idioma);

  const Icono = ICONOS[tarjeta.tipo] || Award;
  const tono = TONOS[tarjeta.tipo] || 'bg-gray-100 text-gray-700';

  return (
    <article
      className={`relative flex gap-3 p-4 bg-white border rounded-lg ${
        tarjeta.nueva ? 'border-primary-300' : 'border-gray-200'
      }`}
      data-testid={`activity-event-${tarjeta.clave}`}
    >
      {/* Tocar la tarjeta lleva a su destino. Va por encima del texto y por
          debajo de los nombres, que llevan a cada perfil */}
      {destino && (
        <Link
          to={destino.ruta}
          state={destino.estado}
          data-testid="enlace-tarjeta"
          aria-label={contenido.frase.texto}
          className="absolute inset-0 rounded-lg"
        />
      )}

      {mia || !autor.enlace ? (
        <span
          className={`shrink-0 flex items-center justify-center w-12 h-12 rounded-full ${tono}`}
          aria-hidden="true"
        >
          <Icono className="w-5 h-5" />
        </span>
      ) : (
        // El nombre ya enlaza al perfil: la foto es el mismo enlace, fuera del
        // orden de tabulación y del árbol de accesibilidad
        <Link
          to={autor.enlace}
          className="relative z-10 shrink-0"
          aria-hidden="true"
          tabIndex={-1}
        >
          <Avatar userId={tarjeta.autorId} size="md" />
        </Link>
      )}

      <div className="min-w-0 flex-1">
        {contenido.cabecera && (
          <p className="truncate text-sm">
            <NombreDePersona persona={contenido.cabecera} />
          </p>
        )}
        <NombrePequeno texto={contenido.cabecera?.pequeno} />
        <p
          data-testid="frase-tarjeta"
          className="text-sm text-gray-800 break-words"
        >
          <FraseDeActividad frase={contenido.frase} />
        </p>

        {contenido.etiqueta && (
          <span className="mt-1 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
            {contenido.etiqueta}
          </span>
        )}

        {contenido.detalles.length > 0 && (
          <p className="mt-1 text-xs text-gray-500 break-words">
            {contenido.detalles.join(' · ')}
          </p>
        )}

        <p className="mt-1 flex items-center gap-2 text-xs text-gray-400">
          {hora && <span data-testid="hora-tarjeta">{hora}</span>}
          {tarjeta.nueva && (
            <span
              data-testid="marca-nueva"
              className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none text-white"
            >
              {t('feed:new')}
            </span>
          )}
        </p>
      </div>
    </article>
  );
};

export default ActivityEventCard;
