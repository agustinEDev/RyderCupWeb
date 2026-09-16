import { describe, it, expect, beforeEach } from 'vitest';
import { recuerda, loQueSeSupo, olvida, olvidaTodo, recuerdaLaLista, laUltimaLista, olvidaLoDeEstaCuenta, precarga, recuerdaLosPartidos, losUltimosPartidos } from './loUltimoConocido';

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

  it('la que se está jugando no es la primera en caer', () => {
    // El sondeo reescribe su entrada cada diez segundos. Si eso no la moviera
    // al final, al abrir una cuarta partida se iría justo la que se está
    // jugando, que es la única que de verdad hace falta sin cobertura
    for (const n of [1, 2, 3]) recuerda(`m-${n}`, lo(n));
    recuerda('m-1', lo(1));

    recuerda('m-4', lo(4));

    expect(loQueSeSupo('m-1')).not.toBeNull();
    expect(loQueSeSupo('m-2')).toBeNull();
  });

  it('la lista no se guarda entera: comparte sitio con los golpes sin enviar', () => {
    recuerdaLaLista(Array.from({ length: 50 }, (_, i) => ({ id: `m-${i}` })));

    expect(laUltimaLista().length).toBeLessThanOrEqual(20);
  });

  it('al cerrar sesión se va todo: son datos de esta cuenta', () => {
    recuerda('m-1', lo(1));
    recuerdaLaLista([{ id: 'm-1' }]);

    olvidaLoDeEstaCuenta();

    expect(loQueSeSupo('m-1')).toBeNull();
    expect(laUltimaLista()).toBeNull();
  });

  it('guardar lo mismo no vuelve a escribir', () => {
    // Corre en cada sondeo, toda la vuelta, en el hilo que atiende los botones
    recuerda('m-1', lo(1));
    let escrituras = 0;
    const original = localStorage.setItem;
    localStorage.setItem = (...a) => { escrituras += 1; return original(...a); };

    recuerda('m-1', lo(1));

    expect(escrituras).toBe(0);
  });

  it('cerrada la sesión ya no se vuelve a escribir', () => {
    // El cierre duro sale con una redirección, y esa navegación no es
    // instantánea: una petición en vuelo contesta después del borrado y repone
    // lo que se acaba de quitar, y eso sí sobrevive a la redirección
    recuerda('m-1', lo(1));
    recuerdaLaLista([{ id: 'm-1' }]);

    olvidaLoDeEstaCuenta();
    recuerda('m-1', lo(1));
    recuerdaLaLista([{ id: 'm-1' }]);

    expect(loQueSeSupo('m-1')).toBeNull();
    expect(laUltimaLista()).toBeNull();
  });

  it('pero un cambio sí se guarda', () => {
    recuerda('m-1', lo(1));

    recuerda('m-1', { partida: { id: 'm-1', holeScores: [{ holeNumber: 1 }] }, campo: null });

    expect(loQueSeSupo('m-1').partida.holeScores).toHaveLength(1);
  });
});

/**
 * LA TABLA P — lo precargado para el campo (FE #615).
 *
 *   caso                                        | qué pasa
 *   --------------------------------------------|---------------------------------
 *   6  hay sitio                                | se guarda, marcada como precargada
 *   6  ya hay dos precargadas                   | se va la precargada más vieja, no
 *                                               | una abierta
 *   6  lleno, con golpes en la cola de una      | esa no se toca
 *   6  lleno, la última abierta                 | esa no se toca
 *   6  lleno y nada se puede ir                 | no se guarda, y lo dice
 *   6b se abre de verdad una precargada         | deja de contar como precargada
 *   6c se precarga una que ya estaba abierta    | no se toca: la pantalla guardó algo más nuevo
 *   6d se vuelve a precargar una precargada     | se refresca
 *   6e la tanda hace sitio                      | no se echa a sí misma (en partidosSinCobertura)
 *   8  el almacenamiento se niega               | lo dice, no revienta
 *   10 lista de partidos, y cierre de sesión    | clave propia, y se va con la cuenta
 */
