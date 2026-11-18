import { describe, it, expect, beforeEach, vi } from 'vitest';
import ApiPlayerStatsRepository from './ApiPlayerStatsRepository';
import IPlayerStatsRepository from '../../domain/repositories/IPlayerStatsRepository';
import PlayerStats from '../../domain/entities/PlayerStats';
import RecentMatch from '../../domain/entities/RecentMatch';
import { RutaDeLaApiNoValida } from '../http/rutaDeLaApi';
import * as apiModule from '../http/api';

vi.mock('../http/api', async () => ({
  segmento: (await vi.importActual('../http/rutaDeLaApi')).segmento,
  default: vi.fn(),
}));

const apiStats = {
  handicap: 12.4,
  handicap_trend: -0.3,
  scoring_avg: 88.5,
  rounds_played: 20,
  tournaments_total: 3,
  tournaments_active: 1,
  estimated_index: 11.9,
  playing_avg: 14,
  best_differential: 8.2,
  rounds_with_differential: 18,
  differentials: [8.2, 10.1],
};

describe('ApiPlayerStatsRepository', () => {
  let repository;
  let apiRequestMock;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new ApiPlayerStatsRepository();
    apiRequestMock = apiModule.default;
  });

  it('implements IPlayerStatsRepository', () => {
    expect(repository).toBeInstanceOf(IPlayerStatsRepository);
  });

  describe('getPlayerStats', () => {
    it('GETs /users/me/stats and maps it to PlayerStats', async () => {
      apiRequestMock.mockResolvedValue(apiStats);

      const result = await repository.getPlayerStats();

      expect(apiRequestMock).toHaveBeenCalledTimes(1);
      expect(apiRequestMock).toHaveBeenCalledWith('/api/v1/users/me/stats');
      expect(result).toBeInstanceOf(PlayerStats);
      expect(result.handicap).toBe(12.4);
      expect(result.handicapTrend).toBe(-0.3);
      expect(result.scoringAvg).toBe(88.5);
      expect(result.roundsPlayed).toBe(20);
      expect(result.tournamentsTotal).toBe(3);
      expect(result.tournamentsActive).toBe(1);
      expect(result.estimatedIndex).toBe(11.9);
      expect(result.playingAvg).toBe(14);
      expect(result.bestDifferential).toBe(8.2);
      expect(result.roundsWithDifferential).toBe(18);
      expect(result.differentials).toEqual([8.2, 10.1]);
    });

    it('keeps null as null and counters at zero for a new account', async () => {
      apiRequestMock.mockResolvedValue({});

      const result = await repository.getPlayerStats();

      expect(result.handicap).toBeNull();
      expect(result.scoringAvg).toBeNull();
      expect(result.roundsPlayed).toBe(0);
      expect(result.differentials).toEqual([]);
    });

    it('rejects when the API returns no body', async () => {
      apiRequestMock.mockResolvedValue(null);
      await expect(repository.getPlayerStats()).rejects.toThrow(
        /apiData is required/,
      );
    });

    it('propagates the HTTP error', async () => {
      const error = new Error('HTTP 500');
      apiRequestMock.mockRejectedValue(error);
      await expect(repository.getPlayerStats()).rejects.toBe(error);
    });
  });

  describe('getRecentMatches', () => {
    it('GETs /users/me/matches without query when there is no limit', async () => {
      apiRequestMock.mockResolvedValue({ matches: [] });

      const result = await repository.getRecentMatches();

      expect(apiRequestMock).toHaveBeenCalledWith('/api/v1/users/me/matches');
      expect(result).toEqual([]);
    });

    it('omits a zero limit', async () => {
      apiRequestMock.mockResolvedValue({ matches: [] });
      await repository.getRecentMatches(0);
      expect(apiRequestMock).toHaveBeenCalledWith('/api/v1/users/me/matches');
    });

    it('sends the limit encoded in the query string', async () => {
      apiRequestMock.mockResolvedValue({ matches: [] });

      await repository.getRecentMatches(5);
      await repository.getRecentMatches('5&x=1');

      expect(apiRequestMock.mock.calls.map((c) => c[0])).toEqual([
        '/api/v1/users/me/matches?limit=5',
        '/api/v1/users/me/matches?limit=5%26x%3D1',
      ]);
    });

    it('maps each match to RecentMatch', async () => {
      apiRequestMock.mockResolvedValue({
        matches: [
          {
            id: 'm-1',
            played_at: '2026-10-05T09:00:00Z',
            match_format: 'FOURBALL',
            golf_course_name: 'El Saler',
            result: 'WON',
          },
          { id: 'm-2' },
        ],
      });

      const result = await repository.getRecentMatches(2);

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(RecentMatch);
      expect(result[0].id).toBe('m-1');
      expect(result[0].playedAt).toEqual(new Date('2026-10-05T09:00:00Z'));
      expect(result[0].matchFormat).toBe('FOURBALL');
      expect(result[0].golfCourseName).toBe('El Saler');
      expect(result[0].result).toBe('WON');
      expect(result[1].id).toBe('m-2');
      expect(result[1].golfCourseName).toBeNull();
    });

    it('returns an empty list when the response has no matches or no body', async () => {
      apiRequestMock.mockResolvedValueOnce({});
      apiRequestMock.mockResolvedValueOnce(null);
      apiRequestMock.mockResolvedValueOnce({ matches: null });

      expect(await repository.getRecentMatches()).toEqual([]);
      expect(await repository.getRecentMatches()).toEqual([]);
      expect(await repository.getRecentMatches()).toEqual([]);
    });

    it('propagates the HTTP error', async () => {
      const error = new Error('HTTP 502');
      apiRequestMock.mockRejectedValue(error);
      await expect(repository.getRecentMatches(5)).rejects.toBe(error);
    });
  });

  describe('getScoringBreakdown', () => {
    it('GETs /users/me/stats/breakdown and maps it', async () => {
      apiRequestMock.mockResolvedValue({
        holes_counted: 36,
        rounds_counted: 2,
        gross_distribution: {
          birdie_or_better: 2,
          par: 10,
          bogey: 15,
          double_or_worse: 9,
          holes: 36,
        },
        net_distribution: null,
        front_nine: { holes: 18, average_to_par: 1.2 },
        back_nine: null,
        by_par: [{ par: 3, holes: 8, average_to_par: 0.5 }],
        by_course: [
          { golf_course_id: 'c-1', golf_course_name: 'El Saler', rounds: 2 },
        ],
      });

      const result = await repository.getScoringBreakdown();

      expect(apiRequestMock).toHaveBeenCalledWith(
        '/api/v1/users/me/stats/breakdown',
      );
      expect(result).toEqual({
        holesCounted: 36,
        roundsCounted: 2,
        grossDistribution: {
          birdieOrBetter: 2,
          par: 10,
          bogey: 15,
          doubleOrWorse: 9,
          holes: 36,
        },
        netDistribution: {
          birdieOrBetter: 0,
          par: 0,
          bogey: 0,
          doubleOrWorse: 0,
          holes: 0,
        },
        frontNine: { holes: 18, averageToPar: 1.2 },
        backNine: null,
        byPar: [{ par: 3, holes: 8, averageToPar: 0.5 }],
        byCourse: [
          {
            golfCourseId: 'c-1',
            golfCourseName: 'El Saler',
            rounds: 2,
            averageToPar: null,
          },
        ],
      });
    });

    it('rejects when the API returns no body', async () => {
      apiRequestMock.mockResolvedValue(undefined);
      await expect(repository.getScoringBreakdown()).rejects.toThrow(
        /apiData is required/,
      );
    });

    it('propagates the HTTP error', async () => {
      const error = new Error('HTTP 500');
      apiRequestMock.mockRejectedValue(error);
      await expect(repository.getScoringBreakdown()).rejects.toBe(error);
    });
  });

  describe('getPlayerStatsByGolfCourse', () => {
    it('GETs the stats of the encoded golf course and maps them', async () => {
      apiRequestMock.mockResolvedValue({ ...apiStats, rounds_played: 4 });

      const result = await repository.getPlayerStatsByGolfCourse('c 1');

      expect(apiRequestMock).toHaveBeenCalledWith(
        '/api/v1/users/me/stats/golf-courses/c%201',
      );
      expect(result).toBeInstanceOf(PlayerStats);
      expect(result.roundsPlayed).toBe(4);
      expect(result.handicap).toBe(12.4);
    });

    it('rejects an id that would change the path, without calling the API', async () => {
      await expect(
        repository.getPlayerStatsByGolfCourse('../x'),
      ).rejects.toBeInstanceOf(RutaDeLaApiNoValida);
      await expect(
        repository.getPlayerStatsByGolfCourse('.'),
      ).rejects.toBeInstanceOf(RutaDeLaApiNoValida);
      expect(apiRequestMock).not.toHaveBeenCalled();
    });

    it('propagates the HTTP error', async () => {
      const error = new Error('Not found');
      apiRequestMock.mockRejectedValue(error);
      await expect(repository.getPlayerStatsByGolfCourse('c-1')).rejects.toBe(
        error,
      );
    });
  });
});
