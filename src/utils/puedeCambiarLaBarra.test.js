import { describe, it, expect } from 'vitest';
import { puedeCambiarLaBarra } from './puedeCambiarLaBarra';

/**
 * Quién puede cambiar la barra de una inscripción (FE #1214, la misma regla
 * que el backend, RyderCupAm#912):
 *
 *   #    quién                      | antes de empezar | en curso | terminada / cancelada
 *   -----|----------------------------|------------------|----------|----------------------
 *   P1   el propio jugador          | sí               | no       | no
 *   P2   capitán de SU equipo       | sí               | sí       | no
 *   P3   capitán del OTRO equipo    | no               | no       | no
 *   P4   subcapitán de su equipo    | no (si no es él) | no       | no
 *   P5   quien gestiona (organizador o admin) | sí     | sí       | no
 *   P6   otro jugador               | no               | no       | no
 *   P7   sin usuario                | no               | no       | no
 *   P8   capitán sin equipos formados (sin reparto) | no  | no     | no
 */
const captains = {
  teamA: 'capi-a',
  teamB: 'capi-b',
  viceTeamA: 'vice-a',
  viceTeamB: 'vice-b',
};
const reparto = {
  teamAPlayerIds: ['capi-a', 'vice-a', 'ana'],
  teamBPlayerIds: ['capi-b', 'vice-b', 'beto'],
};
const puede = (userId, estado, extra = {}) =>
  puedeCambiarLaBarra({
    estado,
    userId,
    jugadorId: 'ana',
    gestiona: false,
    captains,
    reparto,
    ...extra,
  });

describe('puedeCambiarLaBarra', () => {
  it.each(['DRAFT', 'ACTIVE', 'CLOSED'])(
    'P1: el propio jugador antes de empezar (%s), sí',
    (estado) => {
      expect(puede('ana', estado)).toBe(true);
    },
  );

  it('P1: el propio jugador con la competición en curso, no', () => {
    expect(puede('ana', 'IN_PROGRESS')).toBe(false);
  });

  it.each(['ACTIVE', 'CLOSED', 'IN_PROGRESS'])(
    'P2: el capitán de su equipo (%s), sí',
    (estado) => {
      expect(puede('capi-a', estado)).toBe(true);
    },
  );

  it('P2: el capitán, la suya con la competición en curso, sí', () => {
    expect(puede('capi-a', 'IN_PROGRESS', { jugadorId: 'capi-a' })).toBe(true);
  });

  it.each(['CLOSED', 'IN_PROGRESS'])(
    'P3: el capitán del otro equipo (%s), no',
    (estado) => {
      expect(puede('capi-b', estado)).toBe(false);
    },
  );

  it('P4: el subcapitán de su equipo, no', () => {
    expect(puede('vice-a', 'CLOSED')).toBe(false);
    expect(puede('vice-a', 'IN_PROGRESS')).toBe(false);
  });

  it.each(['DRAFT', 'ACTIVE', 'CLOSED', 'IN_PROGRESS'])(
    'P5: quien gestiona (%s), sí',
    (estado) => {
      expect(puede('orga', estado, { gestiona: true })).toBe(true);
    },
  );

  it.each([
    ['el propio jugador', 'ana', {}],
    ['su capitán', 'capi-a', {}],
    ['quien gestiona', 'orga', { gestiona: true }],
  ])('terminada o cancelada: %s, no', (_quien, userId, extra) => {
    expect(puede(userId, 'COMPLETED', extra)).toBe(false);
    expect(puede(userId, 'CANCELLED', extra)).toBe(false);
  });

  it('P6: otro jugador, no', () => {
    expect(puede('beto', 'ACTIVE')).toBe(false);
  });

  it('P7: sin usuario, no (aunque llegue «gestiona»)', () => {
    expect(puede(undefined, 'ACTIVE', { gestiona: true })).toBe(false);
    expect(puede(null, 'ACTIVE', { jugadorId: null })).toBe(false);
  });

  it('P8: el capitán sin equipos formados, no', () => {
    expect(puede('capi-a', 'CLOSED', { reparto: null })).toBe(false);
    expect(puede('capi-a', 'CLOSED', { captains: null })).toBe(false);
  });
});
