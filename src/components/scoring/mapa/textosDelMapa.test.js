import { describe, it, expect } from 'vitest';
import { distanciaEnMetros } from '../../../domain/services/distanciasAlGreen';
import {
  avisoDelGps,
  loQueSeAnuncia,
  textosDelRecuadro,
} from './textosDelMapa';

const t = (k) => `t:${k}`;
const yo = { lat: 40.4, lon: -3.7 };
const salida = { lat: 40.401, lon: -3.7 };
const punto = { lat: 40.402, lon: -3.701 };
const green = { center: { lat: 40.404, lon: -3.702 } };

describe('textosDelRecuadro', () => {
  const desdeAqui = { front: 100, center: 110, back: 120 };
  const deLaTarjeta = { front: 300, center: 310, back: 320 };

  it('con tu posición, sus cifras y «desde tu posición»', () => {
    expect(
      textosDelRecuadro({ t, desdeAqui, deLaTarjeta, metros: 340 }),
    ).toEqual({ distancias: desdeAqui, origen: 't:mapa.desdeTuPosicion' });
  });

  it('sin tu posición y con metros, la tarjeta «desde tu barra»', () => {
    expect(
      textosDelRecuadro({ t, desdeAqui: null, deLaTarjeta, metros: 340 }),
    ).toEqual({ distancias: deLaTarjeta, origen: 't:mapa.desdeTuBarra' });
  });

  it('sin tu posición ni metros, la línea «desde la salida»', () => {
    expect(
      textosDelRecuadro({ t, desdeAqui: null, deLaTarjeta, metros: null }),
    ).toEqual({ distancias: deLaTarjeta, origen: 't:mapa.desdeLaSalida' });
  });
});

describe('loQueSeAnuncia', () => {
  const base = {
    medido: null,
    tocado: null,
    origenDeLaMedida: null,
    posicionEnElCampo: null,
    green: null,
  };

  it('sin punto tocado ni codo, nada', () => {
    expect(loQueSeAnuncia({ ...base, green, posicionEnElCampo: yo })).toEqual({
      hastaAhi: null,
      deAhiAlGreen: null,
    });
  });

  it('el codo: de ti a él y de él al green', () => {
    expect(
      loQueSeAnuncia({ ...base, tocado: punto, posicionEnElCampo: yo, green }),
    ).toEqual({
      hastaAhi: distanciaEnMetros(yo, punto),
      deAhiAlGreen: distanciaEnMetros(punto, green.center),
    });
  });

  it('el codo fuera del campo: solo de él al green', () => {
    expect(loQueSeAnuncia({ ...base, tocado: punto, green })).toEqual({
      hastaAhi: null,
      deAhiAlGreen: distanciaEnMetros(punto, green.center),
    });
  });

  it('el punto medido desde un origen: hasta él, sin el tramo al green', () => {
    expect(
      loQueSeAnuncia({
        ...base,
        medido: punto,
        tocado: yo,
        origenDeLaMedida: salida,
        posicionEnElCampo: yo,
        green,
      }),
    ).toEqual({
      hastaAhi: distanciaEnMetros(salida, punto),
      deAhiAlGreen: null,
    });
  });

  it('el punto medido sin origen: solo de él al green', () => {
    expect(
      loQueSeAnuncia({ ...base, medido: punto, posicionEnElCampo: yo, green }),
    ).toEqual({
      hastaAhi: null,
      deAhiAlGreen: distanciaEnMetros(punto, green.center),
    });
  });

  it('sin green no hay tramo al green', () => {
    expect(
      loQueSeAnuncia({ ...base, tocado: punto, posicionEnElCampo: yo }),
    ).toEqual({ hastaAhi: distanciaEnMetros(yo, punto), deAhiAlGreen: null });
  });
});

describe('avisoDelGps', () => {
  it.each([
    ['buscando', 't:mapa.buscando'],
    ['denegado', 't:mapa.denegado'],
    ['no-disponible', 't:mapa.noDisponible'],
  ])('%s → su aviso', (estado, aviso) => {
    expect(avisoDelGps(estado, t)).toBe(aviso);
  });

  it('con el GPS listo, ninguno', () => {
    expect(avisoDelGps('listo', t)).toBeUndefined();
  });
});
