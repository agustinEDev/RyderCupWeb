import { describe, it, expect } from 'vitest';
import { useState } from 'react';
import { renderHook, act } from '@testing-library/react';
import { useAnotadoresDelBorrador } from './useAnotadoresDelBorrador';

/**
 * Quién anota (paso 3):
 *
 *   #   caso                                                  | qué pasa
 *   ----|-----------------------------------------------------|------------------------------
 *   A1  primera entrada, individual                          | anota quien crea
 *   A2  foursomes con rivales registrados                    | las dos parejas
 *   A3  foursomes sin rivales registrados                    | solo la mía
 *   A4  elegir «solo la mía» y volver a entrar igual         | se conserva
 *   A5  máximo de anotadores y quitar uno                    | no pasa de 4
 *   A6  al resumen sin anotadores                            | aviso; no avanza
 */
const yo = { id: 'u1' };
const registrado = (id, team = null) => ({
  participantId: id,
  userId: id,
  team,
  isGuest: false,
});

const useConAnotadores = (inicial) => {
  const [step, setStep] = useState(2);
  const [error, setError] = useState(null);
  const [jugadores, setJugadores] = useState(inicial.participants);
  const anotadores = useAnotadoresDelBorrador({
    copia: null,
    currentUser: yo,
    participants: jugadores,
    registeredParticipants: jugadores.filter((p) => !p.isGuest),
    mode: 'MATCH_PLAY',
    matchFormat: inicial.matchFormat ?? 'SINGLES',
    isFoursomes: inicial.matchFormat === 'FOURSOMES',
    setStep,
    setError,
  });
  return { ...anotadores, step, error, setJugadores };
};

describe('useAnotadoresDelBorrador', () => {
  it('A1: la primera vez, en individual anota quien crea', () => {
    const { result } = renderHook(() =>
      useConAnotadores({ participants: [registrado('u1'), registrado('u2')] }),
    );
    act(() => result.current.goToScorers());
    expect(result.current.step).toBe(3);
    expect(result.current.scorerIds).toEqual(['u1']);
    expect(result.current.rivalCanScore()).toBe(false);
  });

  it('A2: en foursomes con rivales registrados, las dos parejas', () => {
    const { result } = renderHook(() =>
      useConAnotadores({
        matchFormat: 'FOURSOMES',
        participants: [
          registrado('u1', 'A'),
          registrado('u2', 'A'),
          registrado('u3', 'B'),
          registrado('u4', null),
        ],
      }),
    );
    act(() => result.current.goToScorers());
    expect(result.current.scorerIds).toEqual(['u1', 'u2', 'u3']);
    expect(result.current.rivalCanScore()).toBe(true);
    expect(result.current.partnerCanScore()).toBe(true);
  });

  it('A3: en foursomes sin rivales registrados, solo la mía', () => {
    const { result } = renderHook(() =>
      useConAnotadores({
        matchFormat: 'FOURSOMES',
        participants: [registrado('u1', 'A')],
      }),
    );
    act(() => result.current.goToScorers());
    expect(result.current.scorerIds).toEqual(['u1']);
    expect(result.current.partnerCanScore()).toBe(false);
  });

  it('A4: lo elegido se conserva al volver a entrar con los mismos', () => {
    const { result } = renderHook(() =>
      useConAnotadores({
        matchFormat: 'FOURSOMES',
        participants: [registrado('u1', 'A'), registrado('u3', 'B')],
      }),
    );
    act(() => result.current.goToScorers());
    act(() => result.current.eligeParejas('MINE'));
    expect(result.current.scorerIds).toEqual(['u1']);
    act(() => result.current.handleBackToParticipants());
    expect(result.current.step).toBe(2);
    act(() => result.current.goToScorers());
    expect(result.current.scorerIds).toEqual(['u1']);
    // Con otro jugador, la pareja elegida sigue mandando
    act(() =>
      result.current.setJugadores((j) => [...j, registrado('u5', 'B')]),
    );
    act(() => result.current.goToScorers());
    expect(result.current.scorerIds).toEqual(['u1']);
  });

  it('A5: no pasa de 4 anotadores; uno marcado se quita', () => {
    const { result } = renderHook(() =>
      useConAnotadores({
        participants: ['u1', 'u2', 'u3', 'u4', 'u5'].map((id) =>
          registrado(id),
        ),
      }),
    );
    act(() => result.current.goToScorers());
    ['u2', 'u3', 'u4', 'u5'].forEach((id) =>
      act(() => result.current.toggleScorer(id)),
    );
    expect(result.current.scorerIds).toEqual(['u1', 'u2', 'u3', 'u4']);
    act(() => result.current.toggleScorer('u2'));
    expect(result.current.scorerIds).toEqual(['u1', 'u3', 'u4']);
  });

  it('A6: sin anotadores no se pasa al resumen', () => {
    const { result } = renderHook(() =>
      useConAnotadores({ participants: [registrado('u1')] }),
    );
    act(() => result.current.goToScorers());
    act(() => result.current.toggleScorer('u1'));
    act(() => result.current.goToSummary());
    expect(result.current.error).toBe('create.scorers.errorMinScorers');
    expect(result.current.step).toBe(3);
    act(() => result.current.toggleScorer('u1'));
    act(() => result.current.goToSummary());
    expect(result.current.error).toBeNull();
    expect(result.current.step).toBe(4);
    act(() => result.current.handleBackToScorers());
    expect(result.current.step).toBe(3);
  });
});
