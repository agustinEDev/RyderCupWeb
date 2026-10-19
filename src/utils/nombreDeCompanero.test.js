import { describe, it, expect } from 'vitest';
import { nombreDeCompanero, nombresDeCompaneros } from './nombreDeCompanero';

/**
 * Cómo se nombra a un compañero en «Con …»: quien se retiró sigue, dicho
 * —«Bea (retirada)»—, con el femenino por su barra (QA de la release). Una
 * sola pieza para la tarjeta, el banner y «Mis partidas» (`/code-review`).
 */
const t = (clave, p) => `${clave} ${JSON.stringify(p)}`;
const CLAVE = 'upcomingMatches.withdrawnPartner';

describe('nombreDeCompanero', () => {
  it('quien juega, su nombre', () => {
    expect(nombreDeCompanero(t, CLAVE, { name: 'Cris', withdrawn: false })).toBe('Cris');
  });

  it('quien se retiró, marcado; en femenino si su barra lo es', () => {
    expect(nombreDeCompanero(t, CLAVE, { name: 'Bea', withdrawn: true, teeGender: 'FEMALE' })).toBe(
      `${CLAVE} {"nombre":"Bea","context":"female"}`
    );
    expect(nombreDeCompanero(t, CLAVE, { name: 'Nacho', withdrawn: true, teeGender: 'MALE' })).toBe(
      `${CLAVE} {"nombre":"Nacho"}`
    );
  });
});

describe('nombresDeCompaneros', () => {
  it('de `partners`, en su orden', () => {
    const partido = {
      partnerNames: ['Bea', 'Cris'],
      partners: [
        { name: 'Bea', withdrawn: true, teeGender: 'FEMALE' },
        { name: 'Cris', withdrawn: false, teeGender: null },
      ],
    };

    expect(nombresDeCompaneros(t, CLAVE, partido)).toEqual([`${CLAVE} {"nombre":"Bea","context":"female"}`, 'Cris']);
  });

  it('lo guardado antes de `partners`: los nombres; sin nada, vacío', () => {
    expect(nombresDeCompaneros(t, CLAVE, { partnerNames: ['Bea'] })).toEqual(['Bea']);
    expect(nombresDeCompaneros(t, CLAVE, {})).toEqual([]);
  });
});
