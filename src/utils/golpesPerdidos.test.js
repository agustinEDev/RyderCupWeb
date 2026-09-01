import { beforeEach, describe, expect, it, vi } from 'vitest';

// El entorno de este fichero no trae `localStorage`. Se define arriba del todo:
// hacerlo dentro de un `beforeEach` deja el módulo leyendo otro objeto
const almacen = (() => {
  let datos = {};
  return {
    getItem: (clave) => datos[clave] ?? null,
    setItem: (clave, valor) => { datos[clave] = String(valor); },
    removeItem: (clave) => { delete datos[clave]; },
    clear: () => { datos = {}; },
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: almacen, writable: true });

import { apunta, olvidaLosDe, olvidaTodos, pendientes } from './golpesPerdidos';

const aviso = (holeNumber, userId, matchId = 'm-1') =>
  ({ matchId, matchName: 'Meis', holeNumber, userId });

describe('golpesPerdidos (FE #521)', () => {
  beforeEach(() => {
    almacen.clear();
    vi.restoreAllMocks();
  });

  it('apunta un golpe que no se pudo guardar', () => {
    expect(apunta(aviso(7, 'usuario-A'))).toBe(true);
    expect(pendientes('usuario-A')).toEqual([
      expect.objectContaining({ holeNumber: 7, matchName: 'Meis' }),
    ]);
  });

  it('no se lo enseña a otra persona', () => {
    // En un móvil compartido, leer el nombre de la partida de quien estuvo
    // antes es una fuga, y encima en un aviso que no puede quitar
    apunta(aviso(7, 'usuario-A'));

    expect(pendientes('usuario-B')).toEqual([]);
  });

  it('el aviso de uno no se traga el del otro', () => {
    // Mismo hoyo, misma partida, personas distintas: son dos golpes perdidos.
    // Sin mirar el dueño, al segundo se le decía que había quedado apuntado
    apunta(aviso(7, 'usuario-A'));
    apunta(aviso(7, 'usuario-B'));

    expect(pendientes('usuario-A')).toHaveLength(1);
    expect(pendientes('usuario-B')).toHaveLength(1);
  });

  it('el mismo dos veces no se apunta dos veces', () => {
    apunta(aviso(7, 'usuario-A'));
    apunta(aviso(7, 'usuario-A'));

    expect(pendientes('usuario-A')).toHaveLength(1);
  });

  it('descartar los tuyos no borra los de otro sin leer', () => {
    apunta(aviso(7, 'usuario-A'));
    apunta(aviso(8, 'usuario-B'));

    olvidaLosDe('m-1', 'usuario-B');

    expect(pendientes('usuario-A')).toHaveLength(1);
    expect(pendientes('usuario-B')).toEqual([]);
  });

  it('los avisos sin dueño se siguen viendo y se pueden descartar', () => {
    // Guardados antes de que existiera el campo: cambiar el formato no puede
    // hacer desaparecer un aviso pendiente ni dejarlo imposible de quitar
    apunta(aviso(3, null));

    expect(pendientes('cualquiera')).toHaveLength(1);
    olvidaLosDe('m-1', 'cualquiera');
    expect(pendientes('cualquiera')).toEqual([]);
  });

  it('dice que NO cuando el móvil no puede guardar el aviso', () => {
    // Quien vacía tiene que mirarlo: si el aviso no cabe, el golpe no puede
    // borrarse de la cola o desaparecería sin dejar rastro
    vi.spyOn(almacen, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    expect(apunta(aviso(7, 'usuario-A'))).toBe(false);
  });

  it('el cierre de sesión se los lleva todos', () => {
    apunta(aviso(7, 'usuario-A'));
    apunta(aviso(8, 'usuario-B'));

    olvidaTodos();

    expect(pendientes()).toEqual([]);
  });

  it('aguanta un almacenamiento con basura dentro', () => {
    almacen.setItem('rydercup-golpes-perdidos', 'esto no es json');

    expect(pendientes('usuario-A')).toEqual([]);
  });
});
