import { describe, it, expect, vi, afterEach } from 'vitest';

import {
  MAX_DIAS_DE_APERTURA,
  MIN_DIAS_DE_APERTURA,
  diasHastaElTorneo,
  fechaDeApertura,
} from './aperturaDeInscripciones';

/**
 * LA TABLA de la FE #666: las cuentas que la app hace sola.
 *
 * El backend guarda los días y deriva el instante (RyderCupAM#332), así que la
 * fecha de apertura se calcula aquí sin pedir nada: es `start_date − N`.
 *
 *   #   caso                                  | qué pasa
 *   ----|---------------------------------------|----------------------------
 *   1   el rango                               | de 1 a 14
 *   2   torneo dentro de 30 días               | faltan 30
 *   3   torneo hoy                             | faltan 0
 *   4   torneo pasado                          | negativo
 *   5   sin fecha / fecha inválida             | null, no NaN
 *   6   apertura 5 días antes del 10 de junio  | el 5 de junio
 *   7   cruzando el cambio de mes              | resta bien
 *   8   sin días                               | null
 */
describe('aperturaDeInscripciones', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('1: el rango es de 1 a 14 días', () => {
    expect(MIN_DIAS_DE_APERTURA).toBe(1);
    expect(MAX_DIAS_DE_APERTURA).toBe(14);
  });

  it('2: cuenta los días que faltan para el torneo', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-11T10:30:00'));

    expect(diasHastaElTorneo('2026-06-10')).toBe(30);
  });

  it('3: un torneo que empieza hoy no tiene días por delante', () => {
    vi.useFakeTimers();
    // Por la tarde: la hora no puede cambiar la cuenta, o el aviso aparecería
    // o desaparecería según el momento del día en que se mira
    vi.setSystemTime(new Date('2026-06-10T21:00:00'));

    expect(diasHastaElTorneo('2026-06-10')).toBe(0);
  });

  it('4: un torneo ya empezado da negativo', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-12T09:00:00'));

    expect(diasHastaElTorneo('2026-06-10')).toBe(-2);
  });

  it('5: sin fecha, o con una que no vale, devuelve null y no NaN', () => {
    expect(diasHastaElTorneo('')).toBeNull();
    expect(diasHastaElTorneo(null)).toBeNull();
    expect(diasHastaElTorneo('no es una fecha')).toBeNull();
  });

  it('6: la apertura cae los días pedidos antes del comienzo', () => {
    const abre = fechaDeApertura('2026-06-10', 5);

    expect(abre.getFullYear()).toBe(2026);
    expect(abre.getMonth()).toBe(5);
    expect(abre.getDate()).toBe(5);
  });

  it('7: restar cruza el cambio de mes', () => {
    const abre = fechaDeApertura('2026-06-10', 14);

    expect(abre.getMonth()).toBe(4);
    expect(abre.getDate()).toBe(27);
  });

  it('8: sin días programados no hay fecha de apertura', () => {
    expect(fechaDeApertura('2026-06-10', null)).toBeNull();
    expect(fechaDeApertura('', 5)).toBeNull();
  });
});
