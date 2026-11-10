import { describe, it, expect, vi, beforeEach } from 'vitest';
import ApiAuthRepository from './ApiAuthRepository';
import Email from '../../domain/value_objects/Email';
import Password from '../../domain/value_objects/Password';
import * as api from '../http/api.js';

/**
 * Los tokens de sesión van solo en cookies httpOnly (fase 3): el backend 2.58.0 deja de
 * mandarlos en el cuerpo. Entrar, Google y verificar no los leen; el `csrf_token` sí.
 *
 *   T1 login, Google y verificar funcionan con un cuerpo SIN access_token ni refresh_token
 *   T2 aunque vinieran, el resultado no los lleva
 *   T3 ningún fichero de la app vuelve a leer `access_token` o `refresh_token` de una
 *      respuesta (solo se permiten los que los BORRAN: limpiezas y el filtro de Sentry)
 */
vi.mock('../http/api.js', () => ({ default: vi.fn() }));

const usuario = { id: 'u1', email: 'ana@example.com', first_name: 'Ana', last_name: 'Pérez' };
const email = new Email('ana@example.com');
const password = new Password('Password123', { validateStrength: false });
const VERIFIER = 'a'.repeat(43);

describe('Tokens solo en cookies (fase 3)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('T1: con un cuerpo sin tokens, se entra igual y el csrf_token se lee', async () => {
    const repo = new ApiAuthRepository();
    api.default.mockResolvedValue({ user: usuario, csrf_token: 'csrf-1', is_new_user: false, email_verified: true });

    expect((await repo.login(email, password)).csrfToken).toBe('csrf-1');
    expect((await repo.googleLogin('codigo', VERIFIER)).csrfToken).toBe('csrf-1');
    await expect(repo.verifyEmail('tok')).resolves.toEqual({ emailVerified: true });
  });

  it('T2: si el cuerpo aún los trae, no pasan al resultado', async () => {
    const repo = new ApiAuthRepository();
    api.default.mockResolvedValue({
      user: usuario,
      csrf_token: 'csrf-1',
      access_token: 'ACCESO',
      refresh_token: 'REFRESCO',
      email_verified: true,
    });

    for (const resultado of [
      await repo.login(email, password),
      await repo.googleLogin('codigo', VERIFIER),
      await repo.verifyEmail('tok'),
    ]) {
      const texto = JSON.stringify(resultado);
      expect(texto).not.toContain('ACCESO');
      expect(texto).not.toContain('REFRESCO');
      expect(resultado).not.toHaveProperty('token');
    }
  });

  it('T3: nadie lee access_token ni refresh_token de una respuesta', () => {
    const fuentes = import.meta.glob(['/src/**/*.{js,jsx,ts,tsx}', '!/src/**/*.test.{js,jsx,ts,tsx}'], {
      query: '?raw',
      import: 'default',
      eager: true,
    });
    // Leer: `x.access_token`, `x?.refresh_token`, `x['access_token']` o desestructurarlo.
    // Borrarlo (`delete x.access_token`) o nombrarlo en una lista de campos a ocultar no es leer
    const lectura =
      /(?<!delete\s+[\w.?]+)(?:\??\.(?:access|refresh)_token\b|\[\s*['"](?:access|refresh)_token['"]\s*\]|\{[^}]*\b(?:access|refresh)_token\b[^}]*\}\s*=)/;
    const culpables = Object.entries(fuentes)
      .filter(([, codigo]) =>
        codigo.split('\n').some((linea) => !linea.trim().startsWith('//') && !linea.trim().startsWith('*') && lectura.test(linea))
      )
      .map(([fichero]) => fichero);

    expect(culpables).toEqual([]);
  });
});
