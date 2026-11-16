import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * «No hay próximos» se olvida en cuanto se hace algo que puede dar un partido
 * desde otra pantalla (Agustín, 16 nov 2026, FE #1152): al volver al panel no
 * se pinta «¿Partido improvisado?» sin comprobarlo.
 *
 *   camino                                         | caso de uso
 *   -----------------------------------------------|--------------------------------
 *   P1 aceptar (o rechazar) una invitación         | respondToInvitationUseCase
 *   P2 inscribirse o pedir inscripción             | requestEnrollmentUseCase
 *   P3 crear una partida rápida                    | createAndStartQuickMatchUseCase
 *   P4 coger plaza en una franja de stroke play    | takeTeeWindowPlaceUseCase
 *   P5 apuntarse a la espera de una franja         | joinWaitingListUseCase
 *   P6 «entendido» a una plaza asignada            | acknowledgeAssignedPlaceUseCase
 *   P7 el organizador genera los partidos          | generateMatchesUseCase
 *   P8 el organizador cambia jugadores de partido  | reassignPlayersUseCase
 *   P9 el organizador genera las partidas          | generateTeeGroupsUseCase
 *   P10 el organizador mueve a alguien de partida  | moveTeeGroupPlayerUseCase
 *   P11 si falla                                   | no se olvida
 *   P12 lo que no da partidos (p. ej. ver la compartida) | no se olvida
 *
 * Unirse a la partida rápida de otro o «aceptar» una compartida no existen en la
 * aplicación: la compartida es de solo lectura y la rápida la crea quien la juega.
 */
const olvidaQueNoHayProximos = vi.hoisted(() => vi.fn());
vi.mock('../services/loUltimoConocido', async (original) => ({
  ...(await original()),
  olvidaQueNoHayProximos,
}));

const respuesta = { contesta: () => Promise.resolve({}) };
vi.mock('../infrastructure/http/api.js', async (original) => {
  const real = await original();
  const apiRequest = (...args) => respuesta.contesta(...args);
  return { ...real, default: apiRequest, apiRequest };
});

const composicion = await import('./index');

const invitacion = {
  id: 'inv-1',
  competition_id: 'c-1',
  inviter_id: 'u-9',
  invitee_user_id: 'u-1',
  status: 'ACCEPTED',
};
const inscripcion = {
  id: '11111111-1111-4111-8111-111111111111',
  competition_id: '22222222-2222-4222-8222-222222222222',
  user_id: '33333333-3333-4333-8333-333333333333',
  status: 'APPROVED',
};

// [camino, caso de uso, argumentos, lo que contesta el servidor]
const CAMINOS = [
  ['P1', 'respondToInvitationUseCase', ['inv-1', 'ACCEPT'], invitacion],
  ['P2', 'requestEnrollmentUseCase', ['c-1'], inscripcion],
  [
    'P3',
    'createAndStartQuickMatchUseCase',
    [
      {
        quickMatchId: 'qm-1',
        golfCourseId: 'gc-1',
        matchFormat: 'SINGLES',
        scorerUserIds: ['u-1'],
      },
    ],
    {
      id: 'qm-1',
      creator_id: 'u-1',
      golf_course_id: 'gc-1',
      match_format: 'SINGLES',
      status: 'IN_PROGRESS',
    },
  ],
  ['P4', 'takeTeeWindowPlaceUseCase', ['r-1'], {}],
  ['P5', 'joinWaitingListUseCase', ['r-1'], {}],
  ['P6', 'acknowledgeAssignedPlaceUseCase', ['r-1'], {}],
  ['P7', 'generateMatchesUseCase', ['r-1'], {}],
  ['P8', 'reassignPlayersUseCase', ['m-1', ['u-1'], ['u-2']], {}],
  ['P9', 'generateTeeGroupsUseCase', ['r-1', 'HIGH_FIRST'], {}],
  ['P10', 'moveTeeGroupPlayerUseCase', ['r-1', { userId: 'u-1' }], {}],
];

describe('olvidar «no hay próximos» al hacer algo que puede dar un partido', () => {
  beforeEach(() => {
    olvidaQueNoHayProximos.mockClear();
    respuesta.contesta = () => Promise.resolve({});
  });

  it.each(CAMINOS)(
    '%s: %s lo olvida al salir bien',
    async (_, nombre, args, cuerpo) => {
      // Given el servidor contesta bien
      respuesta.contesta = () => Promise.resolve(cuerpo);

      // When se hace
      await composicion[nombre].execute(...args);

      // Then se olvida que no había próximos
      expect(olvidaQueNoHayProximos).toHaveBeenCalledTimes(1);
    },
  );

  it.each(CAMINOS)(
    'P11 (%s): %s no lo olvida si falla',
    async (_, nombre, args) => {
      // Given el servidor lo rechaza
      respuesta.contesta = () =>
        Promise.reject(Object.assign(new Error('No'), { status: 409 }));

      // When se intenta
      await expect(composicion[nombre].execute(...args)).rejects.toThrow();

      // Then no se olvida
      expect(olvidaQueNoHayProximos).not.toHaveBeenCalled();
    },
  );

  it('P12: lo que no da partidos no lo olvida', async () => {
    // Given ver una partida compartida o la lista de invitaciones
    respuesta.contesta = () =>
      Promise.resolve({ id: 'qm-1', participants: [], invitations: [] });

    // When se hace
    await composicion.getSharedQuickMatchUseCase
      .execute('qm-1')
      .catch(() => {});

    // Then no se olvida
    expect(olvidaQueNoHayProximos).not.toHaveBeenCalled();
  });
});
