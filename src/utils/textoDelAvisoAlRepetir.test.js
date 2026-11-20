import { describe, it, expect } from 'vitest';
import { textoDelAviso } from './textoDelAvisoAlRepetir';

/**
 * Los textos de lo que no se pudo copiar al repetir (FE #1021). `t` devuelve
 * la clave con sus valores, para ver qué se pidió.
 */
const t = (clave, valores) =>
  valores ? `${clave} ${JSON.stringify(valores)}` : clave;
const tCampos = (clave, { defaultValue }) =>
  clave === 'form.teeColors.yellow' ? 'Amarillas' : defaultValue;

describe('textoDelAviso: la barra dentro de la frase', () => {
  it('color traducido y género escrito en minúsculas', () => {
    const tGenero = (clave, valores) =>
      clave === 'create.teePanel.male' ? 'De Hombre' : t(clave, valores);
    expect(
      textoDelAviso(tGenero, tCampos, {
        tipo: 'barra',
        propia: true,
        color: 'yellow',
        genero: 'MALE',
      }),
    ).toBe('create.repetir.avisoMiBarra {"barra":"Amarillas de hombre"}');
  });

  it('sin género conocido, solo el color; sin traducción, el color tal cual', () => {
    expect(
      textoDelAviso(t, tCampos, {
        tipo: 'barra',
        nombre: 'Luis',
        color: 'teal',
        genero: null,
      }),
    ).toBe('create.repetir.avisoBarra {"nombre":"Luis","barra":"teal"}');
  });
});

describe('textoDelAviso', () => {
  it.each([
    [{ tipo: 'campo' }, 'create.repetir.avisoCampo'],
    [
      { tipo: 'noAmigo', nombre: 'Luis' },
      'create.repetir.avisoNoAmigo {"nombre":"Luis"}',
    ],
    [
      { tipo: 'invitado', nombre: 'Ana' },
      'create.repetir.avisoInvitado {"nombre":"Ana"}',
    ],
    [{ tipo: 'faltan' }, 'create.repetir.avisoFaltan'],
    [{ tipo: 'sinBarra', propia: true }, 'create.repetir.avisoMiBarraNueva'],
    [
      { tipo: 'sinBarra', nombre: 'Luis' },
      'create.repetir.avisoBarraNueva {"nombre":"Luis"}',
    ],
    [
      { tipo: 'barra', propia: true, color: 'yellow', genero: null },
      'create.repetir.avisoMiBarra {"barra":"Amarillas"}',
    ],
    [
      { tipo: 'barra', nombre: 'Luis', color: 'yellow', genero: null },
      'create.repetir.avisoBarra {"nombre":"Luis","barra":"Amarillas"}',
    ],
  ])('%o → %s', (aviso, texto) => {
    expect(textoDelAviso(t, tCampos, aviso)).toBe(texto);
  });
});
