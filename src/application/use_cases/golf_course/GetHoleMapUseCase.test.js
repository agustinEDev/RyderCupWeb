import { describe, it, expect, vi } from 'vitest';
import GetHoleMapUseCase from './GetHoleMapUseCase';

const MAPA = { golfCourseId: 'gc-1', version: 'v2', attribution: null, holes: {} };
const GUARDADO = { ...MAPA, version: 'v1' };

const caso = ({ getHoleMap, guardado = null }) => {
  const golfCourseRepository = { getHoleMap: vi.fn(getHoleMap) };
  const holeMapCache = { save: vi.fn(), load: vi.fn(() => guardado), remove: vi.fn() };
  return { useCase: new GetHoleMapUseCase({ golfCourseRepository, holeMapCache }), golfCourseRepository, holeMapCache };
};

describe('GetHoleMapUseCase', () => {
  it('M1: con red, pide el mapa y lo guarda', async () => {
    const { useCase, holeMapCache } = caso({ getHoleMap: async () => MAPA });

    expect(await useCase.execute('gc-1')).toEqual(MAPA);
    expect(holeMapCache.save).toHaveBeenCalledWith(MAPA);
  });

  it('M4: una versión nueva sustituye a la guardada', async () => {
    const { useCase, holeMapCache } = caso({ getHoleMap: async () => MAPA, guardado: GUARDADO });

    expect((await useCase.execute('gc-1')).version).toBe('v2');
    expect(holeMapCache.save).toHaveBeenCalledWith(MAPA);
  });

  it('M2: sin mapa aprobado, nada, y se borra la copia (ya no vale)', async () => {
    const { useCase, holeMapCache } = caso({ getHoleMap: async () => null, guardado: GUARDADO });

    expect(await useCase.execute('gc-1')).toBeNull();
    expect(holeMapCache.remove).toHaveBeenCalledWith('gc-1');
  });

  it('M3: sin red, la copia guardada', async () => {
    const { useCase } = caso({
      getHoleMap: async () => { throw new TypeError('Failed to fetch'); },
      guardado: GUARDADO,
    });

    expect(await useCase.execute('gc-1')).toEqual(GUARDADO);
  });

  it('M3: si la petición falla por otra cosa, también la copia', async () => {
    const error = Object.assign(new Error('boom'), { status: 500 });
    const { useCase } = caso({ getHoleMap: async () => { throw error; }, guardado: GUARDADO });

    expect(await useCase.execute('gc-1')).toEqual(GUARDADO);
  });

  it('M3: sin red y sin copia, nada', async () => {
    const { useCase } = caso({ getHoleMap: async () => { throw new TypeError('Failed to fetch'); } });

    expect(await useCase.execute('gc-1')).toBeNull();
  });

  it('sin campo, nada y sin preguntar', async () => {
    const { useCase, golfCourseRepository } = caso({ getHoleMap: async () => MAPA });

    expect(await useCase.execute(null)).toBeNull();
    expect(golfCourseRepository.getHoleMap).not.toHaveBeenCalled();
  });
});
