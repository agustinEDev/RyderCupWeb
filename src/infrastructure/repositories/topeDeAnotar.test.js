import { describe, it, expect } from 'vitest';
import { TOPE_DE_ANOTAR_MS } from './topeDeAnotar';

describe('el tope de anotar (FE #624)', () => {
  // Decidido el 4 oct: el mismo que el del refresco del token. Los tests de los
  // repositorios comparan con la constante, así que el valor se fija aquí
  it('es de 15 s', () => {
    expect(TOPE_DE_ANOTAR_MS).toBe(15000);
  });
});
