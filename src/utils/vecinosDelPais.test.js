import { describe, it, expect, vi } from 'vitest';
import { leeVecinos } from './vecinosDelPais';

vi.mock('./registraElFallo', () => ({ registraElFallo: vi.fn() }));
const { registraElFallo } = await import('./registraElFallo');

describe('leeVecinos', () => {
  it('pide los del país y los deja como los usan los selectores', async () => {
    const casoDeUso = {
      execute: vi
        .fn()
        .mockResolvedValue([
          { code: 'FR', name_es: 'Francia', name_en: 'France' },
          { code: 'XX' },
        ]),
    };

    expect(await leeVecinos(casoDeUso, 'ES')).toEqual([
      {
        id: 'FR',
        name: 'France',
        code: 'FR',
        name_en: 'France',
        name_es: 'Francia',
      },
    ]);
    expect(casoDeUso.execute).toHaveBeenCalledWith('ES');
  });

  it('si no se pueden leer, ninguno, y se registra el fallo', async () => {
    const fallo = new Error('sin red');
    const casoDeUso = { execute: vi.fn().mockRejectedValue(fallo) };

    expect(await leeVecinos(casoDeUso, 'ES')).toEqual([]);
    expect(registraElFallo).toHaveBeenCalledWith(
      'CreateCompetition.error-fetching-adjacent-countries',
      'Error fetching adjacent countries:',
      fallo,
    );
  });
});
