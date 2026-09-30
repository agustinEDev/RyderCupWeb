import { describe, it, expect } from 'vitest';
import { scrubDeep, sentryScrubbing } from './sentryScrubbing';

/**
 * Los ganchos de Sentry que tapan los secretos de las URLs, en un solo sitio
 * para las dos inicializaciones (`main.jsx` e `infrastructure/sentry.ts`).
 *
 * Por lo que se escapaban el 30 sep 2026 (revisión de lo subido ese día):
 *
 *   #   por dónde                                      | esperado
 *   ----|-----------------------------------------------|---------------------------
 *   D1  texto dentro de objetos, listas y { value }   | tapado, lo demás intacto
 *   D2  un objeto que se contiene a sí mismo           | no se cuelga
 *   H1  miga de navegación: data.from / data.to       | tapadas
 *   H2  error: request.url y la cabecera Referer      | tapadas
 *   H3  evento de Replay: su lista urls               | tapada
 *   H4  span suelto: url.path y el referer en lista   | tapados
 *   D3  un getter que lanza                         | se sigue con lo demás
 *   H5  grabación de Replay: migas y navegaciones     | tapadas (el meta no llega)
 *   D4  un objeto que no es simple (clase, Error)    | ni se entra: puede ser del SDK o de la app
 *   D5  sdkProcessingMetadata (el estado del SDK)     | ni se entra
 *   D6  una cadena de objetos muy profunda            | no revienta la pila
 *   H8  miga de consola: sus argumentos               | se tapan en una copia; los de la app, intactos
 *   H6  grabación de Replay: la foto del DOM           | ni se recorre
 *   H7  transacción: su URL y la de sus spans         | tapadas
 */
const TOKEN = 'abc123';
const RESET = `https://www.rydercupfriends.com/reset-password/${TOKEN}`;
const GOOGLE = `/auth/google/callback?code=${TOKEN}&state=${TOKEN}`;

const sinToken = (valor) => expect(JSON.stringify(valor)).not.toContain(TOKEN);

describe('scrubDeep', () => {
  it('D1: tapa el texto en cualquier nivel y deja lo demás', () => {
    const datos = {
      a: RESET,
      lista: [GOOGLE, 3, null],
      anidado: { b: { value: `/x?token=${TOKEN}`, type: 'string' } },
      numero: 7,
      normal: '/api/v1/competitions?status=ACTIVE',
    };
    expect(scrubDeep(datos)).toBe(datos);
    sinToken(datos);
    expect(datos.numero).toBe(7);
    expect(datos.lista[1]).toBe(3);
    expect(datos.normal).toBe('/api/v1/competitions?status=ACTIVE');
    expect(datos.anidado.b.type).toBe('string');
  });

  it('D2: aguanta un objeto que se contiene a sí mismo', () => {
    const datos = { url: RESET };
    datos.yo = datos;
    scrubDeep(datos);
    expect(datos.url).toBe('https://www.rydercupfriends.com/reset-password/[REDACTED]');
  });

  it('devuelve tapado un texto suelto y deja pasar lo vacío', () => {
    expect(scrubDeep(`/x?code=${TOKEN}`)).toBe('/x?code=[REDACTED]');
    expect(scrubDeep(undefined)).toBeUndefined();
    expect(scrubDeep(null)).toBeNull();
  });
});

