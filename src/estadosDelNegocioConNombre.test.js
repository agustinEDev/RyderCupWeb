import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { parse, tokenize } from 'espree';

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
 * o como clave de un objeto (`{ COMPLETED: '…' }`) fuera de src/domain. Los comentarios no cuentan (se lee el código por
 * fichas, no por líneas), ni los tests, ni src/pruebas, ni las traducciones.
 * Un código de error de la API que contiene la palabra ('DRAFT_IN_PROGRESS') es
 * otra palabra y no salta.
 *
 * Las excepciones van en PERMITIDOS, cada una con su fichero y su motivo. Una
 * excepción que ya no hace falta también hace fallar el test, para que la
 * lista no se quede vieja.
 */

const SRC = join(globalThis.process.cwd(), 'src');

// Las palabras de los estados y formatos que ya viven en el dominio. La lista
// es parcial a propósito: faltan las de los conceptos de la tanda E2b (tipos de
// actividad, validación del hoyo, roles, relación del perfil…), que hoy
// saldrían por todas partes
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
  'MORNING',
  'AFTERNOON',
  'EVENING',
  'PENDING_TEAMS',
  'PENDING_MATCHES',
  'WON',
  'LOST',
  'INCOMPLETE',
  'STOPPED',
  'DECLINED',
  'EXPIRED',
  'NO_ROOM',
  'ON_HOLD',
  'REQUESTED',
  'INVITED',
  'WITHDRAWN',
  'BLOCKED',
  'HALVED',
  // Tanda E2a (20 nov 2026): códigos de equipo, tipo de torneo, modo de juego,
  // género, visibilidad, montaje y reparto
  'A',
  'B',
  'RYDER_CUP',
  'SCRATCH',
  'HANDICAP',
  'MALE',
  'FEMALE',
  'PRIVATE',
  'PUBLIC',
  'AUTOMATIC',
  'MANUAL',
];

const TANTEO =
  'tanteo del resultado («CONCEDED», «W/O»), no estado del partido: el backend lo manda así en result.score';
const MODO_DE_PARTIDA_RAPIDA =
  'modo del asistente de partida rápida (MATCH_PLAY / FREE_PLAY): estado de la interfaz, no del backend';

/**
 * Las excepciones: fichero (relativo a src), palabra, por qué se queda y
 * cuántas veces sale. Va por recuento: una vez más de la palabra en un
 * fichero con excepción también falla, que la excepción es para lo que hay,
 * no para todo el fichero.
 *
 * Fuera de la lista, a propósito: el 'RETIRADO' de Clasificacion.jsx es un
 * estado solo del frontend, pendiente de revisar (E1-11). No es una de las
 * palabras vigiladas, así que no necesita excepción.
 *
 * @type {Array<{fichero: string, palabra: string, motivo: string, veces: number}>}
 */
