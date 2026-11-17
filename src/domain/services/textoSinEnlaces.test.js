import { describe, it, expect } from 'vitest';
import { contieneEnlace } from './textoSinEnlaces';

// Los mismos casos que el servidor (test_texto_sin_enlaces.py): las dos reglas no
// pueden discrepar, o el formulario dejaría pasar lo que la API rechaza
describe('contieneEnlace (SB-05)', () => {
  it.each([
    'entra en https://premio.com/ya',
    'http://x.es',
    'www.premio.com',
    'Premio en premio.com',
    'PREMIO.COM',
    'escribe a gana@premio.net',
    'sub.dominio.premio.io/ruta?x=1',
    'premio\u3002com',
    'premio\uff0ecom/regalo',
    'premio\u200b.com',
    'premio.c\u00adom',
    'en 203.0.113.7/regalo',
    'Entra en 203.0.113.7.',
    'Gana en пример.рф',
    'premio.xn--p1ai/ya',
    'Llama ya: tel:+34600000000',
    'sms:+34600000000?body=x',
    'mailto:gana@premio.com',
    'cafe\u0301.fr',
    'premio.cat',
    'premio.eus',
    'www.premio.bet',
    'gana@premio.lat',
    'premio\u200e.com',
    'premio\u2063.com',
    'Club.golf',
    // Marcas que se combinan dentro de la terminación (CodeRabbit en BE #890)
    'ejemplo.\u092d\u093e\u0930\u0924',
    'ejemplo.xn--h2brj9c',
    'premio\u200b.\u092d\u093e\u0930\u0924',
    // Mayúscula inicial: las habituales y con ruta sí cuentan (17 nov 2026)
    'premio.Com',
    'premio.Com/regalo',
    'premio.Es/regalo',
    'Entra en premio.Net',
    'premio.Golf/regalo',
  ])('detecta «%s»', (texto) => {
    expect(contieneEnlace(texto)).toBe(true);
  });

  it.each([
    'Ryder Cup de los amigos',
    'Torneo 2026.1',
    'J.R. Martín',
    'Sr. Pérez',
    'Club de Golf La Herrería',
    'j.garcia',
    'Ana.Maria',
    'Copa St.Andrews',
    'Hola Juan.Te invito',
    'Nos vemos el sabado.Un abrazo',
    'Copa Pro.Am 2026',
    'Torneo Ed.II',
    'Pepe.Jr',
    'Dr.No',
    'Club.Golf',
    '',
    null,
  ])('no ve enlace en «%s»', (texto) => {
    expect(contieneEnlace(texto)).toBe(false);
  });
});
