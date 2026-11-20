import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useState } from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useJugadoresDelBorrador } from './useJugadoresDelBorrador';

/**
 * Los jugadores del borrador (paso 2):
 *
 *   #   caso                                                    | qué pasa
 *   ----|-------------------------------------------------------|------------------------------
 *   J1  avanzar sin campo / con las barras cargando / sin barra | el aviso de cada uno; no avanza
 *   J2  avanzar bien                                          | quien crea, primero, con su barra
 *   J3  volver y avanzar sin cambiar campo ni formato          | se conserva, con su barra nueva
 *   J4  volver y cambiar el formato                            | se empieza de nuevo
 *   J5  añadir amigo sin barra / con su equipo lleno           | aviso; no entra
 *   J6  invitado con nombre en blanco                          | aviso de nombre
 *   J7  invitado bien                                          | entra y el formulario se vacía
 *   J8  en el paso 2, los amigos (menos los ya añadidos)       | leeTodosLosAmigos
 *   J9  hándicap vacío de un registrado                        | el de su perfil
 *   J10 2 → 3 → 2 rápido y las lecturas llegan al revés         | se queda la última
 */
const mockLeeTodosLosAmigos = vi.fn();
vi.mock('./leeTodosLosAmigos', () => ({
  leeTodosLosAmigos: (...a) => mockLeeTodosLosAmigos(...a),
}));

const yo = { id: 'u1', firstName: 'Yo', lastName: 'Mismo', handicap: 10 };
const TEES = [{ color: 'YELLOW', gender: 'MALE' }];
const campo = { id: 'gc-a', name: 'Campo A' };

const useConJugadores = (inicial = {}) => {
  const [step, setStep] = useState(inicial.step ?? 1);
  const [opciones, setOpciones] = useState({
    selectedCourse: campo,
    mode: 'MATCH_PLAY',
    matchFormat: 'SINGLES',
    isTeamFormat: false,
    capacity: 2,
    courseTees: TEES,
    teesLoading: false,
    creatorTeeKey: 'YELLOW|MALE',
    ...inicial,
  });
  const [error, setError] = useState(null);
  const jugadores = useJugadoresDelBorrador({
    copia: null,
    currentUser: yo,
    step,
    setStep,
    setError,
    ...opciones,
  });
  return { ...jugadores, step, setStep, error, setOpciones };
};

const evento = { preventDefault: () => {} };

