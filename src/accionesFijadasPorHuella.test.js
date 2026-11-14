import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
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
 *   caso                                     | qué pasa
 *   -----------------------------------------|-----------------------------------
 *   P1/P3 cada `uses:` de cada workflow      | `dueño/acción@<huella>  # vX.Y.Z`
 *   una acción local (`./...`)               | vale: es del propio repo
 *   el escáner                               | distingue etiqueta, rama y huella
 */

const WORKFLOWS = join(globalThis.process.cwd(), '.github', 'workflows');
const USES = /^\s*-?\s*uses:\s*(?<accion>[^\s#]+)(?<resto>.*)$/;
const FIJADA = /^[\w.-]+\/[\w./-]+@[0-9a-f]{40}$/;
const VERSION = /#\s*v\d+(\.\d+)*/;

const malFijadas = (texto) =>
  texto
    .split('\n')
    .map((linea) => linea.match(USES))
    .filter(Boolean)
    .map(({ groups }) => ({
      accion: groups.accion.replace(/^['"]|['"]$/g, ''),
      resto: groups.resto,
    }))
    .filter(({ accion }) => !accion.startsWith('./'))
    .filter(({ accion, resto }) => !FIJADA.test(accion) || !VERSION.test(resto))
    .map(({ accion }) => accion);

describe('acciones de GitHub fijadas por huella (INF-03)', () => {
  it('cada acción de cada workflow va por huella y con su versión al lado', () => {
    const ficheros = readdirSync(WORKFLOWS).filter((f) => /\.ya?ml$/.test(f));
    expect(ficheros.length).toBeGreaterThan(0);
    // Que el escáner vea acciones: si un día no casara con nada, pasaría en vacío
    const usos = ficheros.flatMap((f) =>
      readFileSync(join(WORKFLOWS, f), 'utf8')
        .split('\n')
        .filter((linea) => USES.test(linea)),
    );
    expect(usos.length).toBeGreaterThan(0);

    const malas = Object.fromEntries(
      ficheros
        .map((f) => [f, malFijadas(readFileSync(join(WORKFLOWS, f), 'utf8'))])
        .filter(([, m]) => m.length > 0),
    );

    expect(malas).toEqual({});
  });

  it('el escáner distingue una etiqueta, una rama y una huella', () => {
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
  });
});
