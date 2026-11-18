import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { tokenize } from 'espree';

/**
 * Los estados y formatos del negocio, fuera del dominio, con nombre (Tabla E1,
 * 18 nov 2026).
 *
 * El backend manda los estados como texto ('IN_PROGRESS', 'FOURSOMES'…). Escritos
 * a mano por la interfaz, la misma palabra significaba cosas distintas
 * (IN_PROGRESS es estado de competición, de partido, de ronda, de draft…) y las
 * listas se repetían. Ahora viven en src/domain (CompetitionStatusEnum,
 * MatchStatus, MatchFormat…) y fuera de él se usan por su nombre.
 *
 * Este test falla si una de esas palabras vuelve a aparecer como texto literal
 * fuera de src/domain. Los comentarios no cuentan (se lee el código por
 * fichas, no por líneas), ni los tests, ni src/pruebas, ni las traducciones.
 * Un código de error de la API que contiene la palabra ('DRAFT_IN_PROGRESS') es
 * otra palabra y no salta.
 *
 * Las excepciones van en PERMITIDOS, cada una con su fichero y su motivo. Una
 * excepción que ya no hace falta también hace fallar el test, para que la
 * lista no se quede vieja.
 */

const SRC = join(globalThis.process.cwd(), 'src');

const PALABRAS = [
  'IN_PROGRESS',
  'COMPLETED',
  'DRAFT',
  'ACTIVE',
  'CLOSED',
  'PENDING',
  'SCHEDULED',
  'CANCELLED',
  'APPROVED',
  'REJECTED',
  'ACCEPTED',
  'STROKE_PLAY',
  'MATCH_PLAY',
  'FOURBALL',
  'FOURSOMES',
  'SINGLES',
  'UNFINISHED',
  'WALKOVER',
  'CONCEDED',
  'PENDING_APPROVAL',
  'MEDAL',
  'STABLEFORD',
];

const TIPO_DE_TORNEO =
  'tipo de torneo (TournamentType), no formato de puntuación: queda para otra tanda';
const TANTEO =
  'tanteo del resultado («CONCEDED», «W/O»), no estado del partido: el backend lo manda así en result.score';
const MODO_DE_PARTIDA_RAPIDA =
  'modo del asistente de partida rápida (MATCH_PLAY / FREE_PLAY): estado de la interfaz, no del backend';

/**
 * Las excepciones: fichero (relativo a src), palabra y por qué se queda.
 *
 * Fuera de la lista, a propósito: el 'RETIRADO' de Clasificacion.jsx es un
 * estado solo del frontend, pendiente de revisar (E1-11). No es una de las
 * palabras vigiladas, así que no necesita excepción.
 *
 * @type {Array<{fichero: string, palabra: string, motivo: string}>}
 */
const PERMITIDOS = [
  {
    fichero: 'components/competition/CompetitionTypeChooser.jsx',
    palabra: 'STABLEFORD',
    motivo: TIPO_DE_TORNEO,
  },
  {
    fichero: 'components/competition/CompetitionTypeChooser.jsx',
    palabra: 'MEDAL',
    motivo: TIPO_DE_TORNEO,
  },
  {
    fichero: 'components/scoring/Clasificacion.jsx',
    palabra: 'MEDAL',
    motivo: TIPO_DE_TORNEO,
  },
  {
    fichero: 'components/scoring/TarjetasDeLaPartida.jsx',
    palabra: 'MEDAL',
    motivo: TIPO_DE_TORNEO,
  },
  {
    fichero: 'components/feed/ActivityEventCard.jsx',
    palabra: 'CONCEDED',
    motivo: TANTEO,
  },
  {
    fichero: 'components/scoring/LeaderboardView.jsx',
    palabra: 'CONCEDED',
    motivo: TANTEO,
  },
  {
    fichero: 'components/quick_match/CourseStep.jsx',
    palabra: 'MATCH_PLAY',
    motivo: MODO_DE_PARTIDA_RAPIDA,
  },
  {
    fichero: 'components/quick_match/CreateQuickMatchModal.jsx',
    palabra: 'MATCH_PLAY',
    motivo: MODO_DE_PARTIDA_RAPIDA,
  },
  {
    fichero: 'components/quick_match/createQuickMatchModalConstants.js',
    palabra: 'MATCH_PLAY',
    motivo: MODO_DE_PARTIDA_RAPIDA,
  },
  {
    fichero: 'utils/borradorParaRepetir.js',
    palabra: 'MATCH_PLAY',
    motivo: MODO_DE_PARTIDA_RAPIDA,
  },
  {
    fichero: 'infrastructure/mappers/TeeGroupScoringMapper.js',
    palabra: 'PENDING',
    motivo:
      'estado de validación del hoyo (validation status), no de la partida: queda para otra tanda',
  },
  {
    fichero: 'pages/player/PlayerProfilePage.jsx',
    palabra: 'ACCEPTED',
    motivo:
      'relación de amistad del perfil (NONE / PENDING_SENT / PENDING_RECEIVED / ACCEPTED / BLOCKED), no FriendshipStatus: queda para otra tanda',
  },
  {
    fichero: 'utils/fichaDeLaCompeticion.js',
    palabra: 'PENDING',
    motivo:
      'reparto de equipos pendiente de una Ryder sin reparto todavía: estado solo del frontend, no del backend',
  },
];

