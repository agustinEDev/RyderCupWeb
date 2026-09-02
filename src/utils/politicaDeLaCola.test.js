import { describe, expect, it } from 'vitest';

import { esRechazoDefinitivo, seGuardaParaDespues, noLlegoAlServidor} from './politicaDeLaCola';

const errorCon = (status) => Object.assign(new Error(`HTTP ${status}`), { status });
const errorDeRespuesta = (status) => Object.assign(new Error('boom'), { response: { status } });

describe('politicaDeLaCola', () => {
  it('sin respuesta se guarda: no se ha podido preguntar', () => {
    // Sin cobertura, o el fallo de CSRF que api.js lanza como Error pelado
    expect(seGuardaParaDespues(new TypeError('Failed to fetch'))).toBe(true);
    expect(seGuardaParaDespues(new Error('CSRF'))).toBe(true);
    expect(seGuardaParaDespues(undefined)).toBe(true);
  });

  it.each([401, 408, 429])('un %s se guarda: no es culpa del golpe', (codigo) => {
    // Abrir la aplicación días después con golpes guardados da un 401, y
    // descartar por eso sería borrar anotaciones buenas
    expect(seGuardaParaDespues(errorCon(codigo))).toBe(true);
    expect(esRechazoDefinitivo(errorCon(codigo))).toBe(false);
  });

  it.each([400, 403, 404, 409, 422])('un %s se descarta: la petición no entra', (codigo) => {
    expect(esRechazoDefinitivo(errorCon(codigo))).toBe(true);
  });

  it.each([500, 502, 503])('un %s se guarda: el servidor volverá', (codigo) => {
    expect(seGuardaParaDespues(errorCon(codigo))).toBe(true);
  });

  it('lee el código esté donde esté', () => {
    // Unos errores lo traen arriba y otros dentro de `response`
    expect(esRechazoDefinitivo(errorDeRespuesta(409))).toBe(true);
    expect(seGuardaParaDespues(errorDeRespuesta(503))).toBe(true);
  });

  it('las dos preguntas son exactamente contrarias', () => {
    for (const codigo of [undefined, 400, 401, 403, 408, 409, 422, 429, 500, 503]) {
      const err = codigo === undefined ? new Error('sin código') : errorCon(codigo);
      expect(esRechazoDefinitivo(err)).toBe(!seGuardaParaDespues(err));
    }
  });
});

describe('noLlegoAlServidor · la petición abortada (FE #551)', () => {
  it('una petición abortada cuenta como que no llegó', () => {
    // Es lo que lanza el refresco del token al vencer su tope de 15 s. Sin
    // esto no era rechazo, ni sesión, ni red: el bucle seguía con la
    // siguiente y doce golpes eran tres minutos de peticiones condenadas
    const abortada = new Error('The operation was aborted.');
    abortada.name = 'AbortError';

    expect(noLlegoAlServidor(abortada)).toBe(true);
    expect(esRechazoDefinitivo(abortada)).toBe(false);
  });

  it('y una que vence por tiempo, igual', () => {
    const vencida = new Error('The operation timed out.');
    vencida.name = 'TimeoutError';

    expect(noLlegoAlServidor(vencida)).toBe(true);
  });

  it('pero un error de validación del caso de uso NO', () => {
    // Ese habla solo de esa anotación: parar por él dejaría las demás sin
    // enviar en cada reconexión, para siempre
    expect(noLlegoAlServidor(new Error('Marked player ID is required'))).toBe(false);
  });
});
