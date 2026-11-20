import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSePuedeTerminarLaCompeticion } from './useSePuedeTerminarLaCompeticion';
import { CompetitionStatusEnum } from '../domain/value_objects/CompetitionStatus';

/**
 * Quién mira si se puede terminar una competición de stroke play en juego: la
 * misma regla de «quién gestiona» que la ficha y la agenda.
 *
 *   #   quién                                   | lo mira
 *   ----|---------------------------------------|--------
 *   T1  quien la creó                           | sí
 *   T2  con el rol de organizador / admin       | sí
 *   T3  otro jugador                            | no
 *   T4  sin usuario identificado (ni creador)   | no, ni con rol ni como admin
 */
vi.mock('../composition', () => ({
  getTeeGroupsUseCase: { execute: vi.fn() },
}));

const enJuego = {
  hasTeams: false,
  status: CompetitionStatusEnum.IN_PROGRESS,
  creatorId: 'org',
};

const mira = ({
  competition = enJuego,
  userId,
  hasCreatorRole = false,
  isAdmin = false,
}) =>
  renderHook(() =>
    useSePuedeTerminarLaCompeticion({
      competition,
      hasCreatorRole,
      isAdmin,
      userId,
      agendaLeida: null,
      versionDePartidas: 0,
    }),
  ).result.current.leeSiTerminar;

describe('useSePuedeTerminarLaCompeticion: quién lo mira', () => {
  it('T1: quien la creó', () => {
    expect(mira({ userId: 'org' })).toBe(true);
  });

  it.each([
    ['con el rol de organizador', true, false],
    ['como admin', false, true],
  ])('T2: %s', (_, hasCreatorRole, isAdmin) => {
    expect(mira({ userId: 'otro', hasCreatorRole, isAdmin })).toBe(true);
  });

  it('T3: otro jugador, no', () => {
    expect(mira({ userId: 'otro' })).toBe(false);
  });

  it.each([
    ['sin rol', false, false],
    ['ni con el rol de organizador', true, false],
    ['ni como admin', false, true],
  ])('T4: sin usuario identificado, no: %s', (_, hasCreatorRole, isAdmin) => {
    expect(
      mira({
        competition: { ...enJuego, creatorId: undefined },
        userId: undefined,
        hasCreatorRole,
        isAdmin,
      }),
    ).toBe(false);
  });
});
