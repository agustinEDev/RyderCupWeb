import { describe, it, expect, vi } from 'vitest';
import GetUpcomingMatchesUseCase from './GetUpcomingMatchesUseCase';

const USER = 'user-1';
const RIVAL = 'user-2';
const PARTNER = 'user-3';

const buildUseCase = ({ competitions = [], schedules = {}, enrollments = [] } = {}) => {
  const listUserCompetitionsUseCase = { execute: vi.fn().mockResolvedValue(competitions) };
  const getScheduleUseCase = {
    execute: vi.fn((id) => Promise.resolve(schedules[id] ?? { rounds: [] })),
  };
  const listEnrollmentsUseCase = { execute: vi.fn().mockResolvedValue(enrollments) };

  return {
    useCase: new GetUpcomingMatchesUseCase({
      listUserCompetitionsUseCase,
      getScheduleUseCase,
      listEnrollmentsUseCase,
    }),
    listUserCompetitionsUseCase,
    getScheduleUseCase,
    listEnrollmentsUseCase,
  };
};

const round = (matches, extra = {}) => ({
  roundDate: '2026-08-10',
  sessionType: 'MORNING',
  matchFormat: 'SINGLES',
  matches,
  ...extra,
});

describe('GetUpcomingMatchesUseCase', () => {
  it('requires a user', async () => {
    const { useCase } = buildUseCase();

    await expect(useCase.execute()).rejects.toThrow('requires a userId');
  });

  it('refuses to be built without its collaborators', () => {
    expect(() => new GetUpcomingMatchesUseCase({})).toThrow('requires');
  });

  it('only looks at competitions that are being played', async () => {
    const { useCase, getScheduleUseCase } = buildUseCase({
      competitions: [
        { id: 'draft', name: 'Not started', status: 'ACTIVE' },
        { id: 'done', name: 'Finished', status: 'COMPLETED' },
      ],
    });

    const result = await useCase.execute(USER);

    expect(result).toEqual([]);
    // Sin competiciones en curso no hay ni una llamada al calendario
    expect(getScheduleUseCase.execute).not.toHaveBeenCalled();
  });

  it('keeps only the matches the player is actually in', async () => {
    const { useCase } = buildUseCase({
      competitions: [{ id: 'c1', name: 'Cup', status: 'IN_PROGRESS' }],
      schedules: {
        c1: {
          rounds: [
            round([
              { id: 'mine', status: 'SCHEDULED', teamAPlayers: [{ userId: USER }], teamBPlayers: [{ userId: RIVAL }] },
              { id: 'theirs', status: 'SCHEDULED', teamAPlayers: [{ userId: RIVAL }], teamBPlayers: [] },
            ]),
          ],
        },
      },
    });

    const result = await useCase.execute(USER);

    expect(result.map((m) => m.id)).toEqual(['mine']);
  });

  it('leaves out matches that are already over', async () => {
    const { useCase } = buildUseCase({
      competitions: [{ id: 'c1', name: 'Cup', status: 'IN_PROGRESS' }],
      schedules: {
        c1: {
          rounds: [
            round([
              { id: 'played', status: 'COMPLETED', teamAPlayers: [{ userId: USER }], teamBPlayers: [] },
              { id: 'walked', status: 'WALKOVER', teamAPlayers: [{ userId: USER }], teamBPlayers: [] },
              { id: 'todo', status: 'IN_PROGRESS', teamAPlayers: [{ userId: USER }], teamBPlayers: [] },
            ]),
          ],
        },
      },
    });

    const result = await useCase.execute(USER);

    expect(result.map((m) => m.id)).toEqual(['todo']);
  });

  it('names partners and opponents from the asking player point of view', async () => {
    const { useCase } = buildUseCase({
      competitions: [{ id: 'c1', name: 'Cup', status: 'IN_PROGRESS' }],
      schedules: {
        c1: {
          rounds: [
            round([
              {
                id: 'm1',
                status: 'SCHEDULED',
                teamAPlayers: [{ userId: USER }, { userId: PARTNER }],
                teamBPlayers: [{ userId: RIVAL }],
              },
            ]),
          ],
        },
      },
      enrollments: [
        { userId: USER, userName: 'Yo Mismo' },
        { userId: PARTNER, userName: 'Compi' },
        { userId: RIVAL, userName: 'Rival' },
      ],
    });

    const [match] = await useCase.execute(USER);

    // El propio jugador no es su compañero
    expect(match.partnerNames).toEqual(['Compi']);
    expect(match.opponentNames).toEqual(['Rival']);
  });

  it('flips the sides when the player is in team B', async () => {
    const { useCase } = buildUseCase({
      competitions: [{ id: 'c1', name: 'Cup', status: 'IN_PROGRESS' }],
      schedules: {
        c1: {
          rounds: [
            round([
              {
                id: 'm1',
                status: 'SCHEDULED',
                teamAPlayers: [{ userId: RIVAL }],
                teamBPlayers: [{ userId: USER }, { userId: PARTNER }],
              },
            ]),
          ],
        },
      },
      enrollments: [
        { userId: PARTNER, userName: 'Compi' },
        { userId: RIVAL, userName: 'Rival' },
      ],
    });

    const [match] = await useCase.execute(USER);

    expect(match.partnerNames).toEqual(['Compi']);
    expect(match.opponentNames).toEqual(['Rival']);
  });

  it('falls back to the user id when a name is missing', async () => {
    const { useCase } = buildUseCase({
      competitions: [{ id: 'c1', name: 'Cup', status: 'IN_PROGRESS' }],
      schedules: {
        c1: {
          rounds: [
            round([
              { id: 'm1', status: 'SCHEDULED', teamAPlayers: [{ userId: USER }], teamBPlayers: [{ userId: RIVAL }] },
            ]),
          ],
        },
      },
      enrollments: [],
    });

    const [match] = await useCase.execute(USER);

    expect(match.opponentNames).toEqual([RIVAL]);
  });

  it('puts the soonest match first, and the morning before the afternoon', async () => {
    const mine = (id) => ({
      id,
      status: 'SCHEDULED',
      teamAPlayers: [{ userId: USER }],
      teamBPlayers: [],
    });
    const { useCase } = buildUseCase({
      competitions: [{ id: 'c1', name: 'Cup', status: 'IN_PROGRESS' }],
      schedules: {
        c1: {
          rounds: [
            round([mine('later-day')], { roundDate: '2026-08-12', sessionType: 'MORNING' }),
            round([mine('afternoon')], { roundDate: '2026-08-10', sessionType: 'AFTERNOON' }),
            round([mine('morning')], { roundDate: '2026-08-10', sessionType: 'MORNING' }),
          ],
        },
      },
    });

    const result = await useCase.execute(USER);

    expect(result.map((m) => m.id)).toEqual(['morning', 'afternoon', 'later-day']);
  });

  it('returns what it could read when one competition fails', async () => {
    const listUserCompetitionsUseCase = {
      execute: vi.fn().mockResolvedValue([
        { id: 'ok', name: 'Works', status: 'IN_PROGRESS' },
        { id: 'broken', name: 'Fails', status: 'IN_PROGRESS' },
      ]),
    };
    const getScheduleUseCase = {
      execute: vi.fn((id) =>
        id === 'broken'
          ? Promise.reject(new Error('boom'))
          : Promise.resolve({
              rounds: [
                round([
                  { id: 'm1', status: 'SCHEDULED', teamAPlayers: [{ userId: USER }], teamBPlayers: [] },
                ]),
              ],
            })
      ),
    };
    const useCase = new GetUpcomingMatchesUseCase({
      listUserCompetitionsUseCase,
      getScheduleUseCase,
      listEnrollmentsUseCase: { execute: vi.fn().mockResolvedValue([]) },
    });

    const result = await useCase.execute(USER);

    // Media lista es mas util que ninguna: es un resumen, no una transaccion
    expect(result.map((m) => m.id)).toEqual(['m1']);
  });

  it('reuses competitions it is handed instead of asking again', async () => {
    const { useCase, listUserCompetitionsUseCase } = buildUseCase();

    await useCase.execute(USER, [{ id: 'c1', name: 'Cup', status: 'IN_PROGRESS' }]);

    expect(listUserCompetitionsUseCase.execute).not.toHaveBeenCalled();
  });
});
