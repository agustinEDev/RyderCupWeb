import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  Award,
  CalendarCheck,
  Flag,
  Mail,
  Medal,
  Star,
  Swords,
  TrendingDown,
  Trophy,
  UserPlus,
  XCircle,
  Zap,
} from 'lucide-react';
import Avatar from '../ui/Avatar';
import FraseDeActividad, { NombreDePersona } from './FraseDeActividad';
import {
  fechasDelTorneo,
  fraseCon,
  fraseDeTexto,
  horaDeLaTarjeta,
  invitadoDe,
  personaDe,
} from './textosDeActividad';

/**
 * Un icono por tipo. Sin esto todas las entradas se ven iguales y el feed se
 * lee como una lista de texto.
 */
const ICONOS = {
  HOLE_IN_ONE: Zap,
  EAGLE_OR_BETTER: Star,
  BIRDIE: Award,
  NEW_COURSE: Flag,
  PERSONAL_BEST: TrendingDown,
  FIRST_TOURNAMENT: Trophy,
  ENROLLMENT_APPROVED: CalendarCheck,
  INVITED_TO_TOURNAMENT: Mail,
  ENROLLMENT_REQUEST_CLOSED: XCircle,
  ENROLLMENT_REJECTED: XCircle,
  ENROLLED_IN_TOURNAMENT: UserPlus,
  TOURNAMENT_MATCH_RESULT: Swords,
  TOURNAMENT_FINAL_STANDING: Medal,
  QUICK_MATCH_FINISHED: Flag,
};

const TONOS = {
  HOLE_IN_ONE: 'bg-amber-100 text-amber-700',
  EAGLE_OR_BETTER: 'bg-violet-100 text-violet-700',
  BIRDIE: 'bg-emerald-100 text-emerald-700',
  NEW_COURSE: 'bg-sky-100 text-sky-700',
  PERSONAL_BEST: 'bg-rose-100 text-rose-700',
  FIRST_TOURNAMENT: 'bg-indigo-100 text-indigo-700',
  ENROLLMENT_APPROVED: 'bg-emerald-100 text-emerald-700',
  INVITED_TO_TOURNAMENT: 'bg-sky-100 text-sky-700',
  ENROLLMENT_REQUEST_CLOSED: 'bg-gray-100 text-gray-600',
  ENROLLMENT_REJECTED: 'bg-gray-100 text-gray-600',
  TOURNAMENT_MATCH_RESULT: 'bg-indigo-100 text-indigo-700',
  TOURNAMENT_FINAL_STANDING: 'bg-amber-100 text-amber-700',
  QUICK_MATCH_FINISHED: 'bg-primary-100 text-primary-700',
};

const LOGROS = new Set([
  'HOLE_IN_ONE',
  'EAGLE_OR_BETTER',
  'BIRDIE',
  'NEW_COURSE',
  'PERSONAL_BEST',
  'FIRST_TOURNAMENT',
]);

const AVISOS_DE_INSCRIPCION = new Set([
  'ENROLLMENT_APPROVED',
  'INVITED_TO_TOURNAMENT',
  'ENROLLMENT_REQUEST_CLOSED',
  'ENROLLMENT_REJECTED',
]);

const HALF_ROUND_HOLES = 9;

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
  payload.scoring_format === 'MEDAL' || (payload.points == null && payload.net_strokes != null);

// «34 puntos» o «72 netos»; con los golpes brutos detrás si se piden y vienen
const resultado = (payload, t, conBruto) => {
  const base = esMedal(payload)
    ? t('feed:result.net', { count: payload.net_strokes })
    : t('feed:result.points', { count: payload.points ?? 0 });
  return conBruto && payload.gross_strokes != null
    ? t('feed:result.withGross', { result: base, gross: payload.gross_strokes })
    : base;
};

const nombreDelTorneo = (payload, t) => payload.competition_name || t('feed:cards.aTournament');