// Lo que no se mira: el dominio (es donde viven), los tests, las ayudas de los
// tests y las traducciones
const FUERA = /^(domain|pruebas|i18n)(\/|$)/;

const ficheros = (dir) =>
  readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    const relativa = relative(SRC, ruta).split(sep).join('/');
    if (FUERA.test(relativa)) return [];
    if (statSync(ruta).isDirectory()) return ficheros(ruta);
    return /\.(js|jsx)$/.test(nombre) && !/\.test\.|\.spec\./.test(nombre)
      ? [ruta]
      : [];
  });

const LITERAL = new RegExp(`^(['"\`])(${PALABRAS.join('|')})\\1$`);

/**
 * Las palabras vigiladas que aparecen como texto literal en un código.
 * @param {string} codigo
 * @returns {Array<{palabra: string, linea: number}>}
 */
const literalesVigilados = (codigo) =>
  tokenize(codigo, {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
    loc: true,
  })
    // String: '…' y "…"; Template: `…` sin huecos; JSXText: value="…"
    .filter((t) => ['String', 'Template', 'JSXText'].includes(t.type))
    .map((t) => ({ m: LITERAL.exec(t.value.trim()), linea: t.loc.start.line }))
    .filter(({ m }) => m)
    .map(({ m, linea }) => ({ palabra: m[2], linea }));

describe('estados del negocio, con nombre fuera del dominio', () => {
  const encontrados = ficheros(SRC).flatMap((ruta) => {
    const fichero = relative(SRC, ruta).split(sep).join('/');
    return literalesVigilados(readFileSync(ruta, 'utf8')).map((l) => ({
      fichero,
      ...l,
    }));
  });

  const permitido = ({ fichero, palabra }) =>
    PERMITIDOS.some((p) => p.fichero === fichero && p.palabra === palabra);

  it('ningún estado ni formato escrito a mano fuera de src/domain', () => {
    const sueltos = encontrados
      .filter((l) => !permitido(l))
      .map(({ fichero, linea, palabra }) => `${fichero}:${linea} '${palabra}'`);

    expect(sueltos).toEqual([]);
  });

  it('cada excepción tiene motivo y sigue haciendo falta', () => {
    for (const p of PERMITIDOS) {
      expect(p.motivo, `${p.fichero} '${p.palabra}'`).toMatch(/\S{3,}/);
    }
    const sobran = PERMITIDOS.filter(
      (p) =>
        !encontrados.some(
          (l) => l.fichero === p.fichero && l.palabra === p.palabra,
        ),
    ).map((p) => `${p.fichero} '${p.palabra}'`);

    expect(sobran).toEqual([]);
  });

  it('el escáner ve el texto literal y deja pasar comentarios, nombres y otras palabras', () => {
    const palabras = (codigo) =>
      literalesVigilados(codigo).map(({ palabra }) => palabra);

    expect(palabras("a === 'IN_PROGRESS'")).toEqual(['IN_PROGRESS']);
    expect(palabras('a === "FOURSOMES"')).toEqual(['FOURSOMES']);
    expect(palabras('a === `DRAFT`')).toEqual(['DRAFT']);
    expect(palabras('const x = <option value="PENDING">y</option>;')).toEqual([
      'PENDING',
    ]);
    expect(palabras("// a === 'IN_PROGRESS'\n/* 'DRAFT' */ x")).toEqual([]);
    expect(palabras('a === MatchStatus.IN_PROGRESS')).toEqual([]);
    expect(palabras("const m = { COMPLETED: 'x' };")).toEqual([]);
    expect(palabras("a === 'DRAFT_IN_PROGRESS'")).toEqual([]);
    expect(palabras("a === 'in_progress'")).toEqual([]);
    expect(palabras('const s = `status.${estado}`;')).toEqual([]);
    expect(palabras('<p>PENDING</p>')).toEqual([]);
  });
});