describe('loUltimoConocido, lo precargado', () => {
  beforeEach(() => {
    const guardado = new Map();
    globalThis.localStorage = {
      getItem: (k) => (guardado.has(k) ? guardado.get(k) : null),
      setItem: (k, v) => guardado.set(k, String(v)),
      removeItem: (k) => guardado.delete(k),
    };
    olvidaTodo();
  });

  const lo = (n) => ({ partida: { id: `m-${n}`, holeScores: [] }, campo: null });
  const guardadas = () => JSON.parse(localStorage.getItem('rydercup-ultimo-conocido'));

  it('con sitio, se guarda y se puede pintar', () => {
    expect(precarga('m-1', lo(1))).toBe(true);

    expect(loQueSeSupo('m-1').partida.id).toBe('m-1');
    expect(guardadas()[0].precargada).toBe(true);
  });

  it('nunca ocupa más de dos: la tercera echa a la precargada más vieja, no a una abierta', () => {
    recuerda('a-1', lo(1));
    precarga('p-1', lo(2));
    precarga('p-2', lo(3));

    expect(precarga('p-3', lo(4))).toBe(true);

    expect(loQueSeSupo('a-1')).not.toBeNull();
    expect(loQueSeSupo('p-1')).toBeNull();
    expect(loQueSeSupo('p-2')).not.toBeNull();
    expect(loQueSeSupo('p-3')).not.toBeNull();
  });

  it('con sitio libre pero dos precargadas ya, la tercera no ocupa el hueco de lo que se abra', () => {
    precarga('p-1', lo(1));
    precarga('p-2', lo(2));

    precarga('p-3', lo(3));

    expect(loQueSeSupo('p-1')).toBeNull();
    expect(guardadas()).toHaveLength(2);
  });

  it('lleno, no echa a una partida con golpes en la cola', () => {
    // Es la que hace falta para ver lo que falta por enviar
    recuerda('a-1', lo(1));
    recuerda('a-2', lo(2));
    recuerda('a-3', lo(3));

    precarga('p-1', lo(4), { protegidas: new Set(['a-1']) });

    expect(loQueSeSupo('a-1')).not.toBeNull();
    expect(loQueSeSupo('a-2')).toBeNull();
    expect(loQueSeSupo('p-1')).not.toBeNull();
  });

  it('lleno, no echa a la última que se abrió de verdad', () => {
    recuerda('a-1', lo(1));
    recuerda('a-2', lo(2));
    recuerda('a-3', lo(3));

    precarga('p-1', lo(4), { protegidas: new Set(['a-1', 'a-2']) });

    expect(loQueSeSupo('a-3')).not.toBeNull();
    expect(loQueSeSupo('p-1')).toBeNull();
  });

  it('si no se puede echar a nadie, no se guarda y lo dice', () => {
    recuerda('a-1', lo(1));
    recuerda('a-2', lo(2));
    recuerda('a-3', lo(3));

    expect(precarga('p-1', lo(4), { protegidas: new Set(['a-1', 'a-2']) })).toBe(false);
  });

  it('abrir de verdad una precargada la convierte en abierta', () => {
    precarga('p-1', lo(1));

    recuerda('p-1', lo(1));

    expect(guardadas()[0].precargada).toBeUndefined();
  });

  it('una que ya se abrió de verdad no la toca: lo de la pantalla de anotación es más nuevo', () => {
    // La precarga sale del panel sin esperarla. Si el jugador abre el partido
    // mientras tanto, esa pantalla guarda su foto —con los golpes ya enviados—
    // y la respuesta tardía del panel la devolvía a la de antes
    recuerda('a-1', { partida: { id: 'm-1', holeScores: [{ holeNumber: 1 }] }, campo: null });

    expect(precarga('a-1', lo(1))).toBe(true);

    expect(loQueSeSupo('a-1').partida.holeScores).toHaveLength(1);
    expect(guardadas()[0].precargada).toBeUndefined();
  });

  it('una precargada sí se refresca', () => {
    precarga('p-1', lo(1));

    precarga('p-1', { partida: { id: 'm-1', holeScores: [{ holeNumber: 1 }] }, campo: null });

    expect(loQueSeSupo('p-1').partida.holeScores).toHaveLength(1);
  });

  it('si el almacenamiento se niega, lo dice en vez de reventar', () => {
    localStorage.setItem = () => { throw new Error('quota'); };

    expect(precarga('p-1', lo(1))).toBe(false);
  });

  it('cerrada la sesión, tampoco se precarga', () => {
    olvidaLoDeEstaCuenta();

    expect(precarga('p-1', lo(1))).toBe(false);
  });

  it('la lista de partidos de competición no pisa la de partidas rápidas', () => {
    recuerdaLaLista([{ id: 'qm-1' }]);

    recuerdaLosPartidos([{ id: 'm-1' }, { id: 'm-2' }]);

    expect(laUltimaLista()).toEqual([{ id: 'qm-1' }]);
    expect(losUltimosPartidos()).toHaveLength(2);
  });

  it('sin partidos guardados no hay lista, y una rota no se da por buena', () => {
    expect(losUltimosPartidos()).toBeNull();

    localStorage.setItem('rydercup-ultimos-partidos', '{"no":"es una lista"}');

    expect(losUltimosPartidos()).toBeNull();
  });

  it('al cerrar sesión se van también los partidos', () => {
    recuerdaLosPartidos([{ id: 'm-1' }]);

    olvidaLoDeEstaCuenta();
    recuerdaLosPartidos([{ id: 'm-1' }]);

    expect(losUltimosPartidos()).toBeNull();
  });
});