describe('sentryScrubbing', () => {
  it('H1: la miga de navegación, con su from y su to', () => {
    const miga = { category: 'navigation', data: { from: `/verify-email?token=${TOKEN}`, to: RESET } };
    expect(sentryScrubbing.beforeBreadcrumb(miga)).toBe(miga);
    sinToken(miga);
  });

  it('H2: el error, con su URL y el Referer', () => {
    const evento = { request: { url: RESET, headers: { Referer: `https://www.rydercupfriends.com${GOOGLE}` } } };
    expect(sentryScrubbing.beforeSend(evento)).toBe(evento);
    sinToken(evento);
  });

  it('H3: el evento de Replay, que no pasa por beforeSend, con su lista de URLs', () => {
    const evento = { type: 'replay_event', urls: [RESET, GOOGLE], request: { headers: { Referer: RESET } } };
    expect(sentryScrubbing.eventProcessor(evento)).toBe(evento);
    sinToken(evento);
  });

  it('H4: el span suelto, con url.path y el referer como lista', () => {
    const span = {
      name: `pageload ${RESET}`,
      attributes: {
        'url.path': `/reset-password/${TOKEN}`,
        'http.request.header.referer': [`https://www.rydercupfriends.com${GOOGLE}`],
      },
    };
    expect(sentryScrubbing.beforeSendSpan(span)).toBe(span);
    sinToken(span);
  });

  it('H5: la grabación de Replay: sus migas y navegaciones', () => {
    // El meta (tipo 4, el href) nunca llega a este gancho: Replay solo le pasa
    // los «custom». Ese lo cubre stripSecretsFromAddressBar
    const miga = { type: 5, data: { tag: 'breadcrumb', payload: { data: { url: GOOGLE } } } };
    const navegacion = { type: 5, data: { tag: 'performanceSpan', payload: { description: RESET } } };
    for (const evento of [miga, navegacion]) {
      expect(sentryScrubbing.beforeAddRecordingEvent(evento)).toBe(evento);
      sinToken(evento);
    }
  });

  it('D4: no entra en un objeto que no es simple', () => {
    class Caja {
      constructor() {
        this.url = RESET;
      }
    }
    const caja = new Caja();
    const error = new Error(RESET);
    scrubDeep({ caja, error });
    expect(caja.url).toBe(RESET);
    expect(error.message).toBe(RESET);
  });

  it('D5: no entra en el estado interno del SDK', () => {
    const evento = { request: { url: RESET }, sdkProcessingMetadata: { cosa: { url: RESET } } };
    scrubDeep(evento);
    expect(evento.request.url).not.toContain(TOKEN);
    expect(evento.sdkProcessingMetadata.cosa.url).toBe(RESET);
  });

  it('D6: aguanta una cadena de objetos muy profunda', () => {
    let hondo = { url: RESET };
    for (let i = 0; i < 10000; i += 1) hondo = { hijo: hondo };
    expect(() => scrubDeep(hondo)).not.toThrow();
  });

  it('D3: un getter que lanza no tumba el resto', () => {
    const datos = { url: RESET };
    Object.defineProperty(datos, 'roto', {
      enumerable: true,
      get() {
        throw new Error('no');
      },
    });
    expect(() => scrubDeep(datos)).not.toThrow();
    expect(datos.url).toBe('https://www.rydercupfriends.com/reset-password/[REDACTED]');
  });

  it('H6: la foto del DOM de la grabación ni se recorre', () => {
    // Puede ser enorme; y el token no se pinta en la página
    const foto = { type: 2, data: { node: { attributes: { href: RESET } } } };
    expect(sentryScrubbing.beforeAddRecordingEvent(foto)).toBe(foto);
    expect(foto.data.node.attributes.href).toBe(RESET);
  });

  it('H8: la miga de consola tapa sus argumentos sin tocar los de la app', () => {
    const deLaApp = { url: RESET };
    const argumentos = [`fallo en ${RESET}`, deLaApp];
    const miga = { category: 'console', message: `fallo en ${RESET}`, data: { arguments: argumentos } };

    sentryScrubbing.beforeBreadcrumb(miga);

    expect(miga.message).not.toContain(TOKEN);
    expect(miga.data.arguments[0]).not.toContain(TOKEN);
    expect(miga.data.arguments).not.toBe(argumentos);
    expect(argumentos[0]).toBe(`fallo en ${RESET}`);
    expect(deLaApp.url).toBe(RESET);
  });

  it('H7: la transacción, con su URL y la de sus spans', () => {
    const transaccion = {
      request: { url: RESET },
      spans: [{ description: `GET /api/v1/auth/verify?token=${TOKEN}`, data: { url: GOOGLE } }],
    };
    expect(sentryScrubbing.beforeSendTransaction(transaccion)).toBe(transaccion);
    sinToken(transaccion);
  });
});
