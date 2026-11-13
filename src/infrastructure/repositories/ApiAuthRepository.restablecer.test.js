import { describe, it, expect, beforeEach, vi } from 'vitest';
import ApiAuthRepository from './ApiAuthRepository';
import * as api from '../http/api.js';
import esAuth from '../../i18n/locales/es/auth.json';
import enAuth from '../../i18n/locales/en/auth.json';

/**
 * Restablecer la contraseña (fase 3):
 *   R1 el token se valida con POST y en el cuerpo, nunca en la URL (acababa en los logs)
 *   R2 un token caducado o usado sigue siendo valid:false (la pantalla «Enlace inválido»)
 *   R3 el enlace vale 1 hora: lo dicen los textos, en los dos idiomas
 */
vi.mock('../http/api.js', async () => ({
  segmento: (await vi.importActual('../http/rutaDeLaApi')).segmento,
  default: vi.fn(),
}));

describe('ApiAuthRepository · validar el enlace de restablecer (fase 3)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('R1: POST con el token en el cuerpo', async () => {
    api.default.mockResolvedValue({ valid: true, message: 'ok' });

    await new ApiAuthRepository().validateResetToken('tok-123');

    expect(api.default).toHaveBeenCalledWith(
      '/api/v1/auth/validate-reset-token',
      {
        method: 'POST',
        body: JSON.stringify({ token: 'tok-123' }),
      },
    );
    expect(api.default.mock.calls[0][0]).not.toContain('tok-123');
  });

  it('R2: caducado o usado → valid:false', async () => {
    api.default.mockResolvedValue({
      valid: false,
      message: 'Token inválido o expirado',
    });

    await expect(
      new ApiAuthRepository().validateResetToken('viejo'),
    ).resolves.toMatchObject({ valid: false });
  });
});

describe('Textos del enlace de restablecer: 1 hora (fase 3)', () => {
  it.each([
    ['es', esAuth, /1 hora/],
    ['en', enAuth, /1 hour/],
  ])(
    'R3 (%s): pasos y ventajas dicen 1 hora, nunca 24',
    (_idioma, textos, unaHora) => {
      expect(textos.forgotPassword.nextStep2).toMatch(unaHora);
      expect(textos.forgotPassword.features.expires).toMatch(unaHora);
      expect(JSON.stringify(textos.forgotPassword)).not.toMatch(/24/);
    },
  );
});
