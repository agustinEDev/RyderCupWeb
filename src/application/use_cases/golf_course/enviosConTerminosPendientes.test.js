import { describe, it, expect, vi } from 'vitest';
import { enviarMuestraDeHoyo } from './enviarMuestraDeHoyo';
import { enviarReporteDeHoyo } from './enviarReporteDeHoyo';

/**
 * Revisión (punto 2): con el 403 de Términos, la muestra o el reporte se
 * quedan en la cola para después, y lo que iba de camino se libera (antes la
 * llamada se quedaba colgada y `enVuelo` no se soltaba nunca).
 */
const terminos = () => Object.assign(new Error('Terms not accepted'), { status: 403, errorCode: 'TERMS_NOT_ACCEPTED' });
const entrada = { id: 'm-1', enCola: '2026-10-20T10:00:00Z', golfCourseId: 'gc-1', holeNumber: 3, barra: 'Y', reason: 'X', tee: null, bends: [], greenCenter: null };

describe('envíos de la cola con los Términos pendientes', () => {
  it('una muestra se guarda para después y suelta su envío', async () => {
    const enVuelo = new Set();
    const quitarDeLaCola = vi.fn();
    const resultado = await enviarMuestraDeHoyo(
      {
        golfCourseRepository: { sendHoleSample: vi.fn().mockRejectedValue(terminos()) },
        holeSampleStore: { cola: () => [entrada], quitarDeLaCola, apuntarMia: vi.fn() },
        reportarFallo: vi.fn(),
        enVuelo,
        recienEnviadas: { apuntar: vi.fn() },
      },
      'u-1',
      entrada
    );

    expect(resultado).toMatchObject({ estado: 'pendiente', paraLaTanda: true });
    expect(quitarDeLaCola).not.toHaveBeenCalled();
    expect(enVuelo.size).toBe(0);
  });

  it('un reporte se guarda para después y suelta su envío', async () => {
    const enVuelo = new Set();
    const quitarDeLaCola = vi.fn();
    const resultado = await enviarReporteDeHoyo(
      {
        golfCourseRepository: { sendHoleReport: vi.fn().mockRejectedValue(terminos()) },
        holeReportStore: { cola: () => [entrada], quitarDeLaCola },
        reportarFallo: vi.fn(),
        enVuelo,
      },
      'u-1',
      entrada
    );

    expect(resultado).toMatchObject({ estado: 'pendiente', paraLaTanda: true });
    expect(quitarDeLaCola).not.toHaveBeenCalled();
    expect(enVuelo.size).toBe(0);
  });
});
