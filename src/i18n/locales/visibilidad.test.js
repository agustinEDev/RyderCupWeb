import { describe, it, expect } from 'vitest';
import es from './es/competitions.json';
import en from './en/competitions.json';

/**
 * La etiqueta de la visibilidad va pegada a la del estado (FE #678).
 *
 * «Abierta» al lado de «Borrador» se lee como «inscripciones abiertas», que es
 * justo lo que no pasa. La visibilidad dice quién puede encontrarla, no si se
 * puede entrar ya.
 */
describe('Textos de la visibilidad en la ficha (FE #678)', () => {
  it('T1: una pública se llama «Pública», no «Abierta»', () => {
    expect(es.detail.visibilityPublic).toBe('Pública');
    expect(en.detail.visibilityPublic).toBe('Public');
  });
});
