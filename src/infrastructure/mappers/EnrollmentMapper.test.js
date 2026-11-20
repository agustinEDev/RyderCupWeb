import { describe, it, expect } from 'vitest';
import EnrollmentMapper from './EnrollmentMapper';
import { mensajeDelError } from '../../utils/mensajeDelError';
import { aExtras } from './conExtras';

const ALTERNATIVA = 'No se pudo aprobar la inscripción';

const inscripcion = (extra = {}) => ({
  id: '3f6c1a52-8d4e-4b1a-9c7e-2a5b6d8e0f11',
  competition_id: 'comp-1',
  user_id: 'user-1',
  status: 'APPROVED',
  ...extra,
});

describe('EnrollmentMapper', () => {
  it('maps a valid enrollment as before', () => {
    const enrollment = EnrollmentMapper.toDomain(inscripcion());

    expect(enrollment.enrollmentId.toString()).toBe(
      '3f6c1a52-8d4e-4b1a-9c7e-2a5b6d8e0f11',
    );
    expect(enrollment.status.toString()).toBe('APPROVED');
  });

  it.each([
    ['an id that is not a UUID', { id: 'bad-id' }],
    ['an unknown status', { status: 'SOMETHING_ELSE' }],
    ['an unknown tee colour', { color: 'PURPLE' }],
  ])(
    'a conversion failure (%s) is technical: the person sees the fallback',
    (_caso, extra) => {
      let error;
      try {
        EnrollmentMapper.toDomain(inscripcion(extra));
      } catch (e) {
        error = e;
      }

      expect(error).toBeInstanceOf(Error);
      expect(error.mensajeTecnico).toBe(true);
      expect(mensajeDelError(error, ALTERNATIVA)).toBe(ALTERNATIVA);
    },
  );
});

describe('aExtras con la respuesta de Enrollment', () => {
  it('traduce a camelCase los campos que pinta la lista, también dentro de user', () => {
    const extras = aExtras(
      inscripcion({
        fixed_handicap: '12.3',
        category: 2,
        user_name: 'Meis',
        user_email: 'meis@example.com',
        user_handicap: 7.1,
        user: {
          id: 'user-1',
          display_name: 'Trinx',
          alias: 'Trinx',
          first_name: 'Agustín',
          last_name: 'Estévez',
          full_name: 'Agustín Estévez',
          name: 'Agus',
          email: 'a@example.com',
          handicap: 14.2,
          country_code: 'ES',
          gender: 'MALE',
        },
      }),
    );

    expect(extras).toMatchObject({
      fixedHandicap: '12.3',
      category: 2,
      userName: 'Meis',
      userEmail: 'meis@example.com',
      userHandicap: 7.1,
      user: {
        displayName: 'Trinx',
        alias: 'Trinx',
        firstName: 'Agustín',
        lastName: 'Estévez',
        fullName: 'Agustín Estévez',
        name: 'Agus',
        email: 'a@example.com',
        handicap: 14.2,
        countryCode: 'ES',
        gender: 'MALE',
      },
    });
  });

  it.each([null, undefined])('sin respuesta (%s) devuelve null', (vacio) => {
    expect(aExtras(vacio)).toBeNull();
  });

  it('lo que la API no manda queda undefined, sin valores por defecto', () => {
    const extras = aExtras(inscripcion({ user: { first_name: 'Ana' } }));

    expect(extras.fixedHandicap).toBeUndefined();
    expect(extras.category).toBeUndefined();
    expect(extras.userName).toBeUndefined();
    expect(extras.userEmail).toBeUndefined();
    expect(extras.userHandicap).toBeUndefined();
    expect(extras.user.firstName).toBe('Ana');
    expect(extras.user.displayName).toBeUndefined();
    expect(extras.user.countryCode).toBeUndefined();
  });

  it('copia null tal cual, y un user ausente o null no se inventa', () => {
    expect(
      aExtras(
        inscripcion({ fixed_handicap: null, category: null, user: null }),
      ),
    ).toMatchObject({ fixedHandicap: null, category: null, user: null });
    expect(aExtras(inscripcion()).user).toBeUndefined();
  });

  it('no deja pasar claves snake_case, ni dentro de user', () => {
    const extras = aExtras(
      inscripcion({ user: { id: 'u', country_code: 'ES' } }),
    );

    expect(Object.keys(extras).some((k) => k.includes('_'))).toBe(false);
    expect(Object.keys(extras.user).some((k) => k.includes('_'))).toBe(false);
  });
});
