import { describe, it, expect } from 'vitest';
import { conLaMiaPrimero, conMiNombrePrimero } from './ordenDeLasTarjetas';

const esMia = (fila) => fila.mia === true;
const equipoDe = (fila) => fila.team;

describe('conLaMiaPrimero', () => {
  it('sube la fila propia al primer puesto', () => {
    const filas = [
      { id: 'rival', team: 'B' },
      { id: 'yo', team: 'A', mia: true },
    ];

    expect(conLaMiaPrimero(filas, { esMia, equipoDe }).map((f) => f.id)).toEqual(['yo', 'rival']);
  });

  it('pone al compañero justo detrás y deja al resto en su orden', () => {
    const filas = [
      { id: 'rival-1', team: 'B' },
      { id: 'rival-2', team: 'B' },
      { id: 'companero', team: 'A' },
      { id: 'yo', team: 'A', mia: true },
    ];

    expect(conLaMiaPrimero(filas, { esMia, equipoDe }).map((f) => f.id)).toEqual([
      'yo',
      'companero',
      'rival-1',
      'rival-2',
    ]);
  });

  /**
   * Quien no juega la partida —un espectador, quien organiza la competición— no
   * tiene fila que subir: el orden que manda el servidor es el que se lee.
   */
  it('deja la lista intacta cuando quien mira no juega', () => {
    const filas = [
      { id: 'a', team: 'A' },
      { id: 'b', team: 'B' },
    ];

    expect(conLaMiaPrimero(filas, { esMia, equipoDe })).toBe(filas);
  });

  it('sin bandos sube solo la fila propia', () => {
    const filas = [
      { id: 'uno' },
      { id: 'dos' },
      { id: 'yo', mia: true },
      { id: 'tres' },
    ];

    expect(conLaMiaPrimero(filas, { esMia }).map((f) => f.id)).toEqual([
      'yo',
      'uno',
      'dos',
      'tres',
    ]);
  });

  /**
   * Un `team` vacío no es un bando: con él, el rango del compañero se lo
   * llevaban todos los demás y la lista sí se reordenaba.
   */
  it('no trata un bando vacío como bando', () => {
    const filas = [
      { id: 'otro', team: '' },
      { id: 'yo', team: '', mia: true },
      { id: 'tercero', team: '' },
    ];

    expect(conLaMiaPrimero(filas, { esMia, equipoDe }).map((f) => f.id)).toEqual([
      'yo',
      'otro',
      'tercero',
    ]);
  });

  it('no muta la lista que recibe', () => {
    const filas = [
      { id: 'rival', team: 'B' },
      { id: 'yo', team: 'A', mia: true },
    ];

    conLaMiaPrimero(filas, { esMia, equipoDe });

    expect(filas.map((f) => f.id)).toEqual(['rival', 'yo']);
  });

  it('devuelve la lista tal cual sin accesor de fila propia', () => {
    const filas = [{ id: 'a' }, { id: 'b' }];

    expect(conLaMiaPrimero(filas, {})).toBe(filas);
    expect(conLaMiaPrimero(filas)).toBe(filas);
  });
});

describe('conMiNombrePrimero', () => {
  const esMio = (miembro) => miembro.id === 'yo';

  it('pone al que mira delante de su compañero', () => {
    const miembros = [{ id: 'companero' }, { id: 'yo' }];

    expect(conMiNombrePrimero(miembros, esMio).map((m) => m.id)).toEqual(['yo', 'companero']);
  });

  it('deja los miembros en su orden cuando quien mira no es del bando', () => {
    const miembros = [{ id: 'uno' }, { id: 'dos' }];

    expect(conMiNombrePrimero(miembros, esMio).map((m) => m.id)).toEqual(['uno', 'dos']);
  });

  /**
   * Devuelve una copia también cuando no mueve nada: quien la reciba puede
   * ordenarla, y el array de miembros de la tarjeta decide quién es el dueño de
   * la bola del bando.
   */
  it('nunca devuelve el array de miembros de la tarjeta', () => {
    const miembros = [{ id: 'uno' }, { id: 'dos' }];

    expect(conMiNombrePrimero(miembros, esMio)).not.toBe(miembros);
    expect(conMiNombrePrimero(miembros)).not.toBe(miembros);
  });

  /**
   * Ordenar aquí una copia y no el array de miembros es lo que mantiene intacto
   * al dueño de la bola del bando, que es su primer miembro.
   */
  it('no muta el array de miembros', () => {
    const miembros = [{ id: 'companero' }, { id: 'yo' }];

    conMiNombrePrimero(miembros, esMio);

    expect(miembros.map((m) => m.id)).toEqual(['companero', 'yo']);
  });
});
