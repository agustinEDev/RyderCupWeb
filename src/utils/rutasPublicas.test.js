import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { esRutaPublica, sinSesionEnRutaPublica } from './rutasPublicas';

/**
 * En una ruta publica, un `401` de la consulta de sesion es lo ESPERABLE: no hay
 * sesion y no pasa nada. Si la ruta no figura como publica, ese 401 dispara el
 * refresco, el refresco falla y se echa al usuario a `/login` diciendo que su
 * sesion expiro — en una pagina donde nunca la tuvo.
 *
 * La lista estaba duplicada a mano en el interceptor y ya iba dos entradas por
 * detras. Aqui se comprueba que sigue siendo una sola.
 */
describe('rutas publicas', () => {
  it('el arranque de la aplicacion instalada es publico', () => {
    // El caso de FE #465: se abre desde el icono normalmente SIN sesion
    expect(esRutaPublica('/start')).toBe(true);
  });

  it('la vuelta de Google tambien', () => {
    expect(esRutaPublica('/auth/google/callback')).toBe(true);
  });

  it('el enlace de restablecer, que lleva un token detras', () => {
    expect(esRutaPublica('/reset-password/abc123')).toBe(true);
  });

  it('una clasificacion compartida', () => {
    expect(esRutaPublica('/competitions/1/leaderboard')).toBe(true);
  });

  it('el panel NO es publico', () => {
    expect(esRutaPublica('/dashboard')).toBe(false);
  });

  it('ni App.jsx ni el interceptor mantienen su propia copia', () => {
    // El interceptor tenia la suya, escrita a mano, y se quedo dos entradas
    // atras. App.jsx tenia otra. Ahora las dos salen de aqui.
    const interceptor = readFileSync(
      resolve(process.cwd(), 'src/utils/tokenRefreshInterceptor.js'),
      'utf8'
    );
    const app = readFileSync(resolve(process.cwd(), 'src/App.jsx'), 'utf8');

    expect(interceptor).not.toMatch(/\['\/login', '\/register'/);
    expect(interceptor).toMatch(/rutasPublicas/);

    expect(app).not.toMatch(/const PUBLIC_ROUTES\s*=/);
    expect(app).toMatch(/rutasPublicas/);
  });

  it('un usuario CON sesion si refresca, aunque la ruta sea publica', () => {
    // La clasificacion compartida es publica, pero quien la abre CON sesion y el
    // access caducado tiene que refrescar: si no, la pantalla se pinta como si
    // estuviera desconectado
    expect(sinSesionEnRutaPublica('/competitions/1/leaderboard', true)).toBe(false);
    expect(sinSesionEnRutaPublica('/competitions/1/leaderboard', false)).toBe(true);
  });

  it('el arranque de la app se salta el refresco aunque quede un usuario rancio', () => {
    // Monta el mismo formulario que `/login`, y es DONDE se aterriza con un
    // `user` viejo: sin esto, un 401 esperable echaria a `/login` con «tu sesion
    // expiro», borrando lo que se estuviera escribiendo
    expect(sinSesionEnRutaPublica('/start', true)).toBe(true);
    expect(sinSesionEnRutaPublica('/login', true)).toBe(true);
    expect(sinSesionEnRutaPublica('/', true)).toBe(true);
  });

  it('los patrones van anclados, no por subcadena', () => {
    expect(esRutaPublica('/competitions/1/leaderboard')).toBe(true);
    expect(esRutaPublica('/admin/leaderboard')).toBe(false);
    expect(esRutaPublica('/competitions/1/leaderboard/print')).toBe(false);
  });
});
