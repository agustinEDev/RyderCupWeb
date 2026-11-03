import { idAleatorio } from './idAleatorio';
import { nombreVisible } from './nombreVisible';
import {
  DEFAULT_ALLOWANCE_BY_MATCH_FORMAT,
  DEFAULT_FREE_PLAY_ALLOWANCE,
  MAX_SCORERS,
  NO_TEE_KEY,
  TEAM_FORMATS,
  teeKey,
} from '../components/quick_match/createQuickMatchModalConstants';

/**
 * El borrador del asistente de partida rápida para repetir una (FE #1021):
 * lo que vale de la partida se copia, y lo que ya no, se deja fuera y se dice.
 *
 * Los jugadores tienen la forma de los del asistente (`CreateQuickMatchModal`):
 * quien repite, el primero y con su hándicap de hoy; los amigos, con el de hoy
 * de su lista; los invitados, con el de aquella partida (no tienen perfil).
 *
 * @param {Object} opciones
 * @param {Object} opciones.partida La partida rápida (entidad `QuickMatch`)
 * @param {Object} opciones.yo Quien repite
 * @param {Array} opciones.amigos Sus amigos, como los lee el asistente
 * @param {Object|null} opciones.campo El campo (`GolfCourse`), o nulo si ya no está
 * @returns {{inicial: Object, paso: number, avisos: Array<Object>}}
 */
// Nombre y apellidos de un invitado: los que mandó el servidor, o, si es uno
// anterior a BE #717 (o lo guardado en el móvil antes), partiendo el nombre
// por el primer espacio. Sin espacio no hay apellidos: no se puede copiar
const nombreDelInvitado = (p) => {
  if (p.firstName && p.lastName) return { firstName: p.firstName, lastName: p.lastName };
  const [firstName, ...resto] = (p.name ?? '').trim().split(/\s+/);
  const lastName = resto.join(' ');
  return firstName && lastName ? { firstName, lastName } : null;
};

export const borradorParaRepetir = ({ partida, yo, amigos, campo }) => {
  const juegoLibre = Boolean(partida.scoringFormat);
  // El % que el asistente pone por defecto a ese formato: si es el copiado, no
  // cuenta como elegido a mano, y cambiar de formato lo sigue moviendo (revisor)
  const porDefecto = juegoLibre
    ? DEFAULT_FREE_PLAY_ALLOWANCE
    : DEFAULT_ALLOWANCE_BY_MATCH_FORMAT[partida.matchFormat] ?? 100;
  const copiado = partida.allowancePercentage ?? null;
  const comun = {
    matchName: partida.name ?? '',
    mode: juegoLibre ? 'FREE_PLAY' : 'MATCH_PLAY',
    matchFormat: partida.matchFormat ?? 'SINGLES',
    scoringFormat: partida.scoringFormat ?? 'STABLEFORD',
    allowanceOverride: copiado === porDefecto ? null : copiado,
    playMode: partida.playMode ?? 'HANDICAP',
  };

  // Sin campo no hay barras ni plantilla que valgan: se empieza por él (R8)
  if (!campo?.isApproved?.()) {
    return {
      paso: 1,
      avisos: [{ tipo: 'campo' }],
      inicial: { ...comun, selectedCourse: null, creatorTeeKey: NO_TEE_KEY, participants: [], scorerIds: [] },
    };
  }

  const barras = new Set((campo.tees || []).map((t) => teeKey(t.color, t.gender)));
  // Un campo sin barras no pide ninguna, como al crear la partida: nadie lleva
  // la de antes (el servidor rechazaría una que el campo no tiene)
  const sinBarras = barras.size === 0;
  const barraVale = (p) => sinBarras || barras.has(teeKey(p.color, p.teeGender));
  const barraDe = (p) => (sinBarras ? { color: null, teeGender: null } : { color: p.color, teeGender: p.teeGender });
  const avisoDeBarra = (p, nombre) => ({ tipo: 'barra', propia: !nombre, ...(nombre ? { nombre } : {}), color: p.color, genero: p.teeGender });
  const porEquipos = !juegoLibre && TEAM_FORMATS.includes(partida.matchFormat);
  const equipo = (p) => (porEquipos ? p.team ?? null : null);
  const avisos = [];

  const mio = partida.participants.find((p) => p.userId === yo.id);
  const miBarraVale = mio && barraVale(mio);
  if (mio && !miBarraVale) avisos.push(avisoDeBarra(mio));
  const handicapDeHoy = yo.handicap ?? null;
  const jugadores = [
    {
      participantId: yo.id,
      userId: yo.id,
      name: nombreVisible(yo),
      handicap: handicapDeHoy,
      profileHandicap: handicapDeHoy,
      team: mio ? equipo(mio) : null,
      isGuest: false,
      ...(miBarraVale ? barraDe(mio) : { color: null, teeGender: null }),
    },
  ];

  for (const p of partida.participants) {
    if (p.userId === yo.id) continue;
    if (p.isGuest) {
      const nombre = nombreDelInvitado(p);
      if (!nombre) {
        avisos.push({ tipo: 'invitado', nombre: p.name });
        continue;
      }
      if (!barraVale(p)) {
        avisos.push(avisoDeBarra(p, p.name));
        continue;
      }
      jugadores.push({
        participantId: `invitado-${idAleatorio()}`,
        userId: null,
        name: `${nombre.firstName} ${nombre.lastName}`,
        ...nombre,
        handicap: p.handicap ?? null,
        team: equipo(p),
        isGuest: true,
        ...barraDe(p),
      });
      continue;
    }
    const amigo = amigos.find((a) => a.otherUserId === p.userId);
    if (!amigo) {
      avisos.push({ tipo: 'noAmigo', nombre: p.name });
      continue;
    }
    if (!barraVale(p)) {
      avisos.push(avisoDeBarra(p, amigo.otherUserName));
      continue;
    }
    const handicap = amigo.otherUserHandicap ?? null;
    jugadores.push({
      participantId: p.userId,
      userId: p.userId,
      name: amigo.otherUserName,
      handicap,
      profileHandicap: handicap,
      team: equipo(p),
      isGuest: false,
      ...barraDe(p),
    });
  }

  // Quien repite anota siempre: el servidor lo exige al creador (R11)
  const siguen = new Set(jugadores.filter((p) => !p.isGuest).map((p) => p.userId));
  const scorerIds = [yo.id, ...partida.scorerIds.filter((id) => id !== yo.id && siguen.has(id))].slice(
    0,
    MAX_SCORERS
  );

  // Quien se queda fuera trae su aviso, y con él se completa la plantilla en
  // Jugadores (también los equipos por parejas, R10): la original estaba llena
  let paso = 4;
  if (avisos.length > 0) paso = 2;
  if (mio && !miBarraVale) paso = 1;

  return {
    paso,
    avisos,
    inicial: {
      ...comun,
      selectedCourse: campo,
      creatorTeeKey: miBarraVale && !sinBarras ? teeKey(mio.color, mio.teeGender) : NO_TEE_KEY,
      participants: jugadores,
      scorerIds,
    },
  };
};
