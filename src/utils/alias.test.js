import { describe, expect, it } from 'vitest';

import {
  loQueHayQueMandar,
  normalizaElAlias,
  queLePasaAlAlias,
} from './alias';

describe('normalizaElAlias', () => {
  it('quita los espacios de los bordes', () => {
    expect(normalizaElAlias('  Chuchi  ')).toBe('Chuchi');
  });

  it('colapsa los espacios internos repetidos', () => {
    // Si no, «Chu  chi» y «Chu chi» serían dos aliases distintos aquí y el
    // mismo para el índice único del servidor
    expect(normalizaElAlias('Chu   chi')).toBe('Chu chi');
  });

  it('aguanta vacío y nulo', () => {
    expect(normalizaElAlias('')).toBe('');
    expect(normalizaElAlias(null)).toBe('');
    expect(normalizaElAlias(undefined)).toBe('');
  });
});

describe('queLePasaAlAlias', () => {
  it('acepta un alias corriente', () => {
    expect(queLePasaAlAlias('Chuchi')).toBeNull();
  });

  it('acepta dígitos, acentos y los signos permitidos', () => {
    for (const alias of ['Peña_23', 'j.garcia', 'el-cangrejo', 'Tiger 18']) {
      expect(queLePasaAlAlias(alias)).toBeNull();
    }
  });

  it('el vacío no es un error: es «no quiero alias»', () => {
    expect(queLePasaAlAlias('')).toBeNull();
    expect(queLePasaAlAlias('   ')).toBeNull();
  });

  it('rechaza un solo carácter', () => {
    // El autocompletado necesita 2 para disparar: con uno serías inencontrable
    expect(queLePasaAlAlias('C')).toBe('alias.errors.tooShort');
  });

  it('rechaza más de 20 caracteres', () => {
    expect(queLePasaAlAlias('a'.repeat(21))).toBe('alias.errors.tooLong');
    expect(queLePasaAlAlias('a'.repeat(20))).toBeNull();
  });

  it('rechaza HTML, emoji y signos fuera de la lista', () => {
    for (const alias of ['Chu<b>chi', 'Chuchi🏌', 'chu@chi', 'Chuchi & Co']) {
      expect(queLePasaAlAlias(alias)).toBe('alias.errors.invalidChars');
    }
  });

  it('rechaza los signos de multiplicar y dividir', () => {
    // Caen dentro del rango À-ÿ sin ser letras; el servidor también los salta
    expect(queLePasaAlAlias('chu×chi')).toBe('alias.errors.invalidChars');
    expect(queLePasaAlAlias('chu÷chi')).toBe('alias.errors.invalidChars');
  });

  it('rechaza un alias sin letras ni números', () => {
    expect(queLePasaAlAlias('...')).toBe('alias.errors.needsLetterOrDigit');
  });
});

describe('loQueHayQueMandar', () => {
  it('manda el alias nuevo', () => {
    expect(loQueHayQueMandar('Chuchi', null)).toBe('Chuchi');
  });

  it('manda la cadena vacía cuando se borra uno que había', () => {
    expect(loQueHayQueMandar('', 'Chuchi')).toBe('');
  });

  it('NO manda nada si nunca hubo alias y el campo sigue vacío', () => {
    // Mandar '' aquí sería pedir que borren algo que no existe, y convertiría
    // «guardar el país» en una petición que habla del alias sin motivo
    expect(loQueHayQueMandar('', null)).toBeUndefined();
    expect(loQueHayQueMandar('   ', '')).toBeUndefined();
  });

  it('NO manda nada si el alias no ha cambiado', () => {
    expect(loQueHayQueMandar('Chuchi', 'Chuchi')).toBeUndefined();
  });

  it('un cambio de solo espacios no es un cambio', () => {
    expect(loQueHayQueMandar('  Chuchi  ', 'Chuchi')).toBeUndefined();
  });

  it('cambiar solo las mayúsculas SÍ es un cambio', () => {
    // El servidor lo permite —es tu propio alias— y hay quien querrá
    // «chuchi» en vez de «Chuchi»
    expect(loQueHayQueMandar('CHUCHI', 'Chuchi')).toBe('CHUCHI');
  });
});