const PERMITIDOS = [
  {
    fichero: 'components/feed/ActivityEventCard.jsx',
    palabra: 'CONCEDED',
    motivo: TANTEO,
    veces: 1,
  },
  {
    fichero: 'components/quick_match/CourseStep.jsx',
    palabra: 'MATCH_PLAY',
    motivo: MODO_DE_PARTIDA_RAPIDA,
    veces: 1,
  },
  {
    fichero: 'components/quick_match/useAjustesDelBorrador.js',
    palabra: 'MATCH_PLAY',
    motivo: MODO_DE_PARTIDA_RAPIDA,
    veces: 1,
  },
  {
    fichero: 'components/quick_match/createQuickMatchModalConstants.js',
    palabra: 'MATCH_PLAY',
    motivo: MODO_DE_PARTIDA_RAPIDA,
    veces: 1,
  },
  {
    fichero: 'utils/borradorParaRepetir.js',
    palabra: 'MATCH_PLAY',
    motivo: MODO_DE_PARTIDA_RAPIDA,
    veces: 1,
  },
  {
    fichero: 'utils/fichaDeLaCompeticion.js',
    palabra: 'PENDING',
    motivo:
      'reparto de equipos pendiente de una Ryder sin reparto todavía: estado solo del frontend, no del backend',
    veces: 1,
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
const literalesVigilados = (codigo) => {
  const fichas = tokenize(codigo, {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
    loc: true,
  });
  // Una clave de objeto sin comillas, `{ COMPLETED: 'x' }`: solo las propiedades
  // de un objeto que se construye (ObjectExpression), con nombre y sin `[…]`. No
  // cuentan los patrones (`const { COMPLETED: x } = o`, CodeRabbit #1185), ni
  // `{ COMPLETED }` abreviado, ni `a.COMPLETED`, `case COMPLETED:` o `a ? X : b`
  const claves = [];
  const recorre = (nodo) => {
    if (!nodo || typeof nodo.type !== 'string') return;
    if (nodo.type === 'ObjectExpression') {
      for (const p of nodo.properties) {
        if (
          p.type === 'Property' &&
          !p.computed &&
          !p.shorthand &&
          p.key.type === 'Identifier' &&
          PALABRAS.includes(p.key.name)
        ) {
          claves.push({ palabra: p.key.name, linea: p.key.loc.start.line });
        }
      }
    }
    for (const [campo, valor] of Object.entries(nodo)) {
      if (campo === 'parent' || campo === 'loc' || campo === 'range') continue;
      if (Array.isArray(valor)) valor.forEach(recorre);
      else if (valor && typeof valor === 'object') recorre(valor);
    }
  };
  recorre(
    parse(codigo, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      ecmaFeatures: { jsx: true },
      loc: true,
    }),
  );

  const literales = fichas.flatMap((t) => {
    // String: '…' y "…"; Template: `…` sin huecos; JSXText: value="…"
    if (!['String', 'Template', 'JSXText'].includes(t.type)) return [];
    const m = LITERAL.exec(t.value.trim());
    return m ? [{ palabra: m[2], linea: t.loc.start.line }] : [];
  });
  return [...literales, ...claves];
};

/**
 * Lo encontrado frente a las excepciones.
 * @param {Array<{fichero: string, palabra: string, linea: number}>} encontrados
 * @param {Array<{fichero: string, palabra: string, veces: number}>} permitidos
 * @returns {{sueltos: string[], descuadrados: string[], sobran: string[]}}
 *   sin excepción; con excepción pero otro número de veces; excepciones de
 *   algo que ya no está
 */
const frenteALasExcepciones = (encontrados, permitidos) => {
  const excepcionDe = ({ fichero, palabra }) =>
    permitidos.find((p) => p.fichero === fichero && p.palabra === palabra);
  const vecesDe = ({ fichero, palabra }) =>
    encontrados.filter((l) => l.fichero === fichero && l.palabra === palabra)
      .length;

  return {
    sueltos: encontrados
      .filter((l) => !excepcionDe(l))
      .map(({ fichero, linea, palabra }) => `${fichero}:${linea} '${palabra}'`),
    descuadrados: permitidos
      .filter((p) => vecesDe(p) > 0 && vecesDe(p) !== p.veces)
      .map(
        (p) =>
          `${p.fichero} '${p.palabra}': ${vecesDe(p)} veces, la excepción dice ${p.veces}`,
      ),
    sobran: permitidos
      .filter((p) => vecesDe(p) === 0)
      .map((p) => `${p.fichero} '${p.palabra}'`),
  };
};

describe('estados del negocio, con nombre fuera del dominio', () => {
  const encontrados = ficheros(SRC).flatMap((ruta) => {
    const fichero = relative(SRC, ruta).split(sep).join('/');
    return literalesVigilados(readFileSync(ruta, 'utf8')).map((l) => ({
      fichero,
      ...l,
    }));
  });
  const resultado = frenteALasExcepciones(encontrados, PERMITIDOS);

  it('ningún estado ni formato escrito a mano fuera de src/domain', () => {
    expect(resultado.sueltos).toEqual([]);
  });

  it('cada excepción cubre las veces que sale, ni una más', () => {
    expect(resultado.descuadrados).toEqual([]);
  });

  it('cada excepción tiene motivo y sigue haciendo falta', () => {
    for (const p of PERMITIDOS) {
      expect(p.motivo, `${p.fichero} '${p.palabra}'`).toMatch(/\S{3,}/);
      expect(p.veces, `${p.fichero} '${p.palabra}'`).toBeGreaterThan(0);
    }
    expect(resultado.sobran).toEqual([]);
  });

  it('las excepciones van por recuento: una vez de más en el mismo fichero falla', () => {
    const en = (fichero, palabra, linea) => ({ fichero, palabra, linea });
    const permitidos = [{ fichero: 'a.js', palabra: 'PENDING', veces: 1 }];

    expect(
      frenteALasExcepciones([en('a.js', 'PENDING', 3)], permitidos),
    ).toEqual({ sueltos: [], descuadrados: [], sobran: [] });
    expect(
      frenteALasExcepciones(
        [en('a.js', 'PENDING', 3), en('a.js', 'PENDING', 9)],
        permitidos,
      ).descuadrados,
    ).toEqual(["a.js 'PENDING': 2 veces, la excepción dice 1"]);
    expect(frenteALasExcepciones([en('a.js', 'DRAFT', 3)], permitidos)).toEqual(
      {
        sueltos: ["a.js:3 'DRAFT'"],
        descuadrados: [],
        sobran: ["a.js 'PENDING'"],
      },
    );
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
    // Una clave de un objeto también es la palabra escrita a mano
    expect(palabras("const m = { COMPLETED: 'x' };")).toEqual(['COMPLETED']);
    expect(palabras("const m = { a: 1, PENDING: 'x' };")).toEqual(['PENDING']);
    expect(palabras("const m = { 'DRAFT': 'x' };")).toEqual(['DRAFT']);
    // …pero no la propiedad de otro, una clave calculada, una variable, un
    // import, una etiqueta de case ni una rama de un ternario
    expect(palabras('const m = { [MatchStatus.COMPLETED]: 1 };')).toEqual([]);
    expect(palabras('x = a.COMPLETED;')).toEqual([]);
    expect(palabras('const { COMPLETED } = estados;')).toEqual([]);
    // Desestructurar con alias tampoco es escribir un estado (CodeRabbit, #1185)
    expect(palabras('const { COMPLETED: hecho } = estados;')).toEqual([]);
    expect(palabras('const f = ({ PENDING: p }) => p;')).toEqual([]);
    expect(palabras("import { COMPLETED } from './x';")).toEqual([]);
    expect(palabras('switch (a) { case COMPLETED: break; }')).toEqual([]);
    expect(palabras('x = a ? COMPLETED : PENDING;')).toEqual([]);
    expect(palabras("a === 'DRAFT_IN_PROGRESS'")).toEqual([]);
    expect(palabras("a === 'in_progress'")).toEqual([]);
    expect(palabras('const s = `status.${estado}`;')).toEqual([]);
    expect(palabras('<p>PENDING</p>')).toEqual([]);
  });
});
