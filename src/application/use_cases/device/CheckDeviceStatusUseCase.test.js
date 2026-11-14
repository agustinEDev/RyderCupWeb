import { describe, it, expect, vi } from 'vitest';
import CheckDeviceStatusUseCase from './CheckDeviceStatusUseCase';

/**
 * El monitor de dispositivos (FE #1046) solo necesita que haya una petición con
 * sesión: si el dispositivo se revocó, el 401 «Dispositivo revocado» lo trata el
 * interceptor. La respuesta no decide nada.
 */
describe('CheckDeviceStatusUseCase', () => {
  it('sin repositorio no se puede crear', () => {
    expect(() => new CheckDeviceStatusUseCase({})).toThrow(
      'deviceRepository is required',
    );
  });

  it('hace la petición con sesión del repositorio y no devuelve nada', async () => {
    const deviceRepository = {
      checkDeviceStatus: vi.fn().mockResolvedValue({ id: 'u-1' }),
    };

    const resultado = await new CheckDeviceStatusUseCase({
      deviceRepository,
    }).execute();

    expect(deviceRepository.checkDeviceStatus).toHaveBeenCalledTimes(1);
    expect(resultado).toBeUndefined();
  });

  it('un fallo del repositorio sale tal cual (el hook lo calla)', async () => {
    const fallo = Object.assign(new Error('Unauthorized'), { status: 401 });
    const deviceRepository = {
      checkDeviceStatus: vi.fn().mockRejectedValue(fallo),
    };

    await expect(
      new CheckDeviceStatusUseCase({ deviceRepository }).execute(),
    ).rejects.toBe(fallo);
  });
});
