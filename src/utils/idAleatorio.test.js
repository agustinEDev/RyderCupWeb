import { describe, it, expect, vi, afterEach } from 'vitest';
import { idAleatorio } from './idAleatorio';

/**
 * Un UUID v4 para el borrador de la partida rápida (FE #848).
 * `crypto.randomUUID` solo existe en contextos seguros y en Safari 15.4+: por
 * http con la IP de la red local, o en un iPhone viejo, no está, y sin id no
 * se podía añadir un invitado ni empezar la partida (`/code-review`).
 */
const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('idAleatorio', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('usa randomUUID cuando existe', () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'de-randomUUID', getRandomValues: vi.fn() });

    expect(idAleatorio()).toBe('de-randomUUID');
  });

  it('sin randomUUID, un v4 hecho con getRandomValues', () => {
    const real = globalThis.crypto;
    vi.stubGlobal('crypto', { getRandomValues: (a) => real.getRandomValues(a) });

    const id = idAleatorio();

    expect(id).toMatch(V4);
    expect(idAleatorio()).not.toBe(id);
  });

  it('marca la versión y la variante aunque los bytes sean todo unos o todo ceros', () => {
    vi.stubGlobal('crypto', { getRandomValues: (a) => a.fill(255) });
    expect(idAleatorio()).toMatch(V4);
    vi.stubGlobal('crypto', { getRandomValues: (a) => a.fill(0) });
    expect(idAleatorio()).toMatch(V4);
  });
});
