import { describe, it, expect } from 'vitest';
import { copiaDelUsuarioEnElDispositivo, esLaCopiaReducida } from './copiaDelUsuarioEnElDispositivo';

/**
 * Lo que se guarda del usuario en el dispositivo (fase 3, FE-06; elegido por Agustín,
 * opción A): id, nombre (first/last, alias, display_name), versión del avatar
 * (updated_at), permisos (is_admin, roles, Términos) y si verificó el correo. NI correo,
 * NI correo pendiente, NI género, NI hándicap, país, fechas, proveedores, has_password
 * ni share_activity. Vale para el DTO (snake_case) y para la entidad (camelCase).
 */
const DTO_COMPLETO = {
  id: 'u1',
  email: 'ana@example.com',
  pending_email: 'nueva@example.com',
  first_name: 'Ana',
  last_name: 'Pérez',
  alias: 'Anita',
  display_name: 'Anita',
  gender: 'FEMALE',
  handicap: 12.4,
  handicap_updated_at: '2026-01-01T00:00:00Z',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2026-11-01T00:00:00Z',
  country_code: 'ES',
  email_verified: true,
  auth_providers: ['google'],
  has_password: true,
  share_activity: true,
  is_admin: true,
  roles: ['ADMIN'],
  terms_accepted: false,
  terms_version_required: '2026-10',
  verification_token: 'secreto',
};

const ENTIDAD = {
  id: 'u1',
  email: { _value: 'ana@example.com' },
  pendingEmail: 'nueva@example.com',
  firstName: 'Ana',
  lastName: 'Pérez',
  alias: null,
  displayName: 'Ana Pérez',
  gender: 'FEMALE',
  handicap: 3,
  countryCode: { _value: 'ES' },
  emailVerified: false,
  updatedAt: '2026-11-01T00:00:00Z',
  termsAccepted: true,
  termsVersionRequired: null,
  authProviders: [],
  hasPassword: true,
  verificationToken: 'secreto',
  domainEvents: [],
};

describe('copiaDelUsuarioEnElDispositivo (fase 3)', () => {
  it('del DTO deja solo lo permitido', () => {
    expect(copiaDelUsuarioEnElDispositivo(DTO_COMPLETO)).toEqual({
      id: 'u1',
      first_name: 'Ana',
      last_name: 'Pérez',
      alias: 'Anita',
      display_name: 'Anita',
      updated_at: '2026-11-01T00:00:00Z',
      email_verified: true,
      is_admin: true,
      roles: ['ADMIN'],
      terms_accepted: false,
      terms_version_required: '2026-10',
    });
  });

  it('de la entidad, igual en camelCase', () => {
    expect(copiaDelUsuarioEnElDispositivo(ENTIDAD)).toEqual({
      id: 'u1',
      firstName: 'Ana',
      lastName: 'Pérez',
      alias: null,
      displayName: 'Ana Pérez',
      updatedAt: '2026-11-01T00:00:00Z',
      emailVerified: false,
      termsAccepted: true,
      termsVersionRequired: null,
    });
  });

  it('nunca el correo, el pendiente, el género ni nada de lo quitado', () => {
    const texto = JSON.stringify([copiaDelUsuarioEnElDispositivo(DTO_COMPLETO), copiaDelUsuarioEnElDispositivo(ENTIDAD)]);
    for (const prohibido of ['ana@example.com', 'nueva@example.com', 'FEMALE', 'secreto', '12.4', 'google', 'ES']) {
      expect(texto).not.toContain(prohibido);
    }
  });

  it.each([[null], [undefined], ['texto'], [42], [[1, 2]]])('con %s devuelve null', (valor) => {
    expect(copiaDelUsuarioEnElDispositivo(valor)).toBeNull();
  });

  it('sabe si una copia ya está reducida', () => {
    expect(esLaCopiaReducida(DTO_COMPLETO)).toBe(false);
    expect(esLaCopiaReducida(copiaDelUsuarioEnElDispositivo(DTO_COMPLETO))).toBe(true);
  });
});

describe('valores que no son un usuario (CodeRabbit, #1092)', () => {
  it.each([[[]], [[{ id: 'u1' }]], [{}], [{ alias: 'x' }], [null], [undefined], ['texto'], [42], [true]])(
    'esLaCopiaReducida(%j) es false',
    (valor) => {
      expect(esLaCopiaReducida(valor)).toBe(false);
    }
  );

  it.each([[{}], [{ first_name: 'Ana' }], [[{ id: 'u1' }]]])('sin id no es un usuario: copia(%j) es null', (valor) => {
    expect(copiaDelUsuarioEnElDispositivo(valor)).toBeNull();
  });
});
