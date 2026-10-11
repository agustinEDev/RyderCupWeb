/**
 * LA TABLA — avisar de que no hay red.
 *
 *   caso                          | qué se ve
 *   ------------------------------|---------------------------------------
 *   el navegador dice que no hay  | el aviso, en toda la aplicación
 *   dice que sí                    | nada: no estorba a quien tiene red
 *   se cae la red con la app abierta | aparece sin recargar
 *   en una pantalla de anotar      | el mismo aviso, con lo de anotar y las
 *                                  | pendientes: uno solo (QA 2, 12 oct 2026)
 *   anotar sin red aunque el navegador diga que sí | también se ve
 *   se sale de la pantalla de anotar | vuelve a ser el aviso general
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import AvisoSinConexion from './AvisoSinConexion';
import AnotarSinConexion from '../scoring/AnotarSinConexion';

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

  it('en una pantalla de anotar, uno solo con lo de anotar y las pendientes', () => {
    fingeConexion(false);

    render(<><AvisoSinConexion /><AnotarSinConexion pendingCount={2} /></>);

    const avisos = screen.getAllByTestId('aviso-sin-conexion');
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toHaveTextContent('sinConexion.anotando');
    expect(avisos[0]).toHaveTextContent('sinConexion.pendientes');
  });

  it('sin pendientes no las cuenta', () => {
    fingeConexion(false);

    render(<><AvisoSinConexion /><AnotarSinConexion pendingCount={0} /></>);

    expect(screen.getByTestId('aviso-sin-conexion')).toHaveTextContent('sinConexion.anotando');
    expect(screen.getByTestId('aviso-sin-conexion')).not.toHaveTextContent('sinConexion.pendientes');
  });

  it('anotar sin red se ve aunque el navegador diga que hay', () => {
    render(<><AvisoSinConexion /><AnotarSinConexion pendingCount={1} /></>);

    expect(screen.getByTestId('aviso-sin-conexion')).toHaveTextContent('sinConexion.anotando');
  });

  it('revisor: con dos pantallas de anotar, al irse una sigue la otra', () => {
    fingeConexion(false);
    const { rerender } = render(<><AvisoSinConexion /><AnotarSinConexion key="a" pendingCount={1} /><AnotarSinConexion key="b" pendingCount={3} /></>);

    rerender(<><AvisoSinConexion /><AnotarSinConexion key="b" pendingCount={3} /></>);

    expect(screen.getByTestId('aviso-sin-conexion')).toHaveTextContent('sinConexion.anotando');
  });

  it('revisor: el contador va fuera de la región que se lee al cambiar', () => {
    fingeConexion(false);
    render(<><AvisoSinConexion /><AnotarSinConexion pendingCount={2} /></>);

    expect(screen.getByRole('status')).toHaveTextContent('sinConexion.anotando');
    expect(screen.getByRole('status')).not.toHaveTextContent('sinConexion.pendientes');
    expect(screen.getByTestId('aviso-sin-conexion')).toHaveTextContent('sinConexion.pendientes');
  });

  it('al salir de anotar vuelve a ser el aviso general', () => {
    fingeConexion(false);
    const { rerender } = render(<><AvisoSinConexion /><AnotarSinConexion pendingCount={1} /></>);

    rerender(<><AvisoSinConexion /></>);

    expect(screen.getByTestId('aviso-sin-conexion')).toHaveTextContent('sinConexion.aviso');
    expect(screen.getByTestId('aviso-sin-conexion')).not.toHaveTextContent('sinConexion.anotando');
  });
});
