import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

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
  /(?:^|[\s{,])['"]?uses['"]?\s*:\s*['"]?(?<accion>[^\s,}'"#]+)['"]?(?<resto>.*)$/;
const FIJADA = /^[\w.-]+\/[\w./-]+@[0-9a-f]{40}$/;
const DOCKER_FIJADA = /^docker:\/\/[^\s@]+@sha256:[0-9a-f]{64}$/;
const VERSION = /#\s*v\d+(\.\d+)*/;

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
  return [...workflows, ...acciones].map((ruta) => [
    ruta,
    readFileSync(ruta, 'utf8'),
  ]);
};

const malFijadas = (texto) =>
  texto
    .split('\n')
    .filter((linea) => !/^\s*#/.test(linea))
    .map((linea) => linea.match(USES))
    .filter(Boolean)
    .map(({ groups }) => ({ accion: groups.accion, resto: groups.resto }))
    .filter(
      ({ accion }) => !accion.startsWith('./') && !DOCKER_FIJADA.test(accion),
    )
    .filter(({ accion, resto }) => !FIJADA.test(accion) || !VERSION.test(resto))
    .map(({ accion }) => accion);

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
    const usos = lineas.filter((l) => USES.test(l));
    const sinReconocer = lineas.filter(
      (l) =>
        /['"]?\buses['"]?\s*:/.test(l) && !/^\s*#/.test(l) && !USES.test(l),
    );

    expect(usos.length).toBeGreaterThan(0);
    expect(sinReconocer).toEqual([]);
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
});
