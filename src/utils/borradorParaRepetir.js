import { idAleatorio } from './idAleatorio';
import { nombreVisible } from './nombreVisible';
import {
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
export const borradorParaRepetir = ({ partida, yo, amigos, campo }) => {
  const juegoLibre = Boolean(partida.scoringFormat);
  const comun = {
    matchName: partida.name ?? '',
    mode: juegoLibre ? 'FREE_PLAY' : 'MATCH_PLAY',
    matchFormat: partida.matchFormat ?? 'SINGLES',
    scoringFormat: partida.scoringFormat ?? 'STABLEFORD',
    allowanceOverride: partida.allowancePercentage ?? null,
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
  // Un campo sin barras no pide ninguna, como al crear la partida
  const barraVale = (p) => barras.size === 0 || barras.has(teeKey(p.color, p.teeGender));
  const porEquipos = !juegoLibre && TEAM_FORMATS.includes(partida.matchFormat);
  const equipo = (p) => (porEquipos ? p.team ?? null : null);
  const avisos = [];

  const mio = partida.participants.find((p) => p.userId === yo.id);
  const miBarraVale = mio && barraVale(mio);
  if (mio && !miBarraVale) avisos.push({ tipo: 'barra', propia: true, color: mio.color });
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
      color: miBarraVale ? mio.color : null,
      teeGender: miBarraVale ? mio.teeGender : null,
    },
  ];

  for (const p of partida.participants) {
    if (p.userId === yo.id) continue;
    if (p.isGuest) {
      if (!barraVale(p)) {
        avisos.push({ tipo: 'barra', propia: false, nombre: p.name, color: p.color });
        continue;
      }
      jugadores.push({
        participantId: `invitado-${idAleatorio()}`,
        userId: null,
        name: p.name,
        firstName: p.firstName,
        lastName: p.lastName,
        handicap: p.handicap ?? null,
        team: equipo(p),
        isGuest: true,
        color: p.color,
        teeGender: p.teeGender,
      });
      continue;
    }
    const amigo = amigos.find((a) => a.otherUserId === p.userId);
    if (!amigo) {
      avisos.push({ tipo: 'noAmigo', nombre: p.name });
      continue;
    }
    if (!barraVale(p)) {
      avisos.push({ tipo: 'barra', propia: false, nombre: amigo.otherUserName, color: p.color });
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
      color: p.color,
      teeGender: p.teeGender,
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
      creatorTeeKey: miBarraVale ? teeKey(mio.color, mio.teeGender) : NO_TEE_KEY,
      participants: jugadores,
      scorerIds,
    },
  };
};
