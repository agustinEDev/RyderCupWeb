import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  rutaQueAvisa,
  esperaElAviso,
  retiraLaCortina,
  laPantallaEstaLista,
  reiniciaLaCortina,
  PLAZO_MAXIMO_MS,
} from './cortinaDeArranque';

/**
 * La mecanica de la cortina (FE #485), aparte de quien la usa.
 */
describe('la cortina del arranque', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // La cortina solo se sostiene en la aplicacion instalada
    window.matchMedia = () => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} });
    reiniciaLaCortina();
    document.body.innerHTML = '<div id="arranque"></div>';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const sigueLaCortina = () => Boolean(document.getElementById('arranque'));

  it('las rutas por las que se entra a la aplicacion avisan; las demas, no', () => {
    expect(rutaQueAvisa('/start')).toBe(true);
    expect(rutaQueAvisa('/dashboard')).toBe(true);
    // La portada tambien: es por donde arrancan los iconos anteriores a FE #465
    expect(rutaQueAvisa('/')).toBe(true);

    // El formulario y cualquier enlace profundo conservan lo de siempre: la
    // capa se retira al llegar
    expect(rutaQueAvisa('/login')).toBe(false);
    expect(rutaQueAvisa('/competitions/7/leaderboard')).toBe(false);
  });

  it('mientras se espera el aviso, la cortina se queda', () => {
    esperaElAviso();

    vi.advanceTimersByTime(PLAZO_MAXIMO_MS - 1);

    expect(sigueLaCortina()).toBe(true);
  });

  it('el aviso la levanta', () => {
    esperaElAviso();

    laPantallaEstaLista();

    expect(sigueLaCortina()).toBe(false);
  });

  it('se levanta sola pasado el plazo aunque nadie avise', () => {
    // Sin esto, un telefono sin cobertura se queda mirando un verde eterno:
    // peor defecto que el que esto vino a arreglar
    esperaElAviso();

    vi.advanceTimersByTime(PLAZO_MAXIMO_MS);

    expect(sigueLaCortina()).toBe(false);
  });

  it('el plazo NO se reinicia en cada tramo del arranque', () => {
    // `/start` y el panel son el mismo arranque. Rearmando el plazo en cada
    // cambio de ruta, el techo de 3s pasaria a ser 3s por pantalla
    esperaElAviso();
    vi.advanceTimersByTime(PLAZO_MAXIMO_MS - 100);

    esperaElAviso();
    vi.advanceTimersByTime(100);

    expect(sigueLaCortina()).toBe(false);
  });

  it('una vez levantada, no vuelve a esperar a nadie', () => {
    // Al navegar a `/dashboard` DENTRO de la aplicacion ya no hay ninguna capa
    // que sostener, y armar un plazo dejaria un temporizador suelto
    retiraLaCortina();
    document.body.innerHTML = '<div id="arranque"></div>';

    esperaElAviso();
    vi.advanceTimersByTime(PLAZO_MAXIMO_MS);

    expect(vi.getTimerCount()).toBe(0);
  });

  it('en el navegador no se sostiene: se retira al llegar', () => {
    // Ahi esta capa es blanca con el monograma y la pagina se abre sola.
    // Sostenerla convertiria un F5 en el panel en una espera en blanco donde
    // antes se veia la aplicacion cargando
    window.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} });

    esperaElAviso();

    expect(sigueLaCortina()).toBe(false);
  });

  it('no falla si la capa no existe', () => {
    document.body.innerHTML = '';

    expect(() => retiraLaCortina()).not.toThrow();
  });
});
