import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k) => k }) }));
vi.mock('../../../utils/sentryHelpers', () => ({ captureError: vi.fn() }));
const toastFalso = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toastFalso }));

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

const misMarcas = vi.hoisted(() => ({ marcas: {}, guardar: vi.fn(async () => ({ estado: 'guardada' })), args: null }));
vi.mock('../../../hooks/useMarcasDelCampo', () => ({
  useMarcasDelCampo: (args) => {
    misMarcas.args = args;
    return { marcas: misMarcas.marcas, guardar: misMarcas.guardar };
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


describe('VentanaDelMapa — marcar el hoyo (PR C)', () => {
  const T = { lat: 36.28, lon: -5.33 };
  const G = { lat: 36.2827, lon: -5.33 };
  const OSM = '© OpenStreetMap contributors (ODbL)';
  const conMapa = (holes) => estado({ mapaDelCampo: { version: 'v1', attribution: OSM, holes } });
  const abrirCon = (mapaDelHoyo, extra = {}) =>
    render(<VentanaDelMapa mapaDelHoyo={mapaDelHoyo} golfCourseId="gc-1" numeroDeHoyo={3} par={4} metros={142} userId="u1" {...extra} />);

  beforeEach(() => {
    carga.falla = false;
    carga.suspende = false;
    carga.props = null;
    carga.montajes = 0;
    misMarcas.marcas = {};
    misMarcas.guardar.mockClear();
    misMarcas.guardar.mockResolvedValue({ estado: 'guardada' });
  });

  it('las marcas son las del jugador en ese campo', async () => {
    abrirCon(estado({ mapaDelCampo: null }));
    await screen.findByTestId('mapa-del-hoyo');

    expect(misMarcas.args).toEqual({ golfCourseId: 'gc-1', userId: 'u1' });
  });

  it('C1: sin datos del hoyo, se piden salida y green, con los metros de la tarjeta', async () => {
    abrirCon(estado({ mapaDelCampo: null }));
    await screen.findByTestId('mapa-del-hoyo');

    expect(carga.props).toMatchObject({ hoyo: null, porMarcar: 'salida', metros: 142, onVolverAMarcar: null });
    expect(carga.props.onGuardarMarca).toEqual(expect.any(Function));
  });

  it('C1: un mapa aprobado que no trae ese hoyo, igual', async () => {
    abrirCon(conMapa({ 1: { playLine: [T, G], green: GREEN } }));
    await screen.findByTestId('mapa-del-hoyo');

    expect(carga.props).toMatchObject({ hoyo: null, porMarcar: 'salida', atribucion: null });
  });

  it('C2: con salida y sin green, se ve el hoyo y solo se pide el green', async () => {
    const conSalida = { playLine: [T, { lat: 36.2825, lon: -5.33 }], green: null };
    abrirCon(conMapa({ 3: conSalida }));
    await screen.findByTestId('mapa-del-hoyo');

    expect(carga.props).toMatchObject({ hoyo: conSalida, porMarcar: 'green', atribucion: OSM });
  });

  it('con salida y green aprobados no se pide nada (aunque haya una marca vieja)', async () => {
    misMarcas.marcas = { 3: { holeNumber: 3, tee: T, bends: [], greenCenter: G, markedAt: 'a' } };
    abrirCon(conMapa({ 3: { playLine: [T, G], green: GREEN } }));
    await screen.findByTestId('mapa-del-hoyo');

    expect(carga.props).toMatchObject({ hoyo: { green: GREEN }, porMarcar: null, onGuardarMarca: null, onVolverAMarcar: null });
  });

  it('C14/C16: con su marca, el hoyo se ve marcado, sin atribución de OSM, y con «Volver a marcar»', async () => {
    misMarcas.marcas = { 3: { holeNumber: 3, tee: T, bends: [], greenCenter: G, markedAt: 'a' } };
    abrirCon(estado({ mapaDelCampo: null }));
    await screen.findByTestId('mapa-del-hoyo');

    expect(carga.props.hoyo).toMatchObject({ playLine: [T, G], marcadoPorMi: true });
    expect(carga.props.hoyo.green.center).toEqual(G);
    expect(carga.props).toMatchObject({ porMarcar: null, atribucion: null, onGuardarMarca: null });
    expect(carga.props.onVolverAMarcar).toEqual(expect.any(Function));
  });

  it('C2: su green sobre la salida del mapa: la línea del mapa termina en su green, con atribución', async () => {
    const conSalida = { playLine: [T, { lat: 36.2825, lon: -5.33 }], green: null };
    misMarcas.marcas = { 3: { holeNumber: 3, tee: null, bends: [], greenCenter: G, markedAt: 'a' } };
    abrirCon(conMapa({ 3: conSalida }));
    await screen.findByTestId('mapa-del-hoyo');

    expect(carga.props.hoyo.playLine).toEqual([T, G]);
    expect(carga.props.atribucion).toBe(OSM);
  });

  it('su marca entera sobre una salida aprobada (hecha sin cobertura): todo es suyo, sin atribución', async () => {
    const conSalida = { playLine: [T, { lat: 36.2825, lon: -5.33 }], green: null };
    misMarcas.marcas = { 3: { holeNumber: 3, tee: { lat: 36.2801, lon: -5.33 }, bends: [], greenCenter: G, markedAt: 'a' } };
    abrirCon(conMapa({ 3: conSalida }));
    await screen.findByTestId('mapa-del-hoyo');

    expect(carga.props.hoyo.playLine[0]).toEqual({ lat: 36.2801, lon: -5.33 });
    expect(carga.props.atribucion).toBeNull();
  });

  it('C16: «Volver a marcar» rehace el mapa pidiendo otra vez la marca', async () => {
    misMarcas.marcas = { 3: { holeNumber: 3, tee: T, bends: [], greenCenter: G, markedAt: 'a' } };
    abrirCon(estado({ mapaDelCampo: null }));
    await screen.findByTestId('mapa-del-hoyo');
    const antes = carga.montajes;

    act(() => carga.props.onVolverAMarcar());

    expect(carga.props).toMatchObject({ hoyo: null, porMarcar: 'salida' });
    expect(carga.montajes).toBe(antes + 1);
  });

  it('C12/C15: guardar envía el hoyo con lo marcado y, guardada, vuelve a verse marcado', async () => {
    misMarcas.marcas = { 3: { holeNumber: 3, tee: T, bends: [], greenCenter: G, markedAt: 'a' } };
    abrirCon(estado({ mapaDelCampo: null }));
    await screen.findByTestId('mapa-del-hoyo');
    act(() => carga.props.onVolverAMarcar());

    let r;
    await act(async () => {
      r = await carga.props.onGuardarMarca({ tee: T, bends: [], greenCenter: G });
    });

    expect(misMarcas.guardar).toHaveBeenCalledWith({ holeNumber: 3, tee: T, bends: [], greenCenter: G });
    expect(r).toEqual({ estado: 'guardada' });
    expect(carga.props).toMatchObject({ porMarcar: null, hoyo: { marcadoPorMi: true } });
  });

  it.each([
    ['HOLE_ALREADY_MAPPED', 'mapa.yaTieneDatos'],
    ['HOLE_MARK_OUT_OF_RANGE', 'mapa.fueraDeLimites'],
    ['HOLE_MARK_TOO_FAR_FROM_COURSE', 'mapa.lejosDelCampo'],
    ['TEE_REQUIRED', 'mapa.faltaLaSalida'],
    ['OTRA_COSA', 'mapa.noSeGuardo'],
  ])('rechazada (%s): se avisa y queda la marca de antes', async (codigo, texto) => {
    misMarcas.marcas = { 3: { holeNumber: 3, tee: T, bends: [], greenCenter: G, markedAt: 'a' } };
    misMarcas.guardar.mockResolvedValue({ estado: 'rechazada', errorCode: codigo });
    abrirCon(estado({ mapaDelCampo: null }));
    await screen.findByTestId('mapa-del-hoyo');
    act(() => carga.props.onVolverAMarcar());

    await act(async () => carga.props.onGuardarMarca({ tee: T, bends: [], greenCenter: G }));

    expect(toastFalso.error).toHaveBeenCalledWith(texto);
    expect(carga.props).toMatchObject({ porMarcar: null, hoyo: { marcadoPorMi: true } });
  });

  it('C3/C16: volviendo a marcar, «Ahora no» devuelve la marca que había', async () => {
    misMarcas.marcas = { 3: { holeNumber: 3, tee: T, bends: [], greenCenter: G, markedAt: 'a' } };
    abrirCon(estado({ mapaDelCampo: null }));
    await screen.findByTestId('mapa-del-hoyo');
    expect(carga.props.onAhoraNo).toBeNull();
    act(() => carga.props.onVolverAMarcar());

    act(() => carga.props.onAhoraNo());

    expect(carga.props).toMatchObject({ porMarcar: null, hoyo: { marcadoPorMi: true }, onAhoraNo: null });
  });

  it('C17: una marca nueva (pendiente o guardada) rehace el mapa como hoyo marcado', async () => {
    const { rerender } = abrirCon(estado({ mapaDelCampo: null }));
    await screen.findByTestId('mapa-del-hoyo');
    const antes = carga.montajes;

    misMarcas.marcas = { 3: { holeNumber: 3, tee: T, bends: [], greenCenter: G, markedAt: 'b' } };
    rerender(<VentanaDelMapa mapaDelHoyo={estado({ mapaDelCampo: null })} golfCourseId="gc-1" numeroDeHoyo={3} par={4} metros={142} userId="u1" />);

    expect(carga.props.hoyo.marcadoPorMi).toBe(true);
    expect(carga.montajes).toBe(antes + 1);
  });

  it('sin jugador, no se marca', async () => {
    abrirCon(estado({ mapaDelCampo: null }), { userId: null });
    await screen.findByTestId('mapa-del-hoyo');

    expect(carga.props).toMatchObject({ porMarcar: null, onGuardarMarca: null });
  });
});
