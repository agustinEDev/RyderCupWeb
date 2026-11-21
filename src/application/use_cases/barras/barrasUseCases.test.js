import { describe, it, expect, vi } from 'vitest';
import GetEnrollmentTeesUseCase from './GetEnrollmentTeesUseCase';
import ChangeEnrollmentCourseTeeUseCase from './ChangeEnrollmentCourseTeeUseCase';
import SetCompetitionCourseTeeUseCase from './SetCompetitionCourseTeeUseCase';

/**
 * Las barras por campo (RyderCupAm, barras por campo): leer las de una
 * inscripción, fijar su barra en un campo y la de un campo para un género.
 * Validan la entrada y dejan la decisión al backend.
 */
const repo = () => ({
  getTees: vi.fn().mockResolvedValue({ generalTee: null, courses: [] }),
  changeCourseTee: vi.fn().mockResolvedValue({ teeColor: 'RED' }),
  setCourseTee: vi.fn().mockResolvedValue({ gender: 'MALE', teeColor: null }),
});

describe('GetEnrollmentTeesUseCase', () => {
  it('lee las de la inscripción', async () => {
    const r = repo();
    await new GetEnrollmentTeesUseCase(r).execute('e1');
    expect(r.getTees).toHaveBeenCalledWith('e1');
  });

  it('sin inscripción, no llega a la API', async () => {
    const r = repo();
    await expect(new GetEnrollmentTeesUseCase(r).execute('')).rejects.toThrow();
    expect(r.getTees).not.toHaveBeenCalled();
  });
});

describe('ChangeEnrollmentCourseTeeUseCase', () => {
  it('fija su barra en un campo, o la quita con null', async () => {
    const r = repo();
    const uc = new ChangeEnrollmentCourseTeeUseCase(r);
    await uc.execute('e1', 'g1', 'RED');
    await uc.execute('e1', 'g1', null);
    expect(r.changeCourseTee.mock.calls).toEqual([
      ['e1', 'g1', 'RED'],
      ['e1', 'g1', null],
    ]);
  });

  it.each([
    ['sin inscripción', '', 'g1', 'RED'],
    ['sin campo', 'e1', '', 'RED'],
    ['un color que no existe', 'e1', 'g1', 'PURPLE'],
    ['undefined en vez de null', 'e1', 'g1', undefined],
  ])('%s: no llega a la API', async (_caso, e, g, color) => {
    const r = repo();
    await expect(
      new ChangeEnrollmentCourseTeeUseCase(r).execute(e, g, color),
    ).rejects.toThrow();
    expect(r.changeCourseTee).not.toHaveBeenCalled();
  });
});

describe('SetCompetitionCourseTeeUseCase', () => {
  it('fija la de un campo para un género, o la quita con null', async () => {
    const r = repo();
    const uc = new SetCompetitionCourseTeeUseCase(r);
    await uc.execute('c1', 'g1', 'FEMALE', 'RED');
    await uc.execute('c1', 'g1', 'MALE', null);
    expect(r.setCourseTee.mock.calls).toEqual([
      ['c1', 'g1', 'FEMALE', 'RED'],
      ['c1', 'g1', 'MALE', null],
    ]);
  });

  it.each([
    ['sin competición', '', 'g1', 'MALE', 'RED'],
    ['sin campo', 'c1', '', 'MALE', 'RED'],
    ['un género que no existe', 'c1', 'g1', 'OTHER', 'RED'],
    ['un color que no existe', 'c1', 'g1', 'MALE', 'PURPLE'],
  ])('%s: no llega a la API', async (_caso, c, g, genero, color) => {
    const r = repo();
    await expect(
      new SetCompetitionCourseTeeUseCase(r).execute(c, g, genero, color),
    ).rejects.toThrow();
    expect(r.setCourseTee).not.toHaveBeenCalled();
  });

  it('exigen su repositorio', () => {
    expect(() => new GetEnrollmentTeesUseCase()).toThrow();
    expect(() => new ChangeEnrollmentCourseTeeUseCase()).toThrow();
    expect(() => new SetCompetitionCourseTeeUseCase()).toThrow();
  });
});
