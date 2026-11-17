import { describe, it, expect } from 'vitest';
import { mensajeDelError } from './mensajeDelError';

// Re-auditoría Q-FE-06: las pantallas enseñaban el texto crudo del error
const ALTERNATIVA = 'No se ha podido guardar';

const http = (status, message, extra = {}) =>
  Object.assign(new Error(message), { status, ...extra });

describe('mensajeDelError', () => {
  it('a known code gives its translated text, whatever the status', () => {
    const error = http(409, 'Email already in use', {
      errorCode: 'EMAIL_ALREADY_IN_USE',
    });
    expect(
      mensajeDelError(error, ALTERNATIVA, {
        EMAIL_ALREADY_IN_USE: 'Ese correo ya es de otra cuenta',
      }),
    ).toBe('Ese correo ya es de otra cuenta');
  });

  it('an unknown code is not enough by itself', () => {
    const error = http(500, 'boom', { errorCode: 'OTHER' });
    expect(mensajeDelError(error, ALTERNATIVA, { X: 'x' })).toBe(ALTERNATIVA);
  });

  it('the text the app already translated (429, Terms) is kept', () => {
    const error = http(429, 'Demasiados intentos seguidos', {
      mensajeTraducido: true,
    });
    expect(mensajeDelError(error, ALTERNATIVA)).toBe(
      'Demasiados intentos seguidos',
    );
  });

  it('a 4xx reason in plain text is shown', () => {
    expect(
      mensajeDelError(http(400, 'Ese jugador ya es participante'), ALTERNATIVA),
    ).toBe('Ese jugador ya es participante');
  });

  it('so is the reason a use case gives', () => {
    expect(
      mensajeDelError(new Error('El hándicap se sale de rango'), ALTERNATIVA),
    ).toBe('El hándicap se sale de rango');
  });

  it.each([
    ['a 5xx', http(500, 'Internal Server Error')],
    ['a 503 of the service worker', http(503, 'Service Unavailable')],
    [
      'a technical 422 list',
      http(422, 'Field required', { mensajeTecnico: true }),
    ],
    ['a JSON object', http(400, '{"campo":"x"}')],
    ['a JSON list', http(400, '[{"msg":"x"}]')],
    [
      'the HTTP fallback',
      http(404, 'HTTP 404: Not Found', { mensajeTecnico: true }),
    ],
    ['a network failure', new TypeError('Failed to fetch')],
    ['a flagged network failure', http(0, 'x', { sinConexion: true })],
    ['a code failure', new TypeError('Cannot read properties of undefined')],
    ['a bare code', new Error('FAILED_TO_REVOKE_DEVICE')],
    ['a code failure of another kind', new ReferenceError('x is not defined')],
    ['an empty message', http(400, '   ')],
    ['nothing', undefined],
    ['a string', 'boom'],
  ])('%s gives the translated alternative', (_caso, error) => {
    expect(mensajeDelError(error, ALTERNATIVA)).toBe(ALTERNATIVA);
  });
});
