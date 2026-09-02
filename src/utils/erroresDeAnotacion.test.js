import { describe, expect, it } from 'vitest';

import { claveDelAvisoDelVaciado, errorDeGuardado } from './erroresDeAnotacion';

describe('erroresDeAnotacion (FE #551)', () => {
  it('el error de guardado lleva hoyo, marca y clave con espacio de nombres', () => {
    // Con `scoring:` delante vale desde las dos pantallas, tenga el `t` que
    // tenga cada una: antes cada hook llevaba su clave y su copia del texto
    const err = errorDeGuardado(7);
    expect(err).toBeInstanceOf(Error);
    expect(err.holeNumber).toBe(7);
    expect(err.noSeGuardo).toBe(true);
    expect(err.i18nKey).toBe('scoring:errors.noSeGuardoEnElMovil');
  });

  it('la clave del aviso del vaciado sale del paro', () => {
    expect(claveDelAvisoDelVaciado('no-se-pudo-borrar')).toBe('scoring:errors.vaciado.no-se-pudo-borrar');
  });
});
