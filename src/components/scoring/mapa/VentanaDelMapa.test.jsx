import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k) => k }) }));
vi.mock('../../../utils/sentryHelpers', () => ({ captureError: vi.fn() }));
const toastFalso = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
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

const lasMuestras = vi.hoisted(() => ({ muestras: {}, pendientes: {}, enviar: null, args: null }));
vi.mock('../../../hooks/useMuestrasDelCampo', () => ({
  useMuestrasDelCampo: (args) => {
    lasMuestras.args = args;
    return { muestras: lasMuestras.muestras, pendientes: lasMuestras.pendientes, enviar: lasMuestras.enviar };
  },
}));

const elReporte = vi.hoisted(() => ({ reportar: vi.fn(), args: null }));
vi.mock('../../../hooks/useReportarHoyo', () => ({
  useReportarHoyo: (args) => {
    elReporte.args = args;
    return args.userId && args.golfCourseId ? elReporte.reportar : null;
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


// Agustín, 16 oct: muestras anónimas. Lo que se ve, por orden: el hoyo
// aprobado, la primera muestra, la pendiente del jugador; al cerrar, la muestra
// se envía sin decirle nada
describe('VentanaDelMapa — muestras del hoyo', () => {
  const T = { lat: 36.28, lon: -5.33 };
  const C = { lat: 36.2815, lon: -5.33 };
  const G = { lat: 36.283, lon: -5.33 };
  const PRIMERA = { tee: T, bends: [C], greenCenter: G };
  const BARRA = { color: 'YELLOW', gender: 'MALE' };
  const abrirEn = (mapaDelCampo, props = {}) =>
    render(<VentanaDelMapa mapaDelHoyo={estado({ mapaDelCampo })} golfCourseId="gc-1" numeroDeHoyo={3} par={4} metros={300} userId="u-1" barra={BARRA} {...props} />);

  beforeEach(() => {
    carga.falla = false;
    carga.suspende = false;
    carga.props = null;
    carga.montajes = 0;
    lasMuestras.muestras = {};
    lasMuestras.pendientes = {};
    lasMuestras.enviar = vi.fn(async () => {});
    toastFalso.error.mockClear();
    toastFalso.success.mockClear();
  });

  it('pide las muestras de ese campo, con la sesión del jugador', async () => {
    abrirEn(null);
    await screen.findByTestId('mapa-del-hoyo');

    expect(lasMuestras.args).toEqual({ golfCourseId: 'gc-1', userId: 'u-1', barra: BARRA });
  });

  it('V1: sin nada del hoyo, se piden salida y green, recogiendo, con los metros de la tarjeta', async () => {
    abrirEn({ holes: {} });
    await screen.findByTestId('mapa-del-hoyo');

    expect(carga.props).toMatchObject({ hoyo: null, porMarcar: 'salida', recoge: true, metros: 300, atribucion: null });
  });

  it('V1: con la salida aprobada y sin green, se ve y se pide el green', async () => {
    const conSalida = { playLine: [T], green: null };
    abrirEn({ attribution: 'osm', holes: { 3: conSalida } });
    await screen.findByTestId('mapa-del-hoyo');

    expect(carga.props).toMatchObject({ hoyo: conSalida, porMarcar: 'green', atribucion: 'osm' });
  });

  it('V2: con la primera muestra, se ve ella (sin atribución) y no se pide nada', async () => {
    lasMuestras.muestras = { 3: { primera: PRIMERA, recoge: true } };

    abrirEn({ attribution: 'osm', holes: {} });
    await screen.findByTestId('mapa-del-hoyo');

    expect(carga.props.hoyo.playLine).toEqual([T, C, G]);
    expect(carga.props.hoyo.green.center).toEqual(G);
    expect(carga.props).toMatchObject({ porMarcar: null, recoge: true, atribucion: null });
  });

  it('V2: la primera muestra va antes que lo que el jugador dejó pendiente', async () => {
    lasMuestras.muestras = { 3: { primera: PRIMERA, recoge: true } };
    lasMuestras.pendientes = { 3: { tee: T, bends: [], greenCenter: C } };

    abrirEn({ holes: {} });
    await screen.findByTestId('mapa-del-hoyo');

    expect(carga.props.hoyo.green.center).toEqual(G);
  });

  it('V3: sin muestra en el servidor, la pendiente del jugador (hecha sin cobertura)', async () => {
    lasMuestras.pendientes = { 3: { tee: T, bends: [], greenCenter: G } };

    abrirEn({ holes: {} });
    await screen.findByTestId('mapa-del-hoyo');

    expect(carga.props.hoyo.playLine).toEqual([T, G]);
    expect(carga.props.porMarcar).toBeNull();
  });

  it('V4: un hoyo aprobado entero va antes que cualquier muestra, con su atribución', async () => {
    lasMuestras.muestras = { 3: { primera: PRIMERA, recoge: true } };

    abrirEn(estado().mapaDelCampo);
    await screen.findByTestId('mapa-del-hoyo');

    expect(carga.props).toMatchObject({ hoyo: { playLine: [], green: GREEN }, porMarcar: null, atribucion: '© OpenStreetMap contributors (ODbL)' });
  });

  it('V5: si el hoyo ya no recoge, el mapa lo sabe (se mueve para medir, sin enviar)', async () => {
    lasMuestras.muestras = { 3: { primera: PRIMERA, recoge: false } };

    abrirEn({ holes: {} });
    await screen.findByTestId('mapa-del-hoyo');

    expect(carga.props.recoge).toBe(false);
  });

  it('V6: sin saber nada del hoyo (sin red la primera vez), recoge', async () => {
    abrirEn({ holes: {} });
    await screen.findByTestId('mapa-del-hoyo');

    expect(carga.props.recoge).toBe(true);
  });

  it('V7: la muestra del mapa se envía para ESE hoyo, sin avisos', async () => {
    abrirEn({ holes: {} });
    await screen.findByTestId('mapa-del-hoyo');

    await act(async () => carga.props.onMuestra(PRIMERA));

    expect(lasMuestras.enviar).toHaveBeenCalledWith(3, PRIMERA);
    expect(toastFalso.error).not.toHaveBeenCalled();
    expect(toastFalso.success).not.toHaveBeenCalled();
  });

  it('V8: sin jugador, ni se pide marcar ni se envía nada', async () => {
    abrirEn({ holes: {} }, { userId: null });
    await screen.findByTestId('mapa-del-hoyo');

    expect(carga.props).toMatchObject({ porMarcar: null, onMuestra: null });
  });

  it('V8: sin barra (quien no juega el partido), se ve y se mide, pero ni se marca ni se envía', async () => {
    abrirEn({ holes: {} }, { barra: null });
    await screen.findByTestId('mapa-del-hoyo');

    expect(carga.props).toMatchObject({ porMarcar: null, onMuestra: null });
  });

  // 17 oct (BE #575): una referencia por hoyo, y el green de una muestra solo green
  it('V10: con solo el green de una muestra solo green, se ve ese green y se pide la salida hasta él', async () => {
    lasMuestras.muestras = { 3: { primera: null, green: G, recoge: true } };

    abrirEn({ holes: {} });
    await screen.findByTestId('mapa-del-hoyo');

    expect(carga.props.hoyo).toEqual({ playLine: [], green: { center: G } });
    expect(carga.props.porMarcar).toBe('salidaAlGreen');
  });

  it('V10: la primera completa va antes que el green suelto', async () => {
    lasMuestras.muestras = { 3: { primera: { tee: T, bends: [], greenCenter: C }, green: G, recoge: true } };

    abrirEn({ holes: {} });
    await screen.findByTestId('mapa-del-hoyo');

    expect(carga.props.hoyo.green.center).toEqual(C);
    expect(carga.props.porMarcar).toBeNull();
  });

  it('V10: el green suelto va antes que la línea pendiente del jugador', async () => {
    lasMuestras.muestras = { 3: { primera: null, green: G, recoge: true } };
    lasMuestras.pendientes = { 3: { tee: T, bends: [], greenCenter: C } };

    abrirEn({ holes: {} });
    await screen.findByTestId('mapa-del-hoyo');

    expect(carga.props.hoyo.green.center).toEqual(G);
  });

  it('V10: un green solo del propio jugador (pendiente) se ve, y se pide la salida hasta él', async () => {
    lasMuestras.pendientes = { 3: { tee: null, bends: [], greenCenter: C } };

    abrirEn({ holes: {} });
    await screen.findByTestId('mapa-del-hoyo');

    expect(carga.props.hoyo).toEqual({ playLine: [], green: { center: C } });
    expect(carga.props.porMarcar).toBe('salidaAlGreen');
  });

  // V1 (17 oct): la línea que guardó el admin, antes que nada
  it('V1: la línea guardada por el admin va antes que el hoyo aprobado y que las muestras', async () => {
    lasMuestras.muestras = { 3: { guardada: { tee: T, bends: [], greenCenter: C }, primera: PRIMERA, green: G, recoge: false } };

    abrirEn({ holes: { 3: { playLine: [T, G], green: { front: G, center: G, back: G } } } });
    await screen.findByTestId('mapa-del-hoyo');

    expect(carga.props.hoyo.green.center).toEqual(C);
    expect(carga.props.porMarcar).toBeNull();
    expect(carga.props.atribucion).toBeNull();
  });

  it('V1: con la línea del admin no se envía nada, aunque el resumen diga que recoge', async () => {
    lasMuestras.muestras = { 3: { guardada: { tee: T, bends: [], greenCenter: C }, primera: null, green: null, recoge: true } };

    abrirEn({ holes: {} });
    await screen.findByTestId('mapa-del-hoyo');

    expect(carga.props.recoge).toBe(false);
    expect(carga.props.colocarSalida).toBe(true);
  });

  it('V2: mi propia línea pendiente no se coloca por metros', async () => {
    lasMuestras.pendientes = { 3: { tee: T, bends: [], greenCenter: C } };

    abrirEn({ holes: {} });
    await screen.findByTestId('mapa-del-hoyo');

    expect(carga.props.colocarSalida).toBe(false);
  });

  it('V2: si cambian los metros con el mapa abierto (sin empezar), se rehace con ellos', async () => {
    lasMuestras.muestras = { 3: { primera: PRIMERA, green: null, recoge: true } };
    const { rerender } = abrirEn({ holes: {} });
    await screen.findByTestId('mapa-del-hoyo');
    const antes = carga.montajes;

    rerender(<VentanaDelMapa mapaDelHoyo={estado({ mapaDelCampo: { holes: {} } })} golfCourseId="gc-1" numeroDeHoyo={3} par={4} metros={320} userId="u-1" barra={BARRA} />);

    expect(carga.montajes).toBe(antes + 1);
  });

  // Revisión del 17 oct (decidido sin Agustín, lo más conservador; a confirmar)
  it('V10: con la salida del mapa aprobado, se sigue pidiendo el green desde ella (el green suelto no la tapa)', async () => {
    lasMuestras.muestras = { 3: { primera: null, green: G, recoge: true } };

    abrirEn({ holes: { 3: { playLine: [T], green: null } } });
    await screen.findByTestId('mapa-del-hoyo');

    expect(carga.props.hoyo.playLine).toEqual([T]);
    expect(carga.props.porMarcar).toBe('green');
  });

  it('V10: mi línea completa que acaba en ese green suelto va antes que él (es la que lo completa)', async () => {
    lasMuestras.muestras = { 3: { primera: null, green: G, recoge: true } };
    lasMuestras.pendientes = { 3: { tee: T, bends: [], greenCenter: G } };

    abrirEn({ holes: {} });
    await screen.findByTestId('mapa-del-hoyo');

    expect(carga.props.hoyo.playLine).toEqual([T, G]);
    expect(carga.props.porMarcar).toBeNull();
  });

  it('V12: si cambia QUÉ se ve (llega una completa tras el green suelto), el mapa se rehace', async () => {
    lasMuestras.muestras = { 3: { primera: null, green: G, recoge: true } };
    const { rerender } = abrirEn({ holes: {} });
    await screen.findByTestId('mapa-del-hoyo');
    const antes = carga.montajes;

    lasMuestras.muestras = { 3: { primera: { tee: T, bends: [], greenCenter: C }, green: G, recoge: true } };
    rerender(<VentanaDelMapa mapaDelHoyo={estado({ mapaDelCampo: { holes: {} } })} golfCourseId="gc-1" numeroDeHoyo={3} par={4} metros={300} userId="u-1" barra={BARRA} />);

    expect(carga.montajes).toBe(antes + 1);
    expect(carga.props.hoyo.green.center).toEqual(C);
  });

  it('V11: en cuanto el jugador empieza, lo que ve no cambia aunque llegue una muestra', async () => {
    const { rerender } = abrirEn({ holes: {} });
    await screen.findByTestId('mapa-del-hoyo');
    act(() => carga.props.onEmpezar());
    const antes = carga.montajes;

    lasMuestras.muestras = { 3: { primera: PRIMERA, green: null, recoge: true } };
    rerender(<VentanaDelMapa mapaDelHoyo={estado({ mapaDelCampo: { holes: {} } })} golfCourseId="gc-1" numeroDeHoyo={3} par={4} metros={300} userId="u-1" barra={BARRA} />);

    expect(carga.montajes).toBe(antes);
    expect(carga.props).toMatchObject({ hoyo: null, porMarcar: 'salida' });
  });

  it('V11: pero si cambia el «recoge», le llega (no cambia lo que ve, sí si se envía)', async () => {
    const { rerender } = abrirEn({ holes: {} });
    await screen.findByTestId('mapa-del-hoyo');
    act(() => carga.props.onEmpezar());

    lasMuestras.muestras = { 3: { primera: PRIMERA, green: null, recoge: false } };
    rerender(<VentanaDelMapa mapaDelHoyo={estado({ mapaDelCampo: { holes: {} } })} golfCourseId="gc-1" numeroDeHoyo={3} par={4} metros={300} userId="u-1" barra={BARRA} />);

    expect(carga.props.recoge).toBe(false);
  });

  it('V9: cuando llega la primera muestra con el mapa abierto, el mapa se rehace con ella', async () => {
    const { rerender } = abrirEn({ holes: {} });
    await screen.findByTestId('mapa-del-hoyo');
    const antes = carga.montajes;

    lasMuestras.muestras = { 3: { primera: PRIMERA, recoge: true } };
    rerender(<VentanaDelMapa mapaDelHoyo={estado({ mapaDelCampo: { holes: {} } })} golfCourseId="gc-1" numeroDeHoyo={3} par={4} metros={300} userId="u-1" barra={BARRA} />);

    expect(carga.montajes).toBe(antes + 1);
    expect(carga.props.hoyo.green.center).toEqual(G);
  });

  it('V9: si solo se refrescan las muestras (sin cambiar lo que se ve), no se rehace', async () => {
    lasMuestras.muestras = { 3: { primera: PRIMERA, recoge: true } };
    const { rerender } = abrirEn({ holes: {} });
    await screen.findByTestId('mapa-del-hoyo');
    const antes = carga.montajes;

    rerender(<VentanaDelMapa mapaDelHoyo={estado({ mapaDelCampo: { holes: {} } })} golfCourseId="gc-1" numeroDeHoyo={3} par={4} metros={300} userId="u-1" barra={BARRA} />);

    expect(carga.montajes).toBe(antes);
  });
});


// Entrega 7 (18 oct): el reporte de un hoyo sale con el jugador, el campo y el hoyo
describe('VentanaDelMapa — reportar un hoyo', () => {
  beforeEach(() => {
    carga.falla = false;
    carga.suspende = false;
    carga.props = null;
    elReporte.reportar.mockReset();
  });

  it('con sesión, el mapa puede reportar y el reporte lleva el número de hoyo', async () => {
    render(<VentanaDelMapa mapaDelHoyo={estado()} golfCourseId="gc-1" numeroDeHoyo={3} par={4} userId="yo" />);
    await screen.findByTestId('mapa-del-hoyo');

    carga.props.onReporte({ id: 'r-1', reason: 'WRONG_LINE' });

    expect(elReporte.args).toEqual({ golfCourseId: 'gc-1', userId: 'yo' });
    expect(elReporte.reportar).toHaveBeenCalledWith(3, { id: 'r-1', reason: 'WRONG_LINE' });
  });

  it('sin sesión, el mapa no ofrece reportar', async () => {
    render(<VentanaDelMapa mapaDelHoyo={estado()} golfCourseId="gc-1" numeroDeHoyo={3} par={4} />);
    await screen.findByTestId('mapa-del-hoyo');

    expect(carga.props.onReporte).toBeNull();
  });
});
