import { describe, it, expect } from 'vitest';
import {
  salidaQueSePinta,
  sePuedeReportarElHoyo,
  vistaAlGreen,
} from './reglasDelMapa';

const salidaDelHoyo = { lat: 40.401, lon: -3.7 };
const greenDelHoyo = { lat: 40.404, lon: -3.702 };
const hoyo = { playLine: [salidaDelHoyo, greenDelHoyo] };
const recienTocada = { lat: 40.402, lon: -3.701 };
const propuesta = { lat: 40.403, lon: -3.703 };

describe('salidaQueSePinta', () => {
  const base = {
    reporte: null,
    pidiendo: true,
    marca: { tee: null },
    marcandoSalida: false,
    hoyo,
  };

  it('reportando el green, la salida que se propone', () => {
    expect(
      salidaQueSePinta({
        ...base,
        pidiendo: false,
        reporte: { fase: 'green', tee: propuesta },
      }),
    ).toBe(propuesta);
  });

  it('reportando el green, la propuesta antes que la recién tocada', () => {
    expect(
      salidaQueSePinta({
        ...base,
        marca: { tee: recienTocada },
        reporte: { fase: 'green', tee: propuesta },
      }),
    ).toBe(propuesta);
  });

  it('reportando en otra fase y sin pedir nada, ninguna', () => {
    expect(
      salidaQueSePinta({
        ...base,
        pidiendo: false,
        reporte: { fase: 'salida', tee: propuesta },
      }),
    ).toBeNull();
  });

  it('reportando en otra fase y pidiendo, la de la marca como sin reporte', () => {
    expect(
      salidaQueSePinta({
        ...base,
        reporte: { fase: 'motivos', tee: propuesta },
      }),
    ).toBe(salidaDelHoyo);
  });

  it('sin pedir nada, ninguna', () => {
    expect(
      salidaQueSePinta({
        ...base,
        pidiendo: false,
        marca: { tee: recienTocada },
      }),
    ).toBeNull();
  });

  it('pidiendo, la recién tocada', () => {
    expect(salidaQueSePinta({ ...base, marca: { tee: recienTocada } })).toBe(
      recienTocada,
    );
  });

  it('pidiendo y marcando la salida, la recién tocada', () => {
    expect(
      salidaQueSePinta({
        ...base,
        marcandoSalida: true,
        marca: { tee: recienTocada },
      }),
    ).toBe(recienTocada);
  });

  it('marcando la salida y sin tocarla aún, ninguna (no la del hoyo)', () => {
    expect(salidaQueSePinta({ ...base, marcandoSalida: true })).toBeNull();
  });

  it('pidiendo solo el green, la aprobada del hoyo', () => {
    expect(salidaQueSePinta(base)).toBe(salidaDelHoyo);
  });

  it('pidiendo solo el green sin hoyo, ninguna', () => {
    expect(salidaQueSePinta({ ...base, hoyo: null })).toBeNull();
  });

  it('pidiendo solo el green con un hoyo sin línea, ninguna', () => {
    expect(salidaQueSePinta({ ...base, hoyo: {} })).toBeNull();
    expect(salidaQueSePinta({ ...base, hoyo: { playLine: [] } })).toBeNull();
  });
});

describe('sePuedeReportarElHoyo', () => {
  const base = {
    onReporte: () => {},
    sinMapa: false,
    hoyo,
    reporte: null,
    pidiendo: false,
  };

  it('con mapa, un hoyo con línea y sin marcar nada, sí', () => {
    expect(sePuedeReportarElHoyo(base)).toBe(true);
  });

  it('sin a quién reportar, no', () => {
    expect(sePuedeReportarElHoyo({ ...base, onReporte: undefined })).toBe(
      false,
    );
  });

  it('sin mapa, no', () => {
    expect(sePuedeReportarElHoyo({ ...base, sinMapa: true })).toBe(false);
  });

  it('sin hoyo, no', () => {
    expect(sePuedeReportarElHoyo({ ...base, hoyo: null })).toBe(false);
  });

  it('con un hoyo sin línea o de un solo punto, no', () => {
    expect(sePuedeReportarElHoyo({ ...base, hoyo: {} })).toBe(false);
    expect(
      sePuedeReportarElHoyo({ ...base, hoyo: { playLine: [salidaDelHoyo] } }),
    ).toBe(false);
  });

  it('con un reporte en curso, no', () => {
    expect(
      sePuedeReportarElHoyo({ ...base, reporte: { fase: 'motivos' } }),
    ).toBe(false);
  });

  it('pidiendo una marca, no', () => {
    expect(sePuedeReportarElHoyo({ ...base, pidiendo: true })).toBe(false);
  });
});

describe('vistaAlGreen', () => {
  const encuadre = {
    hoyo: { playLine: [recienTocada], green: { center: greenDelHoyo } },
    rumbo: 33,
  };

  it('la vista del zoom al green lleva su encuadre', () => {
    expect(vistaAlGreen(encuadre, false)).toEqual({
      tipo: 'alGreen',
      hoyo: encuadre.hoyo,
      rumbo: 33,
    });
  });

  it('tras una marca la pidió el jugador: se aplica aunque moviera el mapa', () => {
    expect(vistaAlGreen(encuadre, true)).toEqual({
      tipo: 'alGreen',
      hoyo: encuadre.hoyo,
      rumbo: 33,
      porElJugador: true,
    });
  });
});
