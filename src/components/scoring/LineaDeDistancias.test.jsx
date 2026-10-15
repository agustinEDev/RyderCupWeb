import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LineaDeDistancias from './LineaDeDistancias';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k) => k }) }));

const GREEN = {
  front: { lat: 36.2898, lon: -5.332 },
  center: { lat: 36.29, lon: -5.332 },
  back: { lat: 36.2902, lon: -5.332 },
};
const LISTO = { estado: 'listo', posicion: { lat: 36.2888, lon: -5.332 } };

describe('LineaDeDistancias', () => {
  it('L1: green, GPS listo y activadas → delante, centro y fondo en metros', () => {
    render(<LineaDeDistancias green={GREEN} activadas gps={LISTO} onActivar={() => {}} />);

    expect(screen.getByTestId('distancias-del-hoyo')).toHaveTextContent('111');
    expect(screen.getByTestId('distancia-centro')).toHaveTextContent('133');
    expect(screen.getByTestId('distancias-del-hoyo')).toHaveTextContent('156');
  });

  it('L2: con green y sin activar → el botón «Activar distancias»', () => {
    const onActivar = vi.fn();
    render(
      <LineaDeDistancias green={GREEN} activadas={false} gps={{ estado: 'inactivo', posicion: null }} onActivar={onActivar} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'distancias.activar' }));

    expect(onActivar).toHaveBeenCalled();
  });

  it('L3: sin green (sin mapa, o hoyo sin marcar) → no aparece', () => {
    const { container } = render(
      <LineaDeDistancias green={null} activadas gps={LISTO} onActivar={() => {}} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('L3: sin green tampoco se ofrece activarlas', () => {
    const { container } = render(
      <LineaDeDistancias green={null} activadas={false} gps={{ estado: 'inactivo', posicion: null }} onActivar={() => {}} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('G5: buscando señal → el aviso, sin distancias', () => {
    render(<LineaDeDistancias green={GREEN} activadas gps={{ estado: 'buscando', posicion: null }} onActivar={() => {}} />);

    expect(screen.getByText('distancias.buscando')).toBeInTheDocument();
    expect(screen.queryByTestId('distancia-centro')).toBeNull();
  });

  it('G4: ubicación no permitida → el aviso', () => {
    render(<LineaDeDistancias green={GREEN} activadas gps={{ estado: 'denegado', posicion: null }} onActivar={() => {}} />);

    expect(screen.getByText('distancias.denegado')).toBeInTheDocument();
  });

  it('sin GPS en el navegador → el aviso', () => {
    render(<LineaDeDistancias green={GREEN} activadas gps={{ estado: 'no-disponible', posicion: null }} onActivar={() => {}} />);

    expect(screen.getByText('distancias.noDisponible')).toBeInTheDocument();
  });
});
