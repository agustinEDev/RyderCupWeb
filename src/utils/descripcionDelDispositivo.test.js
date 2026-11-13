import { describe, it, expect } from 'vitest';
import {
  nombreDelDispositivo,
  paisDelDispositivo,
  iconoDelDispositivo,
} from './descripcionDelDispositivo';

/**
 * El nombre, el icono y el país de cada dispositivo, en el idioma de la app (FE #1046).
 *
 * El backend manda códigos (tipo, plataforma, navegador, app instalada, país); aquí
 * se traducen. Antes salía el nombre en inglés que fijaba el backend al darlo de
 * alta, que se equivocaba (Chrome en el iPhone era «Safari on iOS»).
 *
 *   #   dispositivo                           | nombre                         | icono
 *   ----|--------------------------------------|--------------------------------|---------
 *   D1  iPhone con Safari                     | iPhone · Safari                | phone
 *   D2  iPhone con Chrome                     | iPhone · Chrome                | phone
 *   D3  iPhone con la app instalada           | iPhone · app instalada         | phone
 *   D4  iPad                                  | iPad · Safari                  | tablet
 *   D5  Android con Samsung Internet          | Android · Samsung Internet     | phone
 *   D6  Mac / Windows / Chromebook            | Mac · Safari, …                | computer
 *   D7  navegador de Instagram                | iPhone · navegador de Instagram| phone
 *   D8  plataforma desconocida                | el nombre del backend, o «Dispositivo desconocido» | unknown
 *   D9  país ES en castellano / inglés        | España / Spain
 *   D10 sin país o código raro                | null
 */
const t = (clave) =>
  ({
    'platform.iphone': 'iPhone',
    'platform.ipad': 'iPad',
    'platform.mac': 'Mac',
    'platform.android': 'Android',
    'platform.windows': 'Windows',
    'platform.chromebook': 'Chromebook',
    'browser.safari': 'Safari',
    'browser.chrome': 'Chrome',
    'browser.samsung': 'Samsung Internet',
    'browser.instagram': 'navegador de Instagram',
    'browser.installedApp': 'app instalada',
    'device.unknown': 'Dispositivo desconocido',
  })[clave] ?? clave;

const dispositivo = (extra) => ({
  deviceType: 'phone',
  platform: 'iphone',
  browser: 'safari',
  installedApp: false,
  ...extra,
});

describe('el nombre y el icono de un dispositivo', () => {
  it.each([
    ['D1', dispositivo(), 'iPhone · Safari', 'phone'],
    ['D2', dispositivo({ browser: 'chrome' }), 'iPhone · Chrome', 'phone'],
    [
      'D3',
      dispositivo({ installedApp: true }),
      'iPhone · app instalada',
      'phone',
    ],
    [
      'D4',
      dispositivo({ deviceType: 'tablet', platform: 'ipad' }),
      'iPad · Safari',
      'tablet',
    ],
    [
      'D5',
      dispositivo({ platform: 'android', browser: 'samsung' }),
      'Android · Samsung Internet',
      'phone',
    ],
    [
      'D6',
      dispositivo({ deviceType: 'computer', platform: 'mac' }),
      'Mac · Safari',
      'computer',
    ],
    [
      'D6b',
      dispositivo({
        deviceType: 'computer',
        platform: 'chromebook',
        browser: 'chrome',
      }),
      'Chromebook · Chrome',
      'computer',
    ],
    [
      'D7',
      dispositivo({ browser: 'instagram' }),
      'iPhone · navegador de Instagram',
      'phone',
    ],
  ])('%s', (_, d, nombre, icono) => {
    expect(nombreDelDispositivo(d, t)).toBe(nombre);
    expect(iconoDelDispositivo(d)).toBe(icono);
  });

  it('D8: plataforma desconocida: el nombre del backend, y si no, «Dispositivo desconocido»', () => {
    const raro = {
      deviceType: 'unknown',
      platform: 'unknown',
      browser: 'unknown',
      deviceName: 'curl',
    };

    expect(nombreDelDispositivo(raro, t)).toBe('curl');
    expect(nombreDelDispositivo({ ...raro, deviceName: '' }, t)).toBe(
      'Dispositivo desconocido',
    );
    expect(iconoDelDispositivo(raro)).toBe('unknown');
    expect(iconoDelDispositivo({})).toBe('unknown');
    expect(iconoDelDispositivo({ deviceType: 'nevera' })).toBe('unknown');
  });

  it('D8b: un navegador desconocido en una plataforma conocida: solo la plataforma', () => {
    expect(nombreDelDispositivo(dispositivo({ browser: 'unknown' }), t)).toBe(
      'iPhone',
    );
  });
});

describe('el país de un dispositivo', () => {
  it('D9: el nombre del país en el idioma de la app', () => {
    expect(paisDelDispositivo('ES', 'es')).toBe('España');
    expect(paisDelDispositivo('ES', 'en')).toBe('Spain');
  });

  it.each([null, undefined, '', 'X', 'ESP', '12', '419'])(
    'D10: con %j, null',
    (codigo) => {
      expect(paisDelDispositivo(codigo, 'es')).toBeNull();
    },
  );

  it('D10b: un idioma que Intl no entiende no lanza, y da el nombre en el del navegador', () => {
    expect(() => paisDelDispositivo('ES', 'no-es-un-idioma-$$')).not.toThrow();
    expect(paisDelDispositivo('ES', 'no-es-un-idioma-$$')).toBeTruthy();
  });
});
