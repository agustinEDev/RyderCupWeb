import { describe, it, expect, vi } from 'vitest';
import ChangeEnrollmentTeeUseCase from './ChangeEnrollmentTeeUseCase';

/**
 * Cambiar la barra de una inscripción (FE #1214): valida la entrada y deja
 * la decisión al backend, que responde 403/409/422 con su código.
 */
describe('ChangeEnrollmentTeeUseCase', () => {
  const repo = (respuesta = { id: 'e1', teeColor: 'RED' }) => ({
    changeTee: vi.fn().mockResolvedValue(respuesta),
  });

  it('pide el cambio y devuelve la barra que quedó', async () => {
    const r = repo();
    const hecho = await new ChangeEnrollmentTeeUseCase(r).execute('e1', 'RED');
    expect(r.changeTee).toHaveBeenCalledWith('e1', 'RED');
    expect(hecho).toEqual({ id: 'e1', teeColor: 'RED' });
  });

  it('null vuelve a la de por defecto', async () => {
    const r = repo({ id: 'e1', teeColor: null });
    await new ChangeEnrollmentTeeUseCase(r).execute('e1', null);
    expect(r.changeTee).toHaveBeenCalledWith('e1', null);
  });

  it.each([
    ['sin inscripción', undefined, 'RED'],
    ['un color que no existe', 'e1', 'PURPLE'],
    ['undefined en vez de null', 'e1', undefined],
  ])('%s: no llega a la API', async (_caso, id, color) => {
    const r = repo();
    await expect(
      new ChangeEnrollmentTeeUseCase(r).execute(id, color),
    ).rejects.toThrow();
    expect(r.changeTee).not.toHaveBeenCalled();
  });

  it('exige el repositorio', () => {
    expect(() => new ChangeEnrollmentTeeUseCase()).toThrow();
  });
});
