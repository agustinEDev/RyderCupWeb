import { describe, it, expect, beforeEach, vi } from 'vitest';
import ApiAuthRepository from './ApiAuthRepository';
import * as api from '../http/api.js';

/**
 * PKCE (fase 3): el canje del código de Google, al entrar y al vincular, lleva el
 * verifier que se guardó al empezar la ida.
 */
vi.mock('../http/api.js', async () => ({
  segmento: (await vi.importActual('../http/rutaDeLaApi')).segmento, default: vi.fn() }));

const VERIFIER = 'a'.repeat(43);
const usuario = { id: 'u1', email: 'ana@example.com', first_name: 'Ana', last_name: 'Pérez' };

describe('ApiAuthRepository · canje de Google con PKCE', () => {
  beforeEach(() => vi.clearAllMocks());

  it('al entrar manda el código y el verifier', async () => {
    api.default.mockResolvedValue({ user: usuario, csrf_token: 'c', is_new_user: false });

    await new ApiAuthRepository().googleLogin('codigo', VERIFIER);

    expect(api.default).toHaveBeenCalledWith('/api/v1/auth/google', {
      method: 'POST',
      body: JSON.stringify({ authorization_code: 'codigo', code_verifier: VERIFIER }),
    });
  });

  it('al vincular manda el código y el verifier', async () => {
    api.default.mockResolvedValue({ message: 'ok', provider: 'google', provider_email: 'ana@gmail.com' });

    await new ApiAuthRepository().linkGoogleAccount('codigo', VERIFIER);

    expect(api.default).toHaveBeenCalledWith('/api/v1/auth/google/link', {
      method: 'POST',
      body: JSON.stringify({ authorization_code: 'codigo', code_verifier: VERIFIER }),
    });
  });
});
