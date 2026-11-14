import { nombreVisible } from './nombreVisible';
import { defaultAllowanceFor } from '../domain/services/defaultAllowance';
import {
  FORMAT_CAPACITY,
  MAX_SCORERS,
  NO_TEE_KEY,
  oppositeTeam,
  TEAM_FORMATS,
  teeKey,
} from './asistenteDePartidaRapida';
import { jugadorInvitado, jugadorRegistrado } from './jugadoresDelAsistente';

// Dónde se arregla cada cosa: el campo y tu barra, en el paso 1; los
// jugadores, en el 2. El asistente enseña cada aviso solo en su paso
const PASO_DEL_CAMPO = 1;
const PASO_DE_LOS_JUGADORES = 2;

/**
 * El borrador del asistente de partida rápida para repetir una (FE #1021):
 * lo que vale de la partida se copia, y lo que ya no, se deja fuera y se dice.
 *
 * Los jugadores tienen la forma de los del asistente (`jugadoresDelAsistente`):
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
  // El % por defecto de ese formato: si es el copiado, no cuenta como elegido
  // a mano, y cambiar de formato lo sigue moviendo (revisor)
  const copiado = partida.allowancePercentage ?? null;
  const porDefecto = defaultAllowanceFor(
    juegoLibre ? null : partida.matchFormat,
  );
  const comun = {
    matchName: partida.name ?? '',
    mode: juegoLibre ? 'FREE_PLAY' : 'MATCH_PLAY',
    matchFormat: partida.matchFormat ?? 'SINGLES',
    scoringFormat: partida.scoringFormat ?? 'STABLEFORD',
    allowanceOverride: copiado === porDefecto ? null : copiado,
    playMode: partida.playMode ?? 'HANDICAP',
    parejasDeAnotadores: parejasElegidas(partida, yo),
  };

  // Sin campo no hay barras ni plantilla que valgan: se empieza por él (R8)
  if (!campo?.isApproved?.()) {
    return {
      paso: PASO_DEL_CAMPO,
      avisos: [{ tipo: 'campo', paso: PASO_DEL_CAMPO }],
      inicial: {
        ...comun,
        selectedCourse: null,
        creatorTeeKey: NO_TEE_KEY,
        participants: [],
        scorerIds: [],
      },
    };
  }

  const barras = new Set(
    (campo.tees || []).map((t) => teeKey(t.color, t.gender)),
  );
  // Un campo sin barras no pide ninguna, como al crear la partida: nadie lleva
  // la de antes (el servidor rechazaría una que el campo no tiene)
  const sinBarras = barras.size === 0;
  const barraVale = (p) =>
    sinBarras || barras.has(teeKey(p.color, p.teeGender));
  const barraDe = (p) =>
    sinBarras
      ? { color: null, teeGender: null }
      : { color: p.color, teeGender: p.teeGender };
  // Quien no llevaba barra (el campo no tenía) no la «ha perdido»: le falta
  const avisoDeBarra = (p, nombre) => ({
    tipo: p.color ? 'barra' : 'sinBarra',
    propia: !nombre,
    ...(nombre ? { nombre } : {}),
    color: p.color,
    genero: p.teeGender,
    paso: nombre ? PASO_DE_LOS_JUGADORES : PASO_DEL_CAMPO,
  });
  const porEquipos = !juegoLibre && TEAM_FORMATS.includes(partida.matchFormat);
  const equipo = (p) => (porEquipos ? (p.team ?? null) : null);
  const avisos = [];

  const mio = partida.participants.find((p) => p.userId === yo.id);
  const miBarraVale = mio && barraVale(mio);
  if (mio && !miBarraVale) avisos.push(avisoDeBarra(mio));
  const jugadores = [
    jugadorRegistrado({
      userId: yo.id,
      name: nombreVisible(yo),
      handicap: yo.handicap ?? null,
      team: mio ? equipo(mio) : null,
      ...(miBarraVale ? barraDe(mio) : {}),
    }),
  ];

  for (const p of partida.participants) {
    if (p.userId === yo.id) continue;
    if (p.isGuest) {
      // Sin nombre y apellidos por separado (un servidor anterior a BE #717, o
      // lo guardado en el móvil antes) no se adivina: partir por un espacio
      // equivocaba los nombres compuestos sin decirlo (`/code-review`)
      if (!p.firstName || !p.lastName) {
        avisos.push({
          tipo: 'invitado',
          nombre: p.name,
          paso: PASO_DE_LOS_JUGADORES,
        });
        continue;
      }
      if (!barraVale(p)) {
        avisos.push(avisoDeBarra(p, p.name));
        continue;
      }
      jugadores.push(
        jugadorInvitado({
          firstName: p.firstName,
          lastName: p.lastName,
          handicap: p.handicap ?? null,
          team: equipo(p),
          ...barraDe(p),
        }),
      );
      continue;
    }
    const amigo = amigos.find((a) => a.otherUserId === p.userId);
    if (!amigo) {
      avisos.push({
        tipo: 'noAmigo',
        nombre: p.name,
        paso: PASO_DE_LOS_JUGADORES,
      });
      continue;
    }
    if (!barraVale(p)) {
      avisos.push(avisoDeBarra(p, amigo.otherUserName));
      continue;
    }
    jugadores.push(
      jugadorRegistrado({
        userId: p.userId,
        name: amigo.otherUserName,
        handicap: amigo.otherUserHandicap ?? null,
        team: equipo(p),
        ...barraDe(p),
      }),
    );
  }

  // Match play pide la plantilla completa, y una partida cancelada a medias
  // (pendiente, con menos jugadores) no la tenía: se dice y se completa en
  // Jugadores, en vez de un rechazo del servidor al confirmar (`/code-review`)
  const caben = juegoLibre ? null : FORMAT_CAPACITY[partida.matchFormat];
  if (
    caben &&
    jugadores.length < caben &&
    !avisos.some((a) => a.paso === PASO_DE_LOS_JUGADORES)
  ) {
    avisos.push({ tipo: 'faltan', paso: PASO_DE_LOS_JUGADORES });
  }

  // Quien repite anota siempre: el servidor lo exige al creador (R11)
  const siguen = new Set(
    jugadores.filter((p) => !p.isGuest).map((p) => p.userId),
  );
  const scorerIds = [
    yo.id,
    ...partida.scorerIds.filter((id) => id !== yo.id && siguen.has(id)),
  ].slice(0, MAX_SCORERS);

  const paso = avisos.length > 0 ? Math.min(...avisos.map((a) => a.paso)) : 4;

  return {
    paso,
    avisos,
    inicial: {
      ...comun,
      selectedCourse: campo,
      creatorTeeKey:
        miBarraVale && !sinBarras
          ? teeKey(mio.color, mio.teeGender)
          : NO_TEE_KEY,
      participants: jugadores,
      scorerIds,
    },
  };
};

/**
 * En foursomes se elige si anotan «las dos parejas» o «solo la mía», y esa
 * elección es lo que se conserva al cambiar jugadores (`anotadoresAlVolver`):
 * deducirla de los anotadores que siguen fallaba si el rival que anotaba ya no
 * es amigo (revisor, 4 nov 2026). Si enfrente no había ningún registrado, no
 * se ofreció la opción, así que no hubo elección. Se copia también si el campo
 * ya no vale (sin jugadores): es de la partida, no de sus jugadores.
 */
const parejasElegidas = (partida, yo) => {
  if (partida.scoringFormat || partida.matchFormat !== 'FOURSOMES') return null;
  // La eligió quien la creó: a otro que la repite no le toca heredarla
  // (`/code-review`)
  if (partida.creatorId !== yo.id) return null;
  const mio = partida.participants.find((p) => p.userId === yo.id);
  if (!mio?.team) return null;
  const rivales = partida.participants.filter(
    (p) => !p.isGuest && p.userId && p.team === oppositeTeam(mio.team),
  );
  if (rivales.length === 0) return null;
  return rivales.some((p) => partida.scorerIds.includes(p.userId))
    ? 'BOTH'
    : 'MINE';
};
