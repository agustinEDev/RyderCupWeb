import { describe, it, expect, vi } from 'vitest';
import GetCourseLocationUseCase from './GetCourseLocationUseCase';

const caso = ({ getById = async () => null, guardada = null } = {}) => {
  const golfCourseRepository = { getById: vi.fn(getById) };
  const courseLocationCache = { save: vi.fn(), load: vi.fn(() => guardada) };
  return { useCase: new GetCourseLocationUseCase({ golfCourseRepository, courseLocationCache }), golfCourseRepository, courseLocationCache };
};

describe('GetCourseLocationUseCase', () => {
  it('pide el campo, devuelve su ubicación y la guarda', async () => {
    const { useCase, golfCourseRepository, courseLocationCache } = caso({
      getById: async () => ({ location: { latitude: 36.29, longitude: -5.33 } }),
    });

    expect(await useCase.execute('gc-1')).toEqual({ lat: 36.29, lon: -5.33 });
    expect(golfCourseRepository.getById).toHaveBeenCalledWith('gc-1');
    expect(courseLocationCache.save).toHaveBeenCalledWith('gc-1', { lat: 36.29, lon: -5.33 });
  });

  it.each([
    ['sin ubicación', {}],
    ['con coordenadas imposibles', { location: { latitude: 95, longitude: 0 } }],
    ['sin campo', null],
  ])('%s: null, y no se guarda nada', async (_caso, campo) => {
    const { useCase, courseLocationCache } = caso({ getById: async () => campo });

    expect(await useCase.execute('gc-1')).toBeNull();
    expect(courseLocationCache.save).not.toHaveBeenCalled();
  });

  it('sin red, el fallo sale (quien llama se queda con la copia)', async () => {
    const { useCase } = caso({ getById: async () => { throw new TypeError('sin red'); } });

    await expect(useCase.execute('gc-1')).rejects.toThrow('sin red');
  });

  it('la guardada, al momento; una inválida o sin campo, null', () => {
    expect(caso({ guardada: { lat: 36.29, lon: -5.33 } }).useCase.guardada('gc-1')).toEqual({ lat: 36.29, lon: -5.33 });
    expect(caso({ guardada: { lat: 95, lon: 0 } }).useCase.guardada('gc-1')).toBeNull();
    expect(caso({ guardada: null }).useCase.guardada('gc-1')).toBeNull();
    expect(caso({ guardada: { lat: 1, lon: 1 } }).useCase.guardada(null)).toBeNull();
  });

  it('sin campo, ni se pide', async () => {
    const { useCase, golfCourseRepository } = caso();

    expect(await useCase.execute(null)).toBeNull();
    expect(golfCourseRepository.getById).not.toHaveBeenCalled();
  });
});
