import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k) => k }) }));
vi.mock('../../../utils/sentryHelpers', () => ({ captureError: vi.fn() }));

const carga = vi.hoisted(() => ({ falla: false, suspende: false, props: null, montajes: 0 }));
vi.mock('./MapaDelHoyo', async () => {
  const { useState } = await vi.importActual('react');
  const MapaFalso = (props) => {
    if (carga.suspende) throw new Promise(() => {});
    if (carga.falla) throw new Error('Failed to fetch dynamically imported module');
    useState(() => {
      carga.montajes += 1;
    });
    carga.props = props;
    return <div data-testid="mapa-del-hoyo" />;
  };
  return { default: MapaFalso };
});

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
    carga.suspende = false;
    carga.props = null;
    carga.montajes = 0;
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

describe('VentanaDelMapa — tras la revisión', () => {
  beforeEach(() => {
    carga.falla = false;
    carga.suspende = false;
    carga.montajes = 0;
  });

  const ventana = (mapaDelHoyo) => <VentanaDelMapa mapaDelHoyo={mapaDelHoyo} golfCourseId="gc-1" numeroDeHoyo={3} par={4} />;

  it('si los datos del campo llegan con el mapa abierto, el mapa se rehace con ellos', async () => {
    const { rerender } = render(ventana(estado({ mapaDelCampo: null })));
    await screen.findByTestId('mapa-del-hoyo');

    rerender(ventana(estado()));

    await screen.findByTestId('mapa-del-hoyo');
    expect(carga.montajes).toBe(2);
    expect(carga.props.hoyo).toEqual({ playLine: [], green: GREEN });
  });

  it('una versión nueva del mapa también lo rehace', async () => {
    const { rerender } = render(ventana(estado({ mapaDelCampo: { version: 'v1', holes: { 3: { playLine: [], green: GREEN } } } })));
    await screen.findByTestId('mapa-del-hoyo');

    rerender(ventana(estado({ mapaDelCampo: { version: 'v2', holes: { 3: { playLine: [], green: GREEN } } } })));

    await screen.findByTestId('mapa-del-hoyo');
    expect(carga.montajes).toBe(2);
  });

  it('sin cambios en los datos, no se rehace', async () => {
    const mapaDelHoyo = estado();
    const { rerender } = render(ventana(mapaDelHoyo));
    await screen.findByTestId('mapa-del-hoyo');

    rerender(ventana({ ...mapaDelHoyo }));

    expect(carga.montajes).toBe(1);
  });

  it('tras un fallo de carga, volver a abrirlo lo intenta de nuevo', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    carga.falla = true;
    const { rerender } = render(ventana(estado()));
    await screen.findByText('mapa.noCarga');

    rerender(ventana(estado({ abierto: false })));
    carga.falla = false;
    rerender(ventana(estado()));

    expect(await screen.findByTestId('mapa-del-hoyo')).toBeInTheDocument();
    globalThis.console.error.mockRestore();
  });

  it('mientras carga, también se puede cerrar', async () => {
    carga.suspende = true;
    const mapaDelHoyo = estado();
    render(ventana(mapaDelHoyo));

    fireEvent.click(await screen.findByRole('button', { name: 'mapa.cerrar' }));

    expect(mapaDelHoyo.cerrar).toHaveBeenCalled();
  });
});
