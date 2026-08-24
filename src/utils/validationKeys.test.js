import { describe, it, expect } from 'vitest';
import es from '../i18n/locales/es/auth.json';
import en from '../i18n/locales/en/auth.json';
import { validateEmail, validatePassword, validateName } from './validation';

/**
 * Las validaciones devuelven `messageKey` y la interfaz lo pinta con `t()`. Si
 * una clave no existe, i18next devuelve la clave misma y el formulario enseña
 * «validation.firstNameTooShort» al usuario: no falla nada, solo queda feo en
 * pantalla, que es como se escapan estas cosas.
 *
 * Aqui se recorren TODAS las ramas de las tres validaciones y se comprueba que
 * cada clave que pueden devolver existe en los dos idiomas. Al derivarse algunas
 * de una plantilla (`validation.${campo}Required`), un fallo tipografico solo se
 * ve ejecutandolas de verdad, no leyendo el fuente.
 */
const bundles = { es, en };

const resuelve = (clave) => (idioma) =>
  clave.replace(/^validation\./, '').split('.').reduce((o, k) => o?.[k], bundles[idioma].validation);

const CASOS = [
  ['correo vacio', () => validateEmail('')],
  ['correo con formato malo', () => validateEmail('no-es-un-correo')],
  ['correo larguisimo', () => validateEmail('a'.repeat(250) + '@ejemplo.com')],
  ['contrasena vacia', () => validatePassword('')],
  ['contrasena corta', () => validatePassword('Abc1')],
  ['contrasena larguisima', () => validatePassword('Abc123'.repeat(30))],
  ['contrasena debil', () => validatePassword('aaaaaaaaaaaaaaa')],
  ['nombre vacio', () => validateName('', 'First name')],
  ['nombre corto', () => validateName('A', 'First name')],
  ['nombre largo', () => validateName('a'.repeat(120), 'First name')],
  ['nombre con simbolos', () => validateName('Juan@#$', 'First name')],
  ['apellido vacio', () => validateName('', 'Last name')],
  ['campo generico vacio', () => validateName('')],
];

describe('toda clave de validacion existe en los dos idiomas', () => {
  it.each(CASOS)('%s', (_nombre, ejecutar) => {
    const resultado = ejecutar();

    expect(resultado.isValid).toBe(false);
    expect(resultado.messageKey).toBeTruthy();
    expect(resuelve(resultado.messageKey)('es')).toBeTruthy();
    expect(resuelve(resultado.messageKey)('en')).toBeTruthy();
  });

  it('los dos idiomas traen las mismas claves de validacion', () => {
    expect(Object.keys(es.validation).sort()).toEqual(Object.keys(en.validation).sort());
  });
});