// Quien mira jugó esa partida rápida: es el autor, o sale entre sus rivales o
// compañeros
const jugoLaPartida = (tarjeta, yoId) => {
  if (!yoId) return false;
  if (tarjeta.autorId === yoId) return true;
  const payload = tarjeta.eventos[0].payload || {};
  return ['opponents', 'partners'].some(
    (clave) => Array.isArray(payload[clave]) && payload[clave].some((p) => p?.user_id === yoId)
  );
};

/**
 * Adónde lleva tocar la tarjeta; null si faltan los datos para saberlo.
 *
 * A una partida solo se lleva a quien la jugó: la pantalla de otro le dejaría
 * fuera. De lo de un amigo en lo que no estuviste, se va a su perfil.
 */
const destinoDe = (tarjeta, yoId, autores) => {
  const [primero] = tarjeta.eventos;
  const payload = primero.payload || {};
  const esDePartida = LOGROS.has(tarjeta.tipo) || tarjeta.tipo === 'QUICK_MATCH_FINISHED';
  if (esDePartida && !jugoLaPartida(tarjeta, yoId)) {
    // Sin él en los autores (bloqueado, desactivado) no hay perfil al que ir
    return personaDe(tarjeta.autorId, autores, () => '').enlace;
  }
  if (LOGROS.has(tarjeta.tipo)) {
    if (!primero.sourceMatchId) return null;
    const deTorneo = tarjeta.eventos.some((e) => e.payload?.from_tournament);
    return deTorneo
      ? `/player/matches/${primero.sourceMatchId}/scoring`
      : `/quick-matches/${primero.sourceMatchId}/scoring`;
  }
  if (tarjeta.tipo === 'QUICK_MATCH_FINISHED') {
    return primero.sourceMatchId ? `/quick-matches/${primero.sourceMatchId}/scoring` : null;
  }
  // Solo llega a uno mismo (SELF): siempre lo jugó
  if (tarjeta.tipo === 'TOURNAMENT_MATCH_RESULT') {
    return primero.sourceMatchId ? `/player/matches/${primero.sourceMatchId}/scoring` : null;
  }
  return payload.competition_id ? `/competitions/${payload.competition_id}` : null;
};

/** Los rivales de una partida rápida: con cuenta por su id; invitados, por su nombre. */
const rivalesDePartidaRapida = (payload, autores, t) =>
  (Array.isArray(payload.opponents) ? payload.opponents : []).map((rival) =>
    rival?.user_id ? personaDe(rival.user_id, autores, t) : invitadoDe(rival?.name, t)
  );

const rivalesDeTorneo = (payload, autores, t) =>
  (Array.isArray(payload.opponent_ids) ? payload.opponent_ids : []).map((id) =>
    personaDe(id, autores, t)
  );

const SIN_RIVALES = (t) => [{ nombre: t('feed:someone'), enlace: null }];

/** Lo que dice una partida de match play, tuya o de un amigo. */
const fraseDeMatchPlay = (payload, { t, idioma, mia, autor, rivales }) => {
  const score = tanteo(payload.score, t);
  if (mia) {
    const clave = { WON: 'won', LOST: 'lost' }[payload.outcome] || 'halved';
    return fraseCon(t, `feed:cards.${clave}`, { score }, {
      rivales: rivales.length > 0 ? rivales : SIN_RIVALES(t),
      idioma,
    });
  }
  const clave = { WON: 'friendWon', LOST: 'friendLost' }[payload.outcome] || 'friendHalved';
  return fraseCon(t, `feed:cards.${clave}`, { score }, { persona: autor });
};

