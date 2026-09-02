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

import { apunta, olvidaEl, olvidaLosDe, olvidaTodos, pendientes, ponleNombre } from './golpesPerdidos';

const aviso = (holeNumber, userId, matchId = 'm-1') =>
  ({ matchId, matchName: 'Meis', holeNumber, userId });

describe('golpesPerdidos (FE #521)', () => {
  beforeEach(() => {
    almacen.clear();
    vi.restoreAllMocks();
  });

  it('el mismo hoyo de dos jugadores son DOS avisos, no uno', () => {
    // En una partida rápida se anota a varios desde un móvil: del hoyo 7 hay
    // una entrada por participante. Sin mirar el participante, el segundo
    // rechazo se daba por apuntado, `apunta` devolvía true sin escribir, y
    // quien llamaba borraba el golpe igual: cuatro perdidos y un solo aviso
    expect(apunta({ ...aviso(7, 'usuario-A'), participantId: 'p-1' })).toBe(true);
    expect(apunta({ ...aviso(7, 'usuario-A'), participantId: 'p-2' })).toBe(true);

    expect(pendientes('usuario-A')).toHaveLength(2);
  });

  it('y reanotar a uno no borra el aviso de los otros', () => {
    apunta({ ...aviso(7, 'usuario-A'), participantId: 'p-1' });
    apunta({ ...aviso(7, 'usuario-A'), participantId: 'p-2' });

    olvidaEl('m-1', 7, 'usuario-A', 'p-1');

    expect(pendientes('usuario-A')).toEqual([
      expect.objectContaining({ participantId: 'p-2' }),
    ]);
  });

  it('en competición, sin participante, se va el del hoyo', () => {
    apunta(aviso(7, 'usuario-A'));

    olvidaEl('m-1', 7, 'usuario-A');

    expect(pendientes('usuario-A')).toHaveLength(0);
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

  describe('ponleNombre (FE #551)', () => {
    it('rellena solo lo que falta, y no pisa lo que ya tenía', () => {
      apunta({ matchId: 'm-1', matchName: null, matchNumber: null, holeNumber: 7, userId: 'usuario-A' });
      apunta({ matchId: 'm-1', matchName: 'Como se apuntó', matchNumber: null, holeNumber: 8, userId: 'usuario-A' });
      apunta({ matchId: 'm-2', matchName: null, matchNumber: null, holeNumber: 1, userId: 'usuario-A' });

      expect(ponleNombre('m-1', { matchName: 'Meis', matchNumber: 3 })).toBe(true);

      expect(pendientes('usuario-A')).toEqual([
        expect.objectContaining({ holeNumber: 7, matchName: 'Meis', matchNumber: 3 }),
        expect.objectContaining({ holeNumber: 8, matchName: 'Como se apuntó', matchNumber: 3 }),
        // La otra partida no se toca
        expect.objectContaining({ matchId: 'm-2', matchName: null, matchNumber: null }),
      ]);
    });

    it('no escribe si no hay nada que rellenar', () => {
      // Corre en cada carga de la vista: escribir siempre desgasta el disco y
      // hace fallar en un móvil lleno algo que no necesitaba escribir
      apunta({ matchId: 'm-1', matchName: 'Meis', matchNumber: 3, holeNumber: 7, userId: 'usuario-A' });
      const escribe = vi.spyOn(almacen, 'setItem');

      expect(ponleNombre('m-1', { matchName: 'Otro', matchNumber: 9 })).toBe(true);
      expect(ponleNombre('m-1', {})).toBe(true);

      expect(escribe).not.toHaveBeenCalled();
    });

    it('dice que NO si hacía falta escribir y no se pudo', () => {
      apunta({ matchId: 'm-1', matchName: null, matchNumber: null, holeNumber: 7, userId: 'usuario-A' });
      vi.spyOn(almacen, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      expect(ponleNombre('m-1', { matchName: 'Meis' })).toBe(false);
    });
  });
});
