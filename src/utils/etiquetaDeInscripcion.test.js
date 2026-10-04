import { describe, it, expect } from 'vitest';
import i18next from 'i18next';
import competicionesEs from '../i18n/locales/es/competitions.json';
import competicionesEn from '../i18n/locales/en/competitions.json';
import EnrollmentStatus from '../domain/value_objects/EnrollmentStatus';
import { etiquetaDeInscripcion } from './etiquetaDeInscripcion';

/**
 * La etiqueta del estado de inscripción («Tu estado de inscripción: …»).
 *
 * Solo REQUESTED, APPROVED y REJECTED tenían texto: INVITED, CANCELLED y
 * WITHDRAWN salían como la clave («enrollmentStatus.WITHDRAWN»). Decidido por
 * Agustín el 4 oct 2026: INVITADO / INVITADA según el género del jugador (el
 * invitado es él), y CANCELADA / RETIRADA, que hablan de la inscripción. Sin
 * género, INVITADO.
 */
const traductor = async (lng) => {
  const i = i18next.createInstance();
  await i.init({
    lng,
    resources: { es: { competitions: competicionesEs }, en: { competitions: competicionesEn } },
    defaultNS: 'competitions',
    interpolation: { escapeValue: false },
  });
  return i.t.bind(i);
};

describe('etiquetaDeInscripcion', () => {
  it.each([
    ['es', 'INVITED', 'MALE', 'INVITADO'],
    ['es', 'INVITED', 'FEMALE', 'INVITADA'],
    ['es', 'INVITED', null, 'INVITADO'],
    ['es', 'INVITED', undefined, 'INVITADO'],
    ['es', 'CANCELLED', 'FEMALE', 'CANCELADA'],
    ['es', 'WITHDRAWN', 'MALE', 'RETIRADA'],
    ['es', 'APPROVED', 'FEMALE', 'APROBADA'],
    ['en', 'INVITED', 'FEMALE', 'INVITED'],
    ['en', 'INVITED', 'MALE', 'INVITED'],
    ['en', 'CANCELLED', null, 'CANCELLED'],
    ['en', 'WITHDRAWN', null, 'WITHDRAWN'],
  ])('%s · %s con género %s → %s', async (lng, estado, genero, texto) => {
    const t = await traductor(lng);

    expect(etiquetaDeInscripcion(t, estado, genero)).toBe(texto);
  });

  it.each(['es', 'en'])('en %s, ningún estado del dominio sale como clave', async (lng) => {
    const t = await traductor(lng);

    for (const estado of EnrollmentStatus.getAllValues()) {
      for (const genero of ['MALE', 'FEMALE', null]) {
        const texto = etiquetaDeInscripcion(t, estado, genero);
        expect(texto, `${estado}/${genero}`).not.toMatch(/enrollmentStatus/);
        expect(texto.trim(), `${estado}/${genero}`).not.toBe('');
      }
    }
  });

  it('sin estado no pinta nada', async () => {
    const t = await traductor('es');

    expect(etiquetaDeInscripcion(t, null, 'MALE')).toBe('');
  });
});

// Las pantallas no montan la clave a mano: si lo hicieran, se saltarían el género
const fuentes = import.meta.glob(['/src/**/*.jsx', '!/src/**/*.test.jsx'], {
  query: '?raw',
  import: 'default',
  eager: true,
});

describe('las pantallas usan la etiqueta', () => {
  it('nadie traduce `enrollmentStatus.${…}` por su cuenta', () => {
    const aMano = Object.entries(fuentes)
      .filter(([, codigo]) => /t\(`enrollmentStatus\.\$\{/.test(codigo))
      .map(([fichero]) => fichero);

    expect(aMano).toEqual([]);
  });
});