/** Lo que dice una partida rápida de Stableford o Medal. */
const fraseDeStrokePlay = (payload, { t, mia, autor, campo }) => {
  const conPuesto = payload.position != null;
  if (mia) {
    if (conPuesto) {
      return fraseCon(t, campo ? 'feed:cards.quickMatchRanked' : 'feed:cards.quickMatchRankedNoCourse', {
        position: puesto(payload, t),
        total: payload.total_players,
        course: campo,
        result: resultado(payload, t, true),
      });
    }
    return fraseCon(t, campo ? 'feed:cards.quickMatchSolo' : 'feed:cards.quickMatchSoloNoCourse', {
      course: campo,
      result: resultado(payload, t, false),
    });
  }
  if (conPuesto) {
    return fraseCon(
      t,
      'feed:cards.friendQuickMatchRanked',
      { position: puesto(payload, t), result: resultado(payload, t, false) },
      { persona: autor }
    );
  }
  return fraseCon(
    t,
    'feed:cards.friendQuickMatchSolo',
    { result: resultado(payload, t, false) },
    { persona: autor }
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
      t(`feed:events.${e.type}`, { count: e.payload?.count ?? 1, defaultValue: e.type })
    );
    const detalles = [];
    const conHoyos = tarjeta.eventos.filter((e) => (e.payload?.holes ?? []).length > 0);
    // Los hoyos solo si no hay duda de a qué logro van
    if (conHoyos.length === 1) {
      const hoyos = conHoyos[0].payload.holes;
      detalles.push(t('feed:detail.holes', { count: hoyos.length, holes: hoyos.join(', ') }));
    }
    for (const e of tarjeta.eventos) {
      if (e.payload?.differential && e.payload?.previous_best) {
        detalles.push(
          t('feed:detail.differential', {
            differential: e.payload.differential,
            previous: e.payload.previous_best,
          })
        );
      }
    }
    if (tarjeta.eventos.some((e) => e.payload?.holes_played === HALF_ROUND_HOLES)) {
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

  if (tarjeta.tipo === 'QUICK_MATCH_FINISHED') {
    const esMatchPlay = !!payload.match_format || !!payload.outcome;
    const frase = esMatchPlay
      ? fraseDeMatchPlay(payload, {
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
      etiqueta: payload.best_gross_in_group ? t('feed:cards.bestGross') : null,
      detalles,
    };
  }

  if (tarjeta.tipo === 'TOURNAMENT_MATCH_RESULT') {
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

  if (tarjeta.tipo === 'TOURNAMENT_FINAL_STANDING') {
    const competition = nombreDelTorneo(payload, t);
    const frase =
      payload.position != null
        ? fraseCon(t, 'feed:cards.finalStanding', {
            competition,
            position: puesto(payload, t),
            total: payload.total_players,
          })
        : fraseCon(t, 'feed:cards.finalStandingNoPosition', { competition });
    return { frase, detalles: [] };
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
  const dates = fechasDelTorneo(payload.start_date, payload.end_date, ahora, idioma);
  return {
    frase: fraseCon(
      t,
      dates ? 'feed:cards.friendEnrolled' : 'feed:cards.friendEnrolledNoDates',
      { competition: nombreDelTorneo(payload, t), dates },
      { persona: autor }
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

  const contenido = contenidoDe(tarjeta, { t, idioma, autores, campos, yoId, ahora });
  // En el perfil de alguien, llevar a ese mismo perfil no lleva a ningún sitio:
  // repetiría la entrada del historial y un enlace vacío para los lectores
  const posible = destinoDe(tarjeta, yoId, autores);
  const destino = perfilActualId && posible === `/players/${perfilActualId}` ? null : posible;
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
          to={destino}
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
        <p data-testid="frase-tarjeta" className="text-sm text-gray-800 break-words">
          <FraseDeActividad frase={contenido.frase} />
        </p>

        {contenido.etiqueta && (
          <span className="mt-1 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
            {contenido.etiqueta}
          </span>
        )}

        {contenido.detalles.length > 0 && (
          <p className="mt-1 text-xs text-gray-500 break-words">{contenido.detalles.join(' · ')}</p>
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
