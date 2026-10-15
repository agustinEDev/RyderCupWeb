import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k) => k }) }));
vi.mock('../../../utils/sentryHelpers', () => ({ captureError: vi.fn() }));

const carga = vi.hoisted(() => ({ falla: false, props: null }));
vi.mock('./MapaDelHoyo', () => ({
  default: (props) => {
    if (carga.falla) throw new Error('Failed to fetch dynamically imported module');
    carga.props = props;
    return <div data-testid="mapa-del-hoyo" />;
  },
}));

const { default: VentanaDelMapa } = await import('./VentanaDelMapa');
const { default: BotonMapa } = await import('./BotonMapa');

const GREEN = { front: {}, center: {}, back: {} };
const estado = (extra = {}) => ({
  abierto: true,
  cerrar: vi.fn(),
  mapaDelCampo: { attribution: '© OpenStreetMap contributors (ODbL)', holes: { 3: { playLine: [], green: GREEN } } },
  ...extra,
});

describe('VentanaDelMapa', () => {
  beforeEach(() => {
    carga.falla = false;
    carga.props = null;
  });

  it('cerrado, nada', () => {
    const { container } = render(<VentanaDelMapa mapaDelHoyo={estado({ abierto: false })} golfCourseId="gc-1" numeroDeHoyo={3} par={4} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('A4: abierto, carga el mapa con los datos de ESE hoyo', async () => {
    const mapaDelHoyo = estado();

    render(<VentanaDelMapa mapaDelHoyo={mapaDelHoyo} golfCourseId="gc-1" numeroDeHoyo={3} par={4} />);

    expect(await screen.findByTestId('mapa-del-hoyo')).toBeInTheDocument();
    expect(carga.props).toMatchObject({
      golfCourseId: 'gc-1',
      numeroDeHoyo: 3,
      par: 4,
      hoyo: { playLine: [], green: GREEN },
      atribucion: '© OpenStreetMap contributors (ODbL)',
      onCerrar: mapaDelHoyo.cerrar,
    });
  });

  it('sin mapa del campo, el hoyo va como sin mapa', async () => {
    render(<VentanaDelMapa mapaDelHoyo={estado({ mapaDelCampo: null })} golfCourseId="gc-1" numeroDeHoyo={3} par={4} />);

    await screen.findByTestId('mapa-del-hoyo');
    expect(carga.props).toMatchObject({ hoyo: null, atribucion: null });
  });

  it('A5: si el mapa no puede cargar, un aviso y «Cerrar» sigue cerrando', async () => {
    carga.falla = true;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const mapaDelHoyo = estado();

    render(<VentanaDelMapa mapaDelHoyo={mapaDelHoyo} golfCourseId="gc-1" numeroDeHoyo={3} par={4} />);

    expect(await screen.findByText('mapa.noCarga')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'mapa.cerrar' }));
    expect(mapaDelHoyo.cerrar).toHaveBeenCalled();
    globalThis.console.error.mockRestore();
  });
});

describe('BotonMapa', () => {
  it('T2: «Mapa», de 44 px, abre el mapa', () => {
    const onAbrir = vi.fn();
    render(<BotonMapa onAbrir={onAbrir} />);

    const boton = screen.getByRole('button', { name: 'mapa.abrir' });
    fireEvent.click(boton);

    expect(onAbrir).toHaveBeenCalled();
    expect(boton).toHaveClass('min-h-11');
  });
});
