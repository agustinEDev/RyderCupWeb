import { describe, it, expect, beforeEach } from 'vitest';
import { recuerda, loQueSeSupo, olvida, olvidaTodo, recuerdaLaLista, laUltimaLista } from './loUltimoConocido';

/**
 * LA TABLA M — lo último que se supo de una partida.
 *
 *   caso                              | qué pasa
 *   ----------------------------------|--------------------------------------
 *   se guarda y se lee                | vuelve tal cual, con su campo
 *   una partida que nunca se abrió    | no hay nada
 *   se abren muchas                   | caben las últimas; las viejas se van
 *   se olvida una                     | esa se va, las demás siguen
 *   el almacenamiento se niega        | lo dice, no revienta
 */
describe('loUltimoConocido', () => {
  beforeEach(() => {
    const guardado = new Map();
    globalThis.localStorage = {
      getItem: (k) => (guardado.has(k) ? guardado.get(k) : null),
      setItem: (k, v) => guardado.set(k, String(v)),
      removeItem: (k) => guardado.delete(k),
    };
    olvidaTodo();
  });

  const lo = (n) => ({ partida: { id: `m-${n}`, holeScores: [] }, campo: { holes: [{ holeNumber: 1 }] } });

  it('lo guardado vuelve tal cual, con su campo', () => {
    recuerda('m-1', lo(1));

    const leido = loQueSeSupo('m-1');
    expect(leido.partida.id).toBe('m-1');
    expect(leido.campo.holes).toHaveLength(1);
  });

  it('de una partida que nunca se abrió no hay nada', () => {
    expect(loQueSeSupo('m-9')).toBeNull();
  });

  it('caben las últimas, y las viejas se van', () => {
    // El almacenamiento del navegador es pequeño y ahí vive también la cola de
    // golpes sin enviar: perder eso sí sería grave
    for (const n of [1, 2, 3, 4]) recuerda(`m-${n}`, lo(n));

    expect(loQueSeSupo('m-1')).toBeNull();
    expect(loQueSeSupo('m-4')).not.toBeNull();
    expect(loQueSeSupo('m-2')).not.toBeNull();
  });

  it('volver a abrir una que ya estaba no la cuenta dos veces', () => {
    for (const n of [1, 2, 3]) recuerda(`m-${n}`, lo(n));
    recuerda('m-1', lo(1));

    expect(loQueSeSupo('m-2')).not.toBeNull();
    expect(loQueSeSupo('m-1')).not.toBeNull();
  });

  it('olvidar una deja a las demás', () => {
    recuerda('m-1', lo(1));
    recuerda('m-2', lo(2));

    olvida('m-1');

    expect(loQueSeSupo('m-1')).toBeNull();
    expect(loQueSeSupo('m-2')).not.toBeNull();
  });

  it('si el almacenamiento se niega, lo dice en vez de reventar', () => {
    localStorage.setItem = () => { throw new Error('quota'); };

    expect(recuerda('m-1', lo(1))).toBe(false);
  });

  it('con el almacenamiento roto, leer no revienta', () => {
    localStorage.getItem = () => '{ esto no es json';

    expect(loQueSeSupo('m-1')).toBeNull();
  });

  it('la lista de partidas también se guarda: hay que poder llegar', () => {
    // La pantalla de anotación sabe pintarse sola, pero sin lista no hay por
    // dónde entrar en ella
    recuerdaLaLista([{ id: 'm-1', name: 'Meis' }]);

    expect(laUltimaLista()).toHaveLength(1);
  });

  it('sin lista guardada no hay lista', () => {
    expect(laUltimaLista()).toBeNull();
  });

  it('una lista rota no se da por buena', () => {
    localStorage.setItem('rydercup-ultima-lista', '{"no":"es una lista"}');

    expect(laUltimaLista()).toBeNull();
  });
});
