/**
 * LA TABLA — avisar de que no hay red.
 *
 *   caso                          | qué se ve
 *   ------------------------------|---------------------------------------
 *   el navegador dice que no hay  | el aviso, en toda la aplicación
 *   dice que sí                    | nada: no estorba a quien tiene red
 *   se cae la red con la app abierta | aparece sin recargar
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import AvisoSinConexion from './AvisoSinConexion';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k }),
}));

const fingeConexion = (hay) =>
  Object.defineProperty(globalThis.navigator, 'onLine', { value: hay, configurable: true });

describe('AvisoSinConexion', () => {
  beforeEach(() => fingeConexion(true));
  afterEach(() => fingeConexion(true));

  it('con red no se ve nada', () => {
    render(<AvisoSinConexion />);

    expect(screen.queryByTestId('aviso-sin-conexion')).not.toBeInTheDocument();
  });

  it('sin red lo dice', () => {
    // Sin esto, quedarse sin cobertura solo se notaba por lo que NO pasaba, y
    // el jugador no sabía si le fallaba el móvil o la aplicación
    fingeConexion(false);

    render(<AvisoSinConexion />);

    expect(screen.getByTestId('aviso-sin-conexion')).toBeInTheDocument();
  });

  it('y aparece al caerse la red, sin recargar', () => {
    render(<AvisoSinConexion />);
    expect(screen.queryByTestId('aviso-sin-conexion')).not.toBeInTheDocument();

    fingeConexion(false);
    act(() => { globalThis.dispatchEvent(new globalThis.Event('offline')); });

    expect(screen.getByTestId('aviso-sin-conexion')).toBeInTheDocument();
  });

  it('y se va al volver', () => {
    fingeConexion(false);
    render(<AvisoSinConexion />);
    expect(screen.getByTestId('aviso-sin-conexion')).toBeInTheDocument();

    fingeConexion(true);
    act(() => { globalThis.dispatchEvent(new globalThis.Event('online')); });

    expect(screen.queryByTestId('aviso-sin-conexion')).not.toBeInTheDocument();
  });
});
