import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LineaDeDistancias from './LineaDeDistancias';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k, o) => (o ? `${k} ${JSON.stringify(o)}` : k) }),
}));

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

describe('LineaDeDistancias — lector de pantalla, licencia y ocultar', () => {
  it('el lector de pantalla lee la frase entera, no las letras sueltas', () => {
    render(<LineaDeDistancias green={GREEN} activadas gps={LISTO} onActivar={() => {}} />);

    expect(screen.getByText('distancias.etiqueta {"front":111,"center":133,"back":156}')).toHaveClass('sr-only');
    expect(screen.getByTestId('distancia-centro').closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('con atribución, «© OSM» junto a las distancias', () => {
    render(
      <LineaDeDistancias green={GREEN} activadas gps={LISTO} atribucion="© OpenStreetMap contributors (ODbL)" onActivar={() => {}} />
    );

    expect(screen.getByText('© OSM')).toHaveAttribute('title', '© OpenStreetMap contributors (ODbL)');
  });

  it('sin atribución, nada', () => {
    render(<LineaDeDistancias green={GREEN} activadas gps={LISTO} atribucion={null} onActivar={() => {}} />);

    expect(screen.queryByText('© OSM')).toBeNull();
  });

  it('G4: con la ubicación no permitida, «Ocultar» quita el aviso', () => {
    const onOcultar = vi.fn();
    render(
      <LineaDeDistancias green={GREEN} activadas gps={{ estado: 'denegado', posicion: null }} onActivar={() => {}} onOcultar={onOcultar} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'distancias.ocultar' }));

    expect(onOcultar).toHaveBeenCalled();
  });

  it('«Ocultar» solo con la ubicación no permitida', () => {
    render(
      <LineaDeDistancias green={GREEN} activadas gps={{ estado: 'buscando', posicion: null }} onActivar={() => {}} onOcultar={() => {}} />
    );

    expect(screen.queryByRole('button', { name: 'distancias.ocultar' })).toBeNull();
  });

  it('el botón «Activar distancias» mide 44 px de alto (el dedo)', () => {
    render(<LineaDeDistancias green={GREEN} activadas={false} gps={{ estado: 'inactivo', posicion: null }} onActivar={() => {}} />);

    expect(screen.getByRole('button', { name: 'distancias.activar' })).toHaveClass('min-h-11');
  });
});
