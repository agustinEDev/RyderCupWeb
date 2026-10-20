import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { RUTAS_DE_LA_APLICACION, esRutaDesconocida } from './rutasDeLaAplicacion';
import { sinSesionEnRutaPublica } from './rutasPublicas';

/**
 * Una dirección que no lleva a ninguna pantalla (FE #544).
 *
 *   caso | ruta                                   | desconocida
 *   -----|----------------------------------------|------------
 *   R1   | /esto-no-existe, /dashboard/x, /admin/a/b | sí
 *   R2   | las de App.jsx, con parámetros y barra final | no
 *   R3   | la lista y las <Route> de App.jsx son las mismas
 *   R4   | sin usuario guardado no se refresca: 401 esperable, sin «sesión expirada»
 *   R5   | con usuario guardado sí se refresca, como en la clasificación compartida
 */
describe('rutas de la aplicación', () => {
  it.each(['/esto-no-existe', '/dashboard/x', '/admin/a/b', '/competitions/1/otra-cosa'])(
    'R1: %s no lleva a ninguna pantalla',
    (ruta) => {
      expect(esRutaDesconocida(ruta)).toBe(true);
    }
  );

  it.each([
    '/',
    '/dashboard',
    '/dashboard/',
    '/admin',
    '/admin/users',
    '/competitions/7',
    '/competitions/create',
    '/competitions/7/leaderboard',
    '/competitions/7/rounds/3/envelope',
    '/reset-password/abc',
    '/player/matches/9/scoring',
    '/unauthorized',
  ])('R2: %s es una pantalla conocida', (ruta) => {
    expect(esRutaDesconocida(ruta)).toBe(false);
  });

  it('R3: la lista es la de App.jsx, ni una más ni una menos', () => {
    // Dos copias que se separan: una ruta nueva olvidada aquí sería «no existe»
    // para el interceptor, que dejaría de refrescar en ella sin sesión guardada
    const app = readFileSync(resolve(process.cwd(), 'src/App.jsx'), 'utf8');
    const enApp = [...app.matchAll(/<Route path="([^"]+)"/g)]
      .map(([, ruta]) => ruta)
      .filter((ruta) => ruta !== '*');

    expect([...RUTAS_DE_LA_APLICACION].sort()).toEqual([...enApp].sort());
  });

  it('R4: en una dirección desconocida, sin usuario guardado, no se refresca', () => {
    expect(sinSesionEnRutaPublica('/esto-no-existe', false)).toBe(true);
  });

  it('R5: con usuario guardado sí, o se pintaría como desconectado', () => {
    expect(sinSesionEnRutaPublica('/esto-no-existe', true)).toBe(false);
  });

  it('una ruta privada conocida sigue refrescando siempre', () => {
    expect(sinSesionEnRutaPublica('/dashboard', false)).toBe(false);
  });
});
