import { describe, it, expect } from 'vitest';
import { aIsoConHuso, aEntradaDelCampo, horaEnElCampo, esZonaValida } from './horaDelCampo';

/**
 * D4 (FE #824, PR 5): la actualización se programa en la HORA DEL CAMPO
 * (Agustín, 11 oct 2026), y el backend la quiere con su huso (sin él, 422).
 */
describe('horaDelCampo (FE #824)', () => {
  it.each([
    // Madrid en invierno (+01:00) y en verano (+02:00)
    ['2030-01-12T03:00', 'Europe/Madrid', '2030-01-12T02:00:00.000Z'],
    ['2030-07-12T03:00', 'Europe/Madrid', '2030-07-12T01:00:00.000Z'],
    // El día del cambio de hora de otoño en Madrid (27 oct 2030): a las 12:00 ya es +01:00
    ['2030-10-27T12:00', 'Europe/Madrid', '2030-10-27T11:00:00.000Z'],
    // Justo antes del cambio (a las 3:00 vuelven a ser las 2:00): la 1:30 aún es +02:00,
    // aunque leída como UTC ya caería después del cambio
    ['2030-10-27T01:30', 'Europe/Madrid', '2030-10-26T23:30:00.000Z'],
    ['2030-10-12T03:00', 'America/New_York', '2030-10-12T07:00:00.000Z'],
    ['2030-10-12T03:00', 'UTC', '2030-10-12T03:00:00.000Z'],
  ])('%s en %s es %s', (local, zona, utc) => {
    expect(new Date(aIsoConHuso(local, zona)).toISOString()).toBe(utc);
  });

  it.each([
    // Hueco de primavera: esa hora no existe en el campo
    ['2030-03-31T02:30', 'Europe/Madrid'],
    ['2030-03-10T02:30', 'America/New_York'],
  ])('%s en %s no existe: no es una fecha (revisor)', (local, zona) => {
    expect(aIsoConHuso(local, zona)).toBeNull();
  });

  it.each([
    // Hora repetida de otoño: siempre la primera vez que pasa
    ['2030-10-27T02:30', 'Europe/Madrid', '2030-10-27T02:30:00+02:00'],
    ['2030-11-03T01:30', 'America/New_York', '2030-11-03T01:30:00-04:00'],
  ])('%s en %s se repite: la primera (revisor)', (local, zona, iso) => {
    expect(aIsoConHuso(local, zona)).toBe(iso);
  });

  it('una zona válida se reconoce y una inventada no (para no llamarla «del campo»)', () => {
    expect(esZonaValida('Europe/Madrid')).toBe(true);
    expect(esZonaValida('Marte/Olympus')).toBe(false);
    expect(esZonaValida(null)).toBe(false);
  });

  it('el ISO lleva el desfase del campo, no Z', () => {
    expect(aIsoConHuso('2030-07-12T03:00', 'Europe/Madrid')).toBe('2030-07-12T03:00:00+02:00');
  });

  it('sin zona del campo, la del dispositivo (con su desfase)', () => {
    expect(aIsoConHuso('2030-07-12T03:00', null)).toMatch(/^2030-07-12T03:00:00[+-]\d{2}:\d{2}$/);
  });

  it('una entrada vacía o mal escrita no es una fecha', () => {
    expect(aIsoConHuso('', 'Europe/Madrid')).toBeNull();
    expect(aIsoConHuso('mañana', 'Europe/Madrid')).toBeNull();
  });

  it('un instante se escribe en la hora del campo para el campo del formulario', () => {
    expect(aEntradaDelCampo('2030-07-12T01:00:00Z', 'Europe/Madrid')).toBe('2030-07-12T03:00');
  });

  it('también con un campo en otra zona que el dispositivo (el Mac de las pruebas está en Madrid)', () => {
    expect(aEntradaDelCampo('2030-07-12T01:00:00Z', 'America/New_York')).toBe('2030-07-11T21:00');
  });

  it('sin zona del campo, en la hora del dispositivo', () => {
    const d = new Date('2030-07-12T01:00:00Z');
    const dos = (n) => String(n).padStart(2, '0');
    const local = `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}T${dos(d.getHours())}:${dos(d.getMinutes())}`;

    expect(aEntradaDelCampo('2030-07-12T01:00:00Z', null)).toBe(local);
  });

  it('y se dice en la hora del campo', () => {
    expect(horaEnElCampo('2030-07-12T01:00:00Z', 'Europe/Madrid', 'es')).toMatch(/3:00/);
  });

  it('una zona que Intl no conoce no rompe: se usa la del dispositivo', () => {
    expect(() => horaEnElCampo('2030-07-12T01:00:00Z', 'Marte/Olympus', 'es')).not.toThrow();
    expect(aIsoConHuso('2030-07-12T03:00', 'Marte/Olympus')).toMatch(/^2030-07-12T03:00:00/);
  });
});
