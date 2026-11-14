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
 *   A5 el escáner                                        | distingue etiqueta, rama y huella
 */

const GITHUB = join(globalThis.process.cwd(), '.github');
const USES = /^\s*-?\s*uses:\s*(?<accion>[^\s#]+)(?<resto>.*)$/;
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
    .map((linea) => linea.match(USES))
    .filter(Boolean)
    .map(({ groups }) => ({
      accion: groups.accion.replace(/^['"]|['"]$/g, ''),
      resto: groups.resto,
    }))
    .filter(
      ({ accion }) => !accion.startsWith('./') && !DOCKER_FIJADA.test(accion),
    )
    .filter(({ accion, resto }) => !FIJADA.test(accion) || !VERSION.test(resto))
    .map(({ accion }) => accion);

describe('acciones de GitHub fijadas por huella (INF-03)', () => {
  it('A1: cada acción va por huella y con su versión al lado', () => {
    const todos = ficheros();
    expect(todos.length).toBeGreaterThan(0);

    const malas = Object.fromEntries(
      todos
        .map(([ruta, texto]) => [ruta, malFijadas(texto)])
        .filter(([, m]) => m.length > 0),
    );

    expect(malas).toEqual({});
  });

  it('A4: el escáner reconoce toda línea que usa una acción', () => {
    const lineas = ficheros().flatMap(([, texto]) => texto.split('\n'));
    const usos = lineas.filter((l) => USES.test(l));
    const sinReconocer = lineas.filter(
      (l) => /^\s*-?\s*uses:/.test(l) && !USES.test(l),
    );

    expect(usos.length).toBeGreaterThan(0);
    expect(sinReconocer).toEqual([]);
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
  });
});
