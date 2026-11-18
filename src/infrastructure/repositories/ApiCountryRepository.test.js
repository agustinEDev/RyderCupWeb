import { describe, it, expect, beforeEach, vi } from 'vitest';
import ApiCountryRepository from './ApiCountryRepository';
import ICountryRepository from '../../domain/repositories/ICountryRepository';
import { RutaDeLaApiNoValida } from '../http/rutaDeLaApi';
import * as apiModule from '../http/api';

vi.mock('../http/api', async () => ({
  segmento: (await vi.importActual('../http/rutaDeLaApi')).segmento,
  default: vi.fn(),
}));

describe('ApiCountryRepository', () => {
  let repository;
  let apiRequestMock;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new ApiCountryRepository();
    apiRequestMock = apiModule.default;
  });

  it('implements ICountryRepository', () => {
    expect(repository).toBeInstanceOf(ICountryRepository);
  });

  describe('findAll', () => {
    it('GETs /api/v1/countries and returns the response as is', async () => {
      const countries = [
        { code: 'ES', name_en: 'Spain', name_es: 'España' },
        { code: 'PT', name_en: 'Portugal', name_es: 'Portugal' },
      ];
      apiRequestMock.mockResolvedValue(countries);

      const result = await repository.findAll();

      expect(apiRequestMock).toHaveBeenCalledTimes(1);
      expect(apiRequestMock).toHaveBeenCalledWith('/api/v1/countries', {
        method: 'GET',
      });
      expect(result).toBe(countries);
    });

    it('returns an empty list untouched', async () => {
      apiRequestMock.mockResolvedValue([]);
      expect(await repository.findAll()).toEqual([]);
    });

    it('propagates the HTTP error', async () => {
      const error = new Error('HTTP 500');
      apiRequestMock.mockRejectedValue(error);
      await expect(repository.findAll()).rejects.toBe(error);
    });
  });

  describe('findAdjacent', () => {
    it('GETs the adjacent countries of a code and returns them as is', async () => {
      const adjacent = [{ code: 'FR' }, { code: 'PT' }];
      apiRequestMock.mockResolvedValue(adjacent);

      const result = await repository.findAdjacent('ES');

      expect(apiRequestMock).toHaveBeenCalledWith(
        '/api/v1/countries/ES/adjacent',
        { method: 'GET' },
      );
      expect(result).toBe(adjacent);
    });

    it('encodes the code as a path segment', async () => {
      apiRequestMock.mockResolvedValue([]);
      await repository.findAdjacent('E S?x');
      expect(apiRequestMock).toHaveBeenCalledWith(
        '/api/v1/countries/E%20S%3Fx/adjacent',
        { method: 'GET' },
      );
    });

    it('rejects a code that would change the path, without calling the API', async () => {
      await expect(repository.findAdjacent('..')).rejects.toBeInstanceOf(
        RutaDeLaApiNoValida,
      );
      await expect(repository.findAdjacent('ES/../x')).rejects.toBeInstanceOf(
        RutaDeLaApiNoValida,
      );
      expect(apiRequestMock).not.toHaveBeenCalled();
    });

    it('propagates the HTTP error', async () => {
      const error = new Error('Not found');
      apiRequestMock.mockRejectedValue(error);
      await expect(repository.findAdjacent('XX')).rejects.toBe(error);
    });
  });
});