describe('useJugadoresDelBorrador', () => {
  beforeEach(() => {
    mockLeeTodosLosAmigos.mockReset();
    mockLeeTodosLosAmigos.mockResolvedValue([]);
  });

  it.each([
    [{ selectedCourse: null }, 'create.course.errorCourseRequired'],
    [{ teesLoading: true }, 'create.course.errorTeeRequired'],
    [{ creatorTeeKey: '' }, 'create.course.errorTeeRequired'],
  ])('J1: %o no deja avanzar (%s)', (opciones, aviso) => {
    const { result } = renderHook(() => useConJugadores(opciones));
    act(() => result.current.handleCourseNext());
    expect(result.current.error).toBe(aviso);
    expect(result.current.step).toBe(1);
    expect(result.current.participants).toEqual([]);
  });

  it('J1b: un campo sin barras deja avanzar sin barra', () => {
    const { result } = renderHook(() =>
      useConJugadores({ courseTees: [], creatorTeeKey: '' }),
    );
    act(() => result.current.handleCourseNext());
    expect(result.current.step).toBe(2);
  });

  it('J2: avanzar pone a quien crea, con su hándicap y su barra', () => {
    const { result } = renderHook(() => useConJugadores());
    act(() => result.current.handleCourseNext());
    expect(result.current.step).toBe(2);
    expect(result.current.error).toBeNull();
    expect(result.current.participants).toEqual([
      expect.objectContaining({
        userId: 'u1',
        handicap: 10,
        team: null,
        color: 'YELLOW',
        teeGender: 'MALE',
      }),
    ]);
  });

  it('J3: volver y avanzar igual conserva la plantilla, con la barra nueva', () => {
    const { result } = renderHook(() => useConJugadores());
    act(() => result.current.handleCourseNext());
    act(() =>
      result.current.handleAddFriend(
        { otherUserId: 'u2', otherUserName: 'Luis', otherUserHandicap: 5 },
        'YELLOW|MALE',
      ),
    );
    act(() => result.current.handleBackToCourse());
    expect(result.current.step).toBe(1);
    act(() =>
      result.current.setOpciones((o) => ({
        ...o,
        courseTees: [...TEES, { color: 'WHITE', gender: 'MALE' }],
        creatorTeeKey: 'WHITE|MALE',
      })),
    );
    act(() => result.current.handleCourseNext());
    expect(result.current.participants.map((p) => p.userId)).toEqual([
      'u1',
      'u2',
    ]);
    expect(result.current.participants[0].color).toBe('WHITE');
  });

  it('J4: con otro formato, la plantilla empieza de nuevo', () => {
    const { result } = renderHook(() => useConJugadores());
    act(() => result.current.handleCourseNext());
    act(() =>
      result.current.handleAddFriend(
        { otherUserId: 'u2', otherUserName: 'Luis' },
        'YELLOW|MALE',
      ),
    );
    act(() => result.current.handleBackToCourse());
    act(() =>
      result.current.setOpciones((o) => ({
        ...o,
        matchFormat: 'FOURBALL',
        capacity: 4,
        isTeamFormat: true,
      })),
    );
    act(() => result.current.handleCourseNext());
    expect(result.current.participants).toHaveLength(1);
    expect(result.current.participants[0].team).toBe('A');
  });

  it('J5: un amigo sin barra, o con su equipo lleno, no entra', () => {
    const { result } = renderHook(() =>
      useConJugadores({
        matchFormat: 'FOURBALL',
        capacity: 4,
        isTeamFormat: true,
      }),
    );
    act(() => result.current.handleCourseNext());
    act(() => result.current.handleAddFriend({ otherUserId: 'u2' }, ''));
    expect(result.current.error).toBe('create.participants.errorTeeRequired');
    act(() =>
      result.current.handleAddFriend(
        { otherUserId: 'u2', otherUserName: 'Luis' },
        'YELLOW|MALE',
      ),
    );
    expect(result.current.error).toBeNull();
    // El equipo A (el de quien crea) ya tiene a sus dos
    act(() =>
      result.current.handleAddFriend(
        { otherUserId: 'u3', otherUserName: 'Eva' },
        'YELLOW|MALE',
      ),
    );
    expect(result.current.error).toBe('create.participants.errorTeamFull');
    expect(result.current.participants).toHaveLength(2);
    expect(result.current.rosterFull).toBe(false);
  });

  it('J6: un invitado con el nombre en blanco no entra', () => {
    const { result } = renderHook(() => useConJugadores());
    act(() => result.current.handleCourseNext());
    act(() => result.current.handleGuestFirstNameChange('   '));
    act(() => result.current.handleGuestLastNameChange('Gil'));
    act(() => result.current.handleAddGuest(evento));
    expect(result.current.error).toBe('create.participants.errorGuestName');
    expect(result.current.participants).toHaveLength(1);
  });

  it('J7: un invitado bien entra y el formulario se vacía', () => {
    const { result } = renderHook(() => useConJugadores());
    act(() => result.current.handleCourseNext());
    act(() => result.current.handleGuestFirstNameChange(' Ana '));
    act(() => result.current.handleGuestLastNameChange('Gil'));
    act(() => result.current.handleAddGuest(evento));
    expect(result.current.error).toBe('create.participants.errorTeeRequired');
    act(() => result.current.setGuestTeeKey('YELLOW|MALE'));
    act(() => result.current.handleConfirmGuestHandicap(12.5));
    act(() => result.current.handleAddGuest(evento));
    expect(result.current.error).toBeNull();
    expect(result.current.participants[1]).toEqual(
      expect.objectContaining({
        isGuest: true,
        firstName: 'Ana',
        lastName: 'Gil',
        handicap: 12.5,
        color: 'YELLOW',
      }),
    );
    expect(result.current.guestForm.firstName).toBe('');
    expect(result.current.guestTeeKey).toBe('');
    expect(result.current.rosterFull).toBe(true);
    expect(result.current.registeredParticipants).toHaveLength(1);

    act(() =>
      result.current.handleRemoveParticipant(
        result.current.participants[1].participantId,
      ),
    );
    expect(result.current.participants).toHaveLength(1);
  });

  it('J8: en el paso 2 se leen tus amigos, sin los ya añadidos', async () => {
    mockLeeTodosLosAmigos.mockResolvedValue([
      { otherUserId: 'u2' },
      { otherUserId: 'u1' },
    ]);
    const { result } = renderHook(() => useConJugadores());
    expect(mockLeeTodosLosAmigos).not.toHaveBeenCalled();
    act(() => result.current.handleCourseNext());
    await waitFor(() =>
      expect(result.current.availableFriends).toEqual([{ otherUserId: 'u2' }]),
    );
    expect(mockLeeTodosLosAmigos).toHaveBeenCalledWith('u1');
  });

  it('J10: si vas y vuelves al paso 2, una lectura vieja no pisa la nueva', async () => {
    const lecturas = [];
    mockLeeTodosLosAmigos.mockImplementation(
      () =>
        new Promise((resolve) => {
          lecturas.push(resolve);
        }),
    );
    const { result } = renderHook(() => useConJugadores());
    act(() => result.current.handleCourseNext());
    act(() => result.current.setStep(3));
    act(() => result.current.setStep(2));
    expect(lecturas).toHaveLength(2);
    // La nueva llega antes; la vieja, después
    await act(async () => lecturas[1]([{ otherUserId: 'nuevo' }]));
    await act(async () => lecturas[0]([{ otherUserId: 'viejo' }]));
    expect(result.current.availableFriends).toEqual([{ otherUserId: 'nuevo' }]);
  });

  it('J9: el hándicap vacío de un registrado vuelve al de su perfil', () => {
    const { result } = renderHook(() => useConJugadores());
    act(() => result.current.handleCourseNext());
    act(() =>
      result.current.setEditingHandicapParticipant(
        result.current.participants[0],
      ),
    );
    act(() => result.current.handleConfirmParticipantHandicap(3));
    expect(result.current.participants[0].handicap).toBe(3);
    expect(result.current.editingHandicapParticipant).toBeNull();
    act(() =>
      result.current.setEditingHandicapParticipant(
        result.current.participants[0],
      ),
    );
    act(() => result.current.handleConfirmParticipantHandicap(null));
    expect(result.current.participants[0].handicap).toBe(10);
  });
});
