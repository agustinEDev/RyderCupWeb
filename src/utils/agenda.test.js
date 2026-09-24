import { describe, it, expect } from 'vitest';
import { agendaPropuesta, partidosDeLaSesion, franjasLibres, diasDelTorneo } from './agenda';

/**
 * Las cuentas de la agenda (FE #654), sin pantalla.
 *
 *   #   caso                                                | qué sale
 *   ----|---------------------------------------------------|-------------------------------
 *   P1  un fin de semana (2 días)                           | 3 sesiones: sáb mañana y tarde, dom
 *   P2  un solo día                                         | 1 sesión (individuales)
 *   P3  diez días                                           | 18: el máximo que acepta el servidor
 *   P4  fechas que no se leen                               | null: no se propone nada
 *   C1  12 jugadores en individuales                        | 6 partidos
 *   C2  12 jugadores en parejas (fourball o foursomes)      | 3 partidos
 *   C3  impares: 11 en individuales                         | 5: el que sobra no juega
 *   C4  con equipos desiguales (6 y 5) en parejas           | 2: manda el equipo corto
 *   F1  las franjas libres de un día                        | las que no están cogidas, en orden
 *   D1  los días del torneo                                 | del primero al último, ambos incluidos
 */

describe('agendaPropuesta', () => {
  it('P1: un fin de semana son tres sesiones, dos al día y una el último', () => {
    expect(agendaPropuesta('2026-10-03', '2026-10-04')).toEqual({
      mode: 'AUTOMATIC',
      total_sessions: 3,
      sessions_per_day: 2,
    });
  });

  it('P2: un solo día es una sesión', () => {
    expect(agendaPropuesta('2026-10-03', '2026-10-03').total_sessions).toBe(1);
  });

  it('P3: nunca más de lo que acepta el servidor', () => {
    expect(agendaPropuesta('2026-10-01', '2026-10-10').total_sessions).toBe(18);
  });

  it('P4: con fechas que no se leen no se propone nada', () => {
    expect(agendaPropuesta('', '2026-10-04')).toBeNull();
    expect(agendaPropuesta('2026-10-05', '2026-10-04')).toBeNull();
  });
});

describe('partidosDeLaSesion', () => {
  it('C1: doce en individuales son seis partidos', () => {
    expect(partidosDeLaSesion('SINGLES', { jugadores: 12 })).toBe(6);
  });

  it('C2: doce en parejas son tres', () => {
    expect(partidosDeLaSesion('FOURBALL', { jugadores: 12 })).toBe(3);
    expect(partidosDeLaSesion('FOURSOMES', { jugadores: 12 })).toBe(3);
  });

  it('C3: con once, el que sobra no juega', () => {
    expect(partidosDeLaSesion('SINGLES', { jugadores: 11 })).toBe(5);
  });

  it('C4: con equipos, manda el corto', () => {
    expect(partidosDeLaSesion('FOURBALL', { equipoA: 6, equipoB: 5 })).toBe(2);
    expect(partidosDeLaSesion('SINGLES', { equipoA: 6, equipoB: 5 })).toBe(5);
  });
});

describe('franjasLibres y diasDelTorneo', () => {
  it('F1: las franjas que quedan libres ese día, en orden', () => {
    const sesiones = [
      { roundDate: '2026-10-03', sessionType: 'AFTERNOON' },
      { roundDate: '2026-10-04', sessionType: 'MORNING' },
    ];
    expect(franjasLibres(sesiones, '2026-10-03')).toEqual(['MORNING', 'EVENING']);
  });

  it('D1: los días del torneo, del primero al último', () => {
    expect(diasDelTorneo('2026-10-03', '2026-10-05')).toEqual([
      '2026-10-03',
      '2026-10-04',
      '2026-10-05',
    ]);
  });
});
