import { describe, it, expect, vi } from 'vitest';

vi.mock('../../services/api', () => ({ apiRequest: vi.fn() }));

import { apiRequest } from '../../services/api';
import { aBloqueoDePartidos } from './MatchGenerationBlockMapper';
import ScheduleMapper from './ScheduleMapper';
import EnvelopeMapper from './EnvelopeMapper';
import ApiEnvelopeRepository from '../repositories/ApiEnvelopeRepository';

/**
 * El motivo por el que una sesión se quedó sin partidos (BE #361), de la API a
 * la pantalla. Llega en claves —el idioma lo pone la pantalla— y tiene que
 * llegar a los TRES sitios que lo enseñan: la sesión del calendario, la página
 * del sobre y el aviso del panel. Un campo nuevo que se queda en uno de ellos
 * es el defecto que más se repite (cuatro veces el 20 sep).
 *
 *   #   caso                                          | qué pasa
 *   ----|---------------------------------------------|------------------------------
 *   M1  el motivo con dos jugadores                   | en camelCase, con color o sin él
 *   M2  sin motivo, o un servidor anterior            | null: no hay nada que avisar
 *   M3  la sesión del calendario                      | lo lleva
 *   M4  la vista del sobre                            | lo lleva
 *   M5  «mis sesiones sin partidos»                   | GET y cada sesión con su motivo
 */

const API = {
  reason: 'PLAYERS_WITHOUT_TEE',
  players: [
    { user_id: 'u1', name: 'Bea Dos', missing: 'GENDER', tee_color: null },
    { user_id: 'u2', name: 'Carla Tres', missing: 'TEE_COLOR', tee_color: 'WHITE' },
  ],
  at: '2026-06-01T00:00:05',
};

const ESPERADO = {
  reason: 'PLAYERS_WITHOUT_TEE',
  players: [
    { userId: 'u1', name: 'Bea Dos', missing: 'GENDER', teeColor: null },
    { userId: 'u2', name: 'Carla Tres', missing: 'TEE_COLOR', teeColor: 'WHITE' },
  ],
};

describe('El motivo de una sesión sin partidos', () => {
  it('M1: llega en camelCase', () => {
    expect(aBloqueoDePartidos(API)).toEqual(ESPERADO);
  });

  it('M2: sin motivo, o de un servidor anterior, es null', () => {
    expect(aBloqueoDePartidos(null)).toBeNull();
    expect(aBloqueoDePartidos(undefined)).toBeNull();
  });

  it('M3: la sesión del calendario lo lleva', () => {
    const ronda = ScheduleMapper.toRoundDTO({
      id: 'r1',
      round_date: '2026-06-01',
      session_type: 'MORNING',
      match_format: 'SINGLES',
      status: 'PENDING_MATCHES',
      matches: [],
      match_generation_block: API,
    });

    expect(ronda.matchGenerationBlock).toEqual(ESPERADO);
  });

  it('M3b: y sin él, null', () => {
    const calendario = ScheduleMapper.toScheduleDTO({
      competition_id: 'c1',
      days: [
        {
          date: '2026-06-01',
          rounds: [
            {
              id: 'r1',
              round_date: '2026-06-01',
              session_type: 'MORNING',
              match_format: 'SINGLES',
              status: 'PENDING_MATCHES',
              matches: [],
            },
          ],
        },
      ],
    });

    expect(calendario.rounds[0].matchGenerationBlock).toBeNull();
  });

  it('M4: la vista del sobre lo lleva', () => {
    const vista = EnvelopeMapper.toEnvelopesViewDTO({
      round_id: 'r1',
      revealed: true,
      matchups: [],
      match_generation_block: API,
    });

    expect(vista.matchGenerationBlock).toEqual(ESPERADO);
  });

  it('M5: «mis sesiones sin partidos» es un GET y cada una trae su motivo', async () => {
    apiRequest.mockResolvedValue([
      {
        round_id: 'r1',
        competition_id: 'c1',
        competition_name: 'Ryder',
        round_date: '2026-06-01',
        session_type: 'MORNING',
        reason: 'PLAYERS_WITHOUT_TEE',
        players: API.players,
      },
    ]);

    const sesiones = await new ApiEnvelopeRepository().listMySessionsWithoutMatches();

    expect(apiRequest).toHaveBeenCalledWith('/api/v1/competitions/me/sessions-without-matches');
    expect(sesiones).toEqual([
      {
        roundId: 'r1',
        competitionId: 'c1',
        competitionName: 'Ryder',
        roundDate: '2026-06-01',
        sessionType: 'MORNING',
        ...ESPERADO,
      },
    ]);
  });
});
