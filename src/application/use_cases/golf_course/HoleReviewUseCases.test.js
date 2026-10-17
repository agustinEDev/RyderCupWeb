import { describe, it, expect, vi } from 'vitest';
import {
  DeleteHoleSampleUseCase,
  GetHoleReviewUseCase,
  ListHoleReviewsUseCase,
  ReopenHoleUseCase,
  SaveHoleLineUseCase,
} from './HoleReviewUseCases';

const LINEA = { tee: { lat: 1, lon: 2 }, bends: [], greenCenter: { lat: 3, lon: 4 } };
const repo = () => ({
  listHoleReviews: vi.fn(async () => ['lista']),
  getHoleReview: vi.fn(async () => ({ name: 'X' })),
  saveHoleLine: vi.fn(async () => undefined),
  reopenHole: vi.fn(async () => undefined),
  deleteHoleSample: vi.fn(async () => undefined),
});

describe('casos de uso del admin con los hoyos (BE #575)', () => {
  it('la lista y un campo, del repositorio', async () => {
    const r = repo();

    expect(await new ListHoleReviewsUseCase({ golfCourseRepository: r }).execute()).toEqual(['lista']);
    expect(await new GetHoleReviewUseCase({ golfCourseRepository: r }).execute('gc-1')).toEqual({ name: 'X' });
    expect(r.getHoleReview).toHaveBeenCalledWith('gc-1');
  });

  it('guardar, reabrir y borrar pasan lo suyo', async () => {
    const r = repo();

    await new SaveHoleLineUseCase({ golfCourseRepository: r }).execute('gc-1', 3, LINEA);
    await new ReopenHoleUseCase({ golfCourseRepository: r }).execute('gc-1', 3);
    await new DeleteHoleSampleUseCase({ golfCourseRepository: r }).execute('gc-1', 's-1');

    expect(r.saveHoleLine).toHaveBeenCalledWith('gc-1', 3, LINEA);
    expect(r.reopenHole).toHaveBeenCalledWith('gc-1', 3);
    expect(r.deleteHoleSample).toHaveBeenCalledWith('gc-1', 's-1');
  });

  it.each([
    ['un campo sin id', () => new GetHoleReviewUseCase({ golfCourseRepository: repo() }).execute(null)],
    ['una línea sin green', () => new SaveHoleLineUseCase({ golfCourseRepository: repo() }).execute('gc-1', 1, { tee: LINEA.tee })],
    ['reabrir sin campo', () => new ReopenHoleUseCase({ golfCourseRepository: repo() }).execute(null, 1)],
    ['borrar sin muestra', () => new DeleteHoleSampleUseCase({ golfCourseRepository: repo() }).execute('gc-1', null)],
  ])('%s, error sin llamar al repositorio', async (_caso, llamar) => {
    await expect(llamar()).rejects.toThrow(/required/);
  });
});
