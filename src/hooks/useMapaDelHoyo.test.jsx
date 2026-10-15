import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';

vi.mock('./useMapaDelCampo', () => ({ useMapaDelCampo: (id) => (id ? { golfCourseId: id, holes: {} } : null) }));

const { useMapaDelHoyo } = await import('./useMapaDelHoyo');

const montar = (entrada = '/scoring/m-1?x=1') => {
  const wrapper = ({ children }) => <MemoryRouter initialEntries={[entrada]}>{children}</MemoryRouter>;
  return renderHook(
    () => ({ mapa: useMapaDelHoyo({ golfCourseId: 'gc-1' }), location: useLocation() }),
    { wrapper }
  );
};

describe('useMapaDelHoyo', () => {
  it('empieza cerrado, con el mapa del campo', () => {
    const { result } = montar();

    expect(result.current.mapa.abierto).toBe(false);
    expect(result.current.mapa.mapaDelCampo).toEqual({ golfCourseId: 'gc-1', holes: {} });
  });

  it('abrir lo abre sin cambiar de pantalla (misma ruta y filtros)', () => {
    const { result } = montar();

    act(() => result.current.mapa.abrir());

    expect(result.current.mapa.abierto).toBe(true);
    expect(result.current.location.pathname).toBe('/scoring/m-1');
    expect(result.current.location.search).toBe('?x=1');
  });

  it('A3: el botón atrás del móvil lo cierra', () => {
    const { result } = montar();
    act(() => result.current.mapa.abrir());

    act(() => result.current.mapa.cerrar());

    expect(result.current.mapa.abierto).toBe(false);
    expect(result.current.location.pathname).toBe('/scoring/m-1');
  });

  it('entrando ya con #mapa (recargar), se quita: se vuelve a la tarjeta, sin entrada de más', () => {
    const { result } = montar('/scoring/m-1#mapa');

    expect(result.current.mapa.abierto).toBe(false);
    expect(result.current.location.hash).toBe('');
    expect(result.current.location.pathname).toBe('/scoring/m-1');
  });

  it('recargando con #mapa, el mapa no llega a abrirse ni un instante', () => {
    const vistos = [];
    const wrapper = ({ children }) => <MemoryRouter initialEntries={['/scoring/m-1#mapa']}>{children}</MemoryRouter>;
    renderHook(
      () => {
        const mapa = useMapaDelHoyo({ golfCourseId: 'gc-1' });
        vistos.push(mapa.abierto);
        return mapa;
      },
      { wrapper }
    );

    expect(vistos).not.toContain(true);
  });

  it('dos toques en «Mapa» lo abren una sola vez: un «Cerrar» basta', () => {
    const { result } = montar();

    act(() => {
      result.current.mapa.abrir();
      result.current.mapa.abrir();
    });
    act(() => result.current.mapa.cerrar());

    expect(result.current.mapa.abierto).toBe(false);
  });

  it('dos toques en «Cerrar» no sacan de la anotación', () => {
    const wrapper = ({ children }) => <MemoryRouter initialEntries={['/inicio', '/scoring/m-1']} initialIndex={1}>{children}</MemoryRouter>;
    const { result } = renderHook(() => ({ mapa: useMapaDelHoyo({ golfCourseId: 'gc-1' }), location: useLocation() }), { wrapper });
    act(() => result.current.mapa.abrir());

    act(() => {
      result.current.mapa.cerrar();
      result.current.mapa.cerrar();
    });

    expect(result.current.location.pathname).toBe('/scoring/m-1');
    expect(result.current.mapa.abierto).toBe(false);
  });
});

describe('useMapaDelHoyo — recargar y sesión tomada', () => {
  it('recargando, el navegador repone el estado del historial: aun así no se abre solo', () => {
    const wrapper = ({ children }) => (
      <MemoryRouter initialEntries={[{ pathname: '/scoring/m-1', hash: '#mapa', state: { mapaAbiertoAqui: 'de-otra-carga' } }]}>
        {children}
      </MemoryRouter>
    );
    const { result } = renderHook(() => ({ mapa: useMapaDelHoyo({ golfCourseId: 'gc-1' }), location: useLocation() }), { wrapper });

    expect(result.current.mapa.abierto).toBe(false);
    expect(result.current.location.hash).toBe('');
  });

  it('si otro móvil toma la sesión, el mapa se cierra (su «Volver» saldría solo del mapa)', () => {
    const wrapper = ({ children }) => <MemoryRouter initialEntries={['/inicio', '/scoring/m-1']} initialIndex={1}>{children}</MemoryRouter>;
    const { result, rerender } = renderHook(
      ({ bloqueada }) => ({ mapa: useMapaDelHoyo({ golfCourseId: 'gc-1', cerrarSi: bloqueada }), location: useLocation() }),
      { wrapper, initialProps: { bloqueada: false } }
    );
    act(() => result.current.mapa.abrir());

    rerender({ bloqueada: true });

    expect(result.current.mapa.abierto).toBe(false);
    expect(result.current.location.pathname).toBe('/scoring/m-1');
  });
});
