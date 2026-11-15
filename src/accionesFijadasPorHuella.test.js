import { describe, it, expect } from 'vitest';
import {
  readFileSync,
  readdirSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

/**
 * Toda acción de GitHub va fijada por la huella de su commit (auditoría de la fase 6,
 * INF-03, A08).
 *
 * Una etiqueta (`@v7`) o una rama se pueden mover: quien controle esa acción cambiaría el
 * código que corre en el CI, que tiene secretos y permiso de escritura en algunos jobs.
 * La huella (40 caracteres hexadecimales) no se mueve. Al lado va un comentario con la
 * versión, para leerla; Dependabot actualiza las dos cosas.
 *
 *   caso                                                 | qué pasa
 *   -----------------------------------------------------|------------------------------
 *   A1 cada `uses:` de cada workflow y acción compuesta  | `dueño/acción@<huella> # vX.Y`
 *   A2 una acción local (`./...`)                        | vale: es del propio repo
 *   A3 una imagen `docker://` por digest                 | vale
 *   A4 toda línea con `uses:` la reconoce el escáner      | si no, se le escaparía
 *   A5 el escáner                                        | distingue etiqueta, rama y huella,
 *                                                        | y la forma compacta `{uses: ...}`
 *   A7 dos ficheros con el mismo nombre                  | se revisan los dos (por su ruta)
 *   A8 varias acciones en una línea (forma compacta)     | se revisan todas
 *   A9 una acción local fuera de `.github/actions`       | se lee y se revisa también
 *   A6 trufflehog: la versión de su imagen               | la de la acción y por digest
 *
 * A6: la acción de trufflehog ejecuta una imagen de Docker (`version`, por defecto
 * `latest`). Dependabot sube la huella y el comentario de la acción, pero no ese
 * `version:`: si no coinciden, su PR falla aquí hasta que se actualicen los dos.
 */

// Desde la raíz del proyecto, como los demás vigilantes de src (Vitest arranca en ella)
const GITHUB = join(globalThis.process.cwd(), '.github');
// `uses` en cualquier sitio de la línea: también en la forma compacta de un paso
// (`- {name: x, uses: y}`) o con la clave entre comillas (CodeRabbit en BE #849)
const USES =
  /(?:^|[\s{,[])['"]?uses['"]?\s*:\s*['"]?(?<accion>[^\s,}\]'"#]+)['"]?/g;
// Cada clave `uses` de la línea, la reconozca o no USES: A4 compara las dos cuentas
const CLAVE_USES = /['"]?\buses['"]?\s*:/g;
const FIJADA = /^[\w.-]+\/[\w./-]+@[0-9a-f]{40}$/;
const DOCKER_FIJADA = /^docker:\/\/[^\s@]+@sha256:[0-9a-f]{64}$/;
const VERSION = /#\s*v\d+(\.\d+)*/;

/** Las acciones de una línea, todas (la forma compacta puede llevar varias). */
const usosDe = (linea) =>
  /^\s*#/.test(linea)
    ? []
    : [...linea.matchAll(USES)].map(({ groups }) => groups.accion);

/** Los `action.yml` de las acciones locales (`./...`) que se usan, estén donde estén. */
const accionesLocales = (pares, vistas = new Set()) => {
  const raiz = globalThis.process.cwd();
  const nuevas = pares
    .flatMap(([, texto]) => texto.split('\n').flatMap(usosDe))
    .filter((accion) => accion.startsWith('./'))
    .flatMap((accion) =>
      ['action.yml', 'action.yaml'].map((f) => join(raiz, accion, f)),
    )
    .filter((ruta) => existsSync(ruta) && !vistas.has(ruta));
  if (nuevas.length === 0) return [];
  nuevas.forEach((ruta) => vistas.add(ruta));
  const leidas = [...new Set(nuevas)].map((ruta) => [
    ruta,
    readFileSync(ruta, 'utf8'),
  ]);
  return [...leidas, ...accionesLocales(leidas, vistas)];
};

/** Los workflows y las acciones compuestas del repo, con su texto. */
const ficheros = () => {
  const workflows = readdirSync(join(GITHUB, 'workflows'))
    .filter((f) => /\.ya?ml$/.test(f))
    .map((f) => join(GITHUB, 'workflows', f));
  const acciones = existsSync(join(GITHUB, 'actions'))
    ? readdirSync(join(GITHUB, 'actions'), { recursive: true })
        .filter((f) => /(^|\/)action\.ya?ml$/.test(f))
        .map((f) => join(GITHUB, 'actions', f))
    : [];
  const pares = [...workflows, ...acciones].map((ruta) => [
    ruta,
    readFileSync(ruta, 'utf8'),
  ]);
  const yaLeidas = new Set(pares.map(([ruta]) => ruta));
  return [...pares, ...accionesLocales(pares, yaLeidas)];
};

const malFijadas = (texto) =>
  texto
    .split('\n')
    .flatMap((linea) =>
      usosDe(linea).map((accion) => ({
        accion,
        conVersion: VERSION.test(linea),
      })),
    )
    .filter(
      ({ accion }) => !accion.startsWith('./') && !DOCKER_FIJADA.test(accion),
    )
    .filter(({ accion, conVersion }) => !FIJADA.test(accion) || !conVersion)
    .map(({ accion }) => accion);

/** Las líneas con alguna clave `uses` que el escáner no reconoce. */
const sinReconocer = (lineas) =>
  lineas.filter(
    (l) =>
      !/^\s*#/.test(l) &&
      (l.match(CLAVE_USES) ?? []).length !== usosDe(l).length,
  );

/** Las mal fijadas de cada fichero, por su ruta: dos con el mismo nombre no se pisan. */
const revisa = (pares) =>
  Object.fromEntries(
    pares
      .map(([ruta, texto]) => [ruta, malFijadas(texto)])
      .filter(([, m]) => m.length > 0),
  );

describe('acciones de GitHub fijadas por huella (INF-03)', () => {
  it('A1: cada acción va por huella y con su versión al lado', () => {
    const todos = ficheros();
    expect(todos.length).toBeGreaterThan(0);

    expect(revisa(todos)).toEqual({});
  });

  it('A7: dos ficheros con el mismo nombre se revisan los dos', () => {
    const mala = 'runs:\n  steps:\n    - uses: actions/checkout@v7\n';
    const buena = 'runs:\n  steps:\n    - uses: ./.github/actions/otra\n';

    expect(
      revisa([
        ['actions/a/action.yml', mala],
        ['actions/b/action.yml', buena],
      ]),
    ).toEqual({ 'actions/a/action.yml': ['actions/checkout@v7'] });
  });

  it('A4: el escáner reconoce toda línea que usa una acción', () => {
    const lineas = ficheros().flatMap(([, texto]) => texto.split('\n'));
    const usos = lineas.filter((l) => usosDe(l).length > 0);
    const noVistas = sinReconocer(lineas);

    expect(usos.length).toBeGreaterThan(0);
    expect(noVistas).toEqual([]);
  });

  it('A6: trufflehog corre la imagen de su versión, por digest', () => {
    const ci = readFileSync(join(GITHUB, 'workflows', 'ci-cd.yml'), 'utf8');
    const accion = ci.match(
      /uses:\s*trufflesecurity\/trufflehog@[0-9a-f]{40}\s*#\s*v(?<version>[\d.]+)/,
    );
    const imagen = ci.match(
      /\n\s*version:\s*(?<version>[\d.]+)@sha256:[0-9a-f]{64}\s*\n/,
    );

    expect(accion?.groups.version).toBeTruthy();
    expect(imagen?.groups.version).toBe(accion.groups.version);
  });

  it('A5: el escáner distingue una etiqueta, una rama y una huella', () => {
    const huella = '3d3c42e5aac5ba805825da76410c181273ba90b1';
    expect(malFijadas('      - uses: actions/checkout@v7')).toEqual([
      'actions/checkout@v7',
    ]);
    expect(malFijadas('        uses: actions/checkout@main')).toEqual([
      'actions/checkout@main',
    ]);
    expect(malFijadas(`      - uses: actions/checkout@${huella}`)).toEqual([
      `actions/checkout@${huella}`,
    ]);
    expect(
      malFijadas(`      - uses: actions/checkout@${huella}  # v7.0.1`),
    ).toEqual([]);
    expect(malFijadas('      - uses: ./.github/actions/propia')).toEqual([]);
    expect(
      malFijadas(`      - uses: docker://ghcr.io/x/y@sha256:${'a'.repeat(64)}`),
    ).toEqual([]);
    expect(malFijadas('      - uses: docker://ghcr.io/x/y:latest')).toEqual([
      'docker://ghcr.io/x/y:latest',
    ]);
    // La forma compacta y la clave entre comillas (CodeRabbit en BE #849)
    expect(
      malFijadas('      - {name: Checkout, uses: actions/checkout@v7}'),
    ).toEqual(['actions/checkout@v7']);
    expect(malFijadas("      - 'uses': actions/checkout@v7")).toEqual([
      'actions/checkout@v7',
    ]);
  });

  it('A4: una línea con un `uses` sin reconocer no pasa, aunque tenga otro', () => {
    const huella = '3d3c42e5aac5ba805825da76410c181273ba90b1';
    expect(
      sinReconocer([`    steps: [{uses: a/b@${huella}}, {uses: }]`]),
    ).toHaveLength(1);
  });

  it('A8: con varias acciones en una línea se revisan todas (CodeRabbit)', () => {
    expect(
      malFijadas(
        '    steps: [{uses: ./.github/actions/propia}, {uses: actions/checkout@v7}]',
      ),
    ).toEqual(['actions/checkout@v7']);
  });

  it('A9: una acción local fuera de .github/actions se revisa (CodeRabbit)', () => {
    const raiz = mkdtempSync(join(tmpdir(), 'acciones-'));
    const cwd = globalThis.process.cwd;
    try {
      mkdirSync(join(raiz, 'acciones', 'propia'), { recursive: true });
      writeFileSync(
        join(raiz, 'acciones', 'propia', 'action.yml'),
        'runs:\n  steps:\n    - uses: actions/checkout@v7\n',
      );
      globalThis.process.cwd = () => raiz;
      const workflow = [['ci.yml', 'steps:\n  - uses: ./acciones/propia\n']];

      const leidas = accionesLocales(workflow);

      expect(leidas.map(([ruta]) => ruta)).toEqual([
        join(raiz, 'acciones', 'propia', 'action.yml'),
      ]);
      expect(revisa(leidas)).toEqual({
        [join(raiz, 'acciones', 'propia', 'action.yml')]: [
          'actions/checkout@v7',
        ],
      });
    } finally {
      globalThis.process.cwd = cwd;
      rmSync(raiz, { recursive: true, force: true });
    }
  });
});
