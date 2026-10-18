import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, cleanup, render, screen, fireEvent, waitFor, within } from '@testing-library/react';

/**
 * Revisar un hoyo (BE #575, 17 oct: una referencia por hoyo).
 *
 * | Caso | Qué                                       | Qué pasa                                             |
 * |------|-------------------------------------------|------------------------------------------------------|
 * | R1   | al abrir                                  | el mapa con todas las muestras y lo guardado; la línea de partida es la guardada o la primera completa |
 * | R2   | la lista de muestras                      | cada una con su barra, su día y lo que mide (solo green, sin metros) |
 * | R2   | la tarjeta de cada barra                  | su par y sus metros                                   |
 * | R3   | «Partir de esta»                          | la línea pasa a ser esa muestra                       |
 * | R4   | mover la línea en el mapa                 | lo que mide se actualiza                              |
 * | R5   | «Guardar línea» (P12, 17 oct)             | se guarda, «Hoyo N guardado» y la revisión se cierra sola con el cambio: el hoyo sale de pendientes |
 * | R5   | si falla                                  | un aviso, y nada cambia                               |
 * | R6   | «Reabrir hoyo» (solo si está guardado)    | se quita la línea                                     |
 * | R7   | «Borrar» una muestra                      | pide confirmar; al confirmar, se borra                |
 * | R8   | «Cerrar» sin cambios                      | avisa sin cambio                                      |
 * | E1   | «Marcar desde cero», en cualquier hoyo    | se marca la línea en el mapa                          |
 * | E2   | tocar la salida y el centro del green     | la línea, con los codos de su par sobre la recta      |
 * | E3   | solo hay un green suelto                  | se toca solo la salida y se usa ese green             |
 * | E4   | «Cancelar»                                | vuelve la línea de antes                              |
 * | E5   | green a <40 o >750 m de la salida         | un aviso y no se coloca                               |
 * | E6   | mientras se marca                         | no se guarda                                          |
 * | E7   | sin par                                   | un codo                                               |
 * | E8–E11 | la tarjeta                              | «Par 5 · Distancia del hoyo: 430 a 500 m» (corta a larga), «Par 4 · 350 m», sin metros, «Par 4–5» |
 * | E12  | lo que mide la línea                      | sigue debajo                                          |
 * | Q3   | un hoyo con reportes (entrega 7)          | «Reportes»: motivo y día de cada uno; sin reportes, no hay sección |
 * | Q4   | tocar un reporte            | la línea pasa a ser la que propuso                    |
 * | Q5   | «Descartar» un reporte                    | pide confirmar; al confirmar, se descarta y la línea que se edita no se toca |
 * | V1   | sin guardada y con reportes               | abre con la línea del primer reporte, aunque haya OSM o muestras |
 * | V2   | con guardada y con reportes               | abre con la guardada                                  |
 * | V3   | sin reportes                              | como antes: OSM y, si no, la primera muestra completa |
 * | V4   | descartar un reporte o borrar una muestra | con la línea movida, se queda; sin moverla, se parte de lo que quede |
 * | V5   | el primer reporte sin codos               | su salida y su green                                  |
 *
 * Agustín, 18 oct: seleccionar = editar, y ninguna distinción de barras.
 *
 * | Caso | Qué                                       | Qué pasa                                             |
 * |------|-------------------------------------------|------------------------------------------------------|
 * | S1   | al abrir                                  | en el mapa, las muestras y los reportes              |
 * | S2   | la línea de partida                       | si es de un reporte o una muestra, su fila seleccionada; la guardada u OSM, ninguna |
 * | S3   | tocar la fila de un reporte o una completa | su línea es la que se edita y su fila, la seleccionada (sin «Partir de esta») |
 * | S4   | tocar otra fila                           | la selección y la línea pasan a esa                  |
 * | S5   | tocar la seleccionada                     | nada cambia                                          |
 * | S6   | tocar un solo green                       | su punto en rojo y su fila seleccionada; la línea no cambia |
 * | S7   | mover la línea                            | la fila sigue seleccionada                           |
 * | S8   | la fila seleccionada                      | borde rojo y aria-pressed                            |
 * | S10  | «Borrar» o «Descartar»                    | aparte de la fila; la seleccionada borrada, sin selección |
 * | S13  | barras                                    | ni en el mapa ni en la lista                         |
 */

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k, o) => (o ? `${k} ${JSON.stringify(o)}` : k) }),
}));
const avisos = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('../../../utils/toast', () => ({ default: avisos }));

const casos = vi.hoisted(() => ({ campo: vi.fn(), guardar: vi.fn(), reabrir: vi.fn(), borrar: vi.fn(), descartar: vi.fn() }));
vi.mock('../../../composition', () => ({
  getHoleReviewUseCase: { execute: casos.campo },
  saveHoleLineUseCase: { execute: casos.guardar },
  reopenHoleUseCase: { execute: casos.reabrir },
  deleteHoleSampleUseCase: { execute: casos.borrar },
  discardHoleReportUseCase: { execute: casos.descartar },
}));
const gps = vi.hoisted(() => ({ lectura: { estado: 'inactivo', posicion: null, precision: null }, activo: [] }));
vi.mock('../../../hooks/usePosicionGps', () => ({
  usePosicionGps: ({ activo, precisionMaxima }) => {
    gps.activo.push(activo);
    gps.precisionMaxima = precisionMaxima;
    return activo ? gps.lectura : { estado: 'inactivo', posicion: null, precision: null };
  },
}));
const mapa = vi.hoisted(() => ({ props: null }));
vi.mock('./MapaDeRevision', () => ({
  default: (props) => {
    mapa.props = props;
    return <div data-testid="mapa-de-revision" />;
  },
}));

const { default: RevisarHoyo } = await import('./RevisarHoyo');

const M = 6371008.8 * (Math.PI / 180);
const T = { lat: 36.28, lon: -5.33 };
const alNorte = (m) => ({ lat: T.lat + m / M, lon: T.lon });
const COMPLETA = { id: 's-1', tee: T, bends: [], greenCenter: alNorte(300), llego: '2026-10-17' };
const SOLO_GREEN = { id: 's-2', tee: null, bends: [], greenCenter: alNorte(305), llego: '2026-10-17' };
const campo = (hoyo) => ({ golfCourseId: 'gc-1', name: 'Alcanada', holes: [{ holeNumber: 1, guardada: null, muestras: [COMPLETA, SOLO_GREEN], barras: [{ color: 'YELLOW', gender: 'MALE', identifier: null, par: 4, metros: 350 }], ...hoyo }] });

// Las filas de muestras y reportes: se tocan para editar su línea (S3)
const filas = (dentro = globalThis.document.body) => within(dentro).getAllByRole('button').filter((b) => b.hasAttribute('aria-pressed'));
const seleccionadas = () => filas().filter((b) => b.getAttribute('aria-pressed') === 'true');

const abrir = async (hoyo = {}, onCerrar = vi.fn()) => {
  casos.campo.mockResolvedValue(campo(hoyo));
  render(<RevisarHoyo golfCourseId="gc-1" nombre="Alcanada" numeroDeHoyo={1} onCerrar={onCerrar} />);
  await screen.findByTestId('mapa-de-revision');
  return onCerrar;
};

describe('RevisarHoyo', () => {
  beforeEach(() => {
    for (const f of Object.values(casos)) f.mockReset();
    avisos.success.mockReset();
    avisos.error.mockReset();
    mapa.props = null;
  });

  it('R1: el mapa con todas las muestras; la línea de partida, la primera completa', async () => {
    await abrir();

    expect(mapa.props.muestras).toEqual([COMPLETA, SOLO_GREEN]);
    expect(mapa.props.guardada).toBeNull();
    expect(mapa.props.linea).toEqual({ tee: T, bends: [], greenCenter: alNorte(300) });
  });

  it('R1: con línea guardada, se parte de ella', async () => {
    const guardada = { tee: alNorte(10), bends: [], greenCenter: alNorte(300) };
    await abrir({ guardada });

    expect(mapa.props.linea).toEqual(guardada);
  });

  it('R2/S13: cada muestra con su día y lo que mide, sin su barra; la tarjeta, en una línea', async () => {
    await abrir();

    const seccion = screen.getByRole('region', { name: 'holeReviews.samplesTitle' });
    expect(seccion.textContent).not.toMatch(/teeColors|genders/);

    expect(screen.getByText(/holeReviews.metres {"metros":300}/)).toBeInTheDocument();
    expect(screen.getByText(/holeReviews.greenOnly/)).toBeInTheDocument();
    expect(screen.getByText('holeReviews.cardSame {"par":"4","metros":350}')).toBeInTheDocument();
  });

  it('R3/R4: partir de otra muestra, y lo que mide sigue a la línea', async () => {
    const otra = { ...COMPLETA, id: 's-3', greenCenter: alNorte(320) };
    await abrir({ muestras: [COMPLETA, otra] });

    fireEvent.click(filas()[1]);
    expect(mapa.props.linea.greenCenter).toEqual(alNorte(320));

    act(() => mapa.props.onLinea({ tee: T, bends: [], greenCenter: alNorte(340) }));
    expect(screen.getByTestId('lo-que-mide')).toHaveTextContent('holeReviews.lineMetres {"metros":340}');
  });

  it('R5/P12: guardar avisa con el número del hoyo y cierra la revisión, sin recargarla', async () => {
    const onCerrar = await abrir();
    casos.guardar.mockResolvedValue(undefined);

    fireEvent.click(screen.getByRole('button', { name: 'holeReviews.save' }));

    await waitFor(() => expect(onCerrar).toHaveBeenCalledWith({ cambiado: true, guardado: true }));
    expect(casos.guardar).toHaveBeenCalledWith('gc-1', 1, { tee: T, bends: [], greenCenter: alNorte(300) });
    expect(avisos.success).toHaveBeenCalledWith('holeReviews.savedOk {"numero":1}');
    expect(casos.campo).toHaveBeenCalledTimes(1);
  });

  it('P12: con el aviso de cambios sin guardar a la vista, guardar cierra igual', async () => {
    const onCerrar = await abrir();
    act(() => mapa.props.onLinea({ tee: alNorte(5), bends: [], greenCenter: alNorte(300) }));
    fireEvent.click(screen.getByRole('button', { name: 'holeReviews.close' }));
    expect(screen.getByText('holeReviews.unsaved')).toBeInTheDocument();
    let terminar;
    casos.guardar.mockReturnValue(new Promise((ok) => { terminar = ok; }));

    fireEvent.click(screen.getByRole('button', { name: 'holeReviews.save' }));
    // Mientras guarda, «Cerrar sin guardar» no cierra a medias
    expect(screen.getByRole('button', { name: 'holeReviews.closeWithoutSaving' })).toBeDisabled();
    await act(async () => terminar());

    expect(casos.guardar).toHaveBeenCalledWith('gc-1', 1, { tee: alNorte(5), bends: [], greenCenter: alNorte(300) });
    expect(onCerrar).toHaveBeenCalledTimes(1);
    expect(onCerrar).toHaveBeenCalledWith({ cambiado: true, guardado: true });
  });

  it('R6: reabrir, solo con la línea guardada', async () => {
    await abrir({ guardada: { tee: T, bends: [], greenCenter: alNorte(300) } });
    casos.reabrir.mockResolvedValue(undefined);

    fireEvent.click(screen.getByRole('button', { name: 'holeReviews.reopen' }));

    await waitFor(() => expect(casos.reabrir).toHaveBeenCalledWith('gc-1', 1));
  });

  it('R6: sin línea guardada, no hay «Reabrir»', async () => {
    await abrir();

    expect(screen.queryByRole('button', { name: 'holeReviews.reopen' })).toBeNull();
  });

  it('R7: borrar pide confirmar, y al confirmar se borra', async () => {
    await abrir();
    casos.borrar.mockResolvedValue(undefined);

    fireEvent.click(screen.getAllByRole('button', { name: 'holeReviews.delete' })[1]);
    expect(casos.borrar).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'holeReviews.confirmDelete' }));

    await waitFor(() => expect(casos.borrar).toHaveBeenCalledWith('gc-1', 's-2'));
  });

  // Revisión del 17 oct
  it('R7: borrar una muestra no tira la línea que estaba editando', async () => {
    await abrir();
    casos.borrar.mockResolvedValue(undefined);
    act(() => mapa.props.onLinea({ tee: alNorte(5), bends: [], greenCenter: alNorte(300) }));

    fireEvent.click(screen.getAllByRole('button', { name: 'holeReviews.delete' })[1]);
    fireEvent.click(screen.getByRole('button', { name: 'holeReviews.confirmDelete' }));

    await waitFor(() => expect(casos.campo).toHaveBeenCalledTimes(2));
    expect(mapa.props.linea.tee).toEqual(alNorte(5));
  });

  it('R9: con cambios sin guardar, cerrar avisa antes; «Cerrar sin guardar» cierra', async () => {
    const onCerrar = await abrir();
    act(() => mapa.props.onLinea({ tee: alNorte(5), bends: [], greenCenter: alNorte(300) }));

    fireEvent.click(screen.getByRole('button', { name: 'holeReviews.close' }));

    expect(onCerrar).not.toHaveBeenCalled();
    expect(screen.getByText('holeReviews.unsaved')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'holeReviews.closeWithoutSaving' }));
    expect(onCerrar).toHaveBeenCalledWith({ cambiado: false });
  });

  it('R10: mientras se guarda, no se cierra ni se elige otra muestra', async () => {
    await abrir();
    casos.guardar.mockReturnValue(new Promise(() => {}));

    fireEvent.click(screen.getByRole('button', { name: 'holeReviews.save' }));

    expect(screen.getByRole('button', { name: 'holeReviews.close' })).toBeDisabled();
    expect(filas().length).toBeGreaterThan(0);
    for (const b of filas()) expect(b).toBeDisabled();
    expect(screen.getAllByRole('button', { name: 'holeReviews.delete' })[0]).toBeDisabled();
  });

  it('R10: mientras se guarda, Escape tampoco cierra', async () => {
    const onCerrar = await abrir();
    casos.guardar.mockReturnValue(new Promise(() => {}));

    fireEvent.click(screen.getByRole('button', { name: 'holeReviews.save' }));
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onCerrar).not.toHaveBeenCalled();
  });

  it('R11: el día, en el formato del idioma; sin barras no hay tarjeta', async () => {
    await abrir({ barras: [] });

    expect(screen.queryByRole('heading', { name: 'holeReviews.cards' })).toBeNull();
    expect(screen.queryByText(/2026-10-17/)).toBeNull();
  });

  it('R12: un hoyo con solo greens sueltos: no hay línea de la que partir, y se dice', async () => {
    await abrir({ muestras: [SOLO_GREEN] });

    expect(mapa.props.linea).toBeNull();
    expect(screen.getByText('holeReviews.onlyGreens')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'holeReviews.save' })).toBeDisabled();
  });

  it('R8: cerrar sin cambios', async () => {
    const onCerrar = await abrir();

    fireEvent.click(screen.getByRole('button', { name: 'holeReviews.close' }));

    expect(onCerrar).toHaveBeenCalledWith({ cambiado: false });
  });
  it('P12: si quien la abrió no la cierra, la revisión no se queda bloqueada', async () => {
    await abrir({}, vi.fn());
    casos.guardar.mockResolvedValue(undefined);

    fireEvent.click(screen.getByRole('button', { name: 'holeReviews.save' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'holeReviews.close' })).not.toBeDisabled());
  });
  describe('E: el admin marca la línea él mismo (17 oct)', () => {
    const PAR4 = [{ color: 'YELLOW', gender: 'MALE', identifier: null, par: 4, metros: 350 }];
    const marcar = () => fireEvent.click(screen.getByRole('button', { name: 'holeReviews.markFromScratch' }));
    const tocar = (p) => act(() => mapa.props.onToque(p));

    it('E1/E2: en un hoyo sin nada, salida y green, y la línea sale con el codo del par 4', async () => {
      const onCerrar = await abrir({ muestras: [], barras: PAR4 });
      expect(mapa.props.linea).toBeNull();
      marcar();
      expect(screen.getByText('holeReviews.tapTee')).toBeInTheDocument();
      tocar(T);
      expect(screen.getByText('holeReviews.tapGreen')).toBeInTheDocument();
      expect(mapa.props.marcados).toEqual([T]);
      tocar(alNorte(300));

      expect(mapa.props.onToque).toBeUndefined();
      expect(mapa.props.marcados).toEqual([]);
      const { tee, bends, greenCenter } = mapa.props.linea;
      expect([tee, greenCenter]).toEqual([T, alNorte(300)]);
      expect(bends).toHaveLength(1);
      // El codo, sobre la recta: en medio
      expect(bends[0].lat).toBeCloseTo(alNorte(150).lat, 6);
      casos.guardar.mockResolvedValue(undefined);
      fireEvent.click(screen.getByRole('button', { name: 'holeReviews.save' }));
      await waitFor(() => expect(onCerrar).toHaveBeenCalledWith({ cambiado: true, guardado: true }));
      expect(casos.guardar.mock.calls[0][2]).toEqual(mapa.props.linea);
    });

    it('E1: también con línea de partida: se descarta y se marca otra', async () => {
      await abrir({ barras: [{ ...PAR4[0], par: 3 }] });
      expect(mapa.props.linea.tee).toEqual(T);
      marcar();
      tocar(alNorte(10));
      tocar(alNorte(160));

      expect(mapa.props.linea).toEqual({ tee: alNorte(10), bends: [], greenCenter: alNorte(160) });
    });

    it('E2: un par 5, dos codos a un tercio y a dos tercios', async () => {
      await abrir({ muestras: [], barras: [{ ...PAR4[0], par: 5, metros: 480 }] });
      marcar();
      tocar(T);
      tocar(alNorte(450));

      const { bends } = mapa.props.linea;
      expect(bends.map((b) => b.lat)).toEqual([expect.closeTo(alNorte(150).lat, 6), expect.closeTo(alNorte(300).lat, 6)]);
    });

    it('E3: con solo un green suelto, se toca la salida y se usa ese green', async () => {
      await abrir({ muestras: [SOLO_GREEN], barras: PAR4 });
      expect(screen.queryByText('holeReviews.onlyGreens')).toBeInTheDocument();
      marcar();
      expect(screen.getByText('holeReviews.tapTeeToGreen')).toBeInTheDocument();
      tocar(T);

      expect(mapa.props.linea.tee).toEqual(T);
      expect(mapa.props.linea.greenCenter).toEqual(SOLO_GREEN.greenCenter);
      expect(mapa.props.linea.bends).toHaveLength(1);
    });

    it('E3: con muestras completas además del green suelto, se marcan los dos puntos', async () => {
      await abrir({ barras: PAR4 });
      marcar();
      tocar(T);

      expect(screen.getByText('holeReviews.tapGreen')).toBeInTheDocument();
    });

    it('E4: «Cancelar» deja la línea de antes', async () => {
      await abrir({ barras: PAR4 });
      const antes = mapa.props.linea;
      marcar();
      tocar(alNorte(10));
      fireEvent.click(screen.getByRole('button', { name: 'holeReviews.cancelMarking' }));

      expect(mapa.props.linea).toEqual(antes);
      expect(mapa.props.onToque).toBeUndefined();
      expect(mapa.props.marcados).toEqual([]);
      expect(screen.queryByText('holeReviews.tapGreen')).toBeNull();
    });

    it('E5: un green a menos de 40 m o a más de 750 m: aviso, y se vuelve a tocar', async () => {
      await abrir({ muestras: [], barras: PAR4 });
      marcar();
      tocar(T);
      tocar(alNorte(30));
      expect(avisos.error).toHaveBeenCalledWith('holeReviews.greenTooClose');
      expect(mapa.props.linea).toBeNull();
      expect(screen.getByText('holeReviews.tapGreen')).toBeInTheDocument();
      tocar(alNorte(800));
      expect(avisos.error).toHaveBeenCalledWith('holeReviews.greenTooFar');
      tocar(alNorte(300));
      expect(mapa.props.linea.greenCenter).toEqual(alNorte(300));
    });

    it('E5: con el green suelto, una salida imposible: aviso y otra vez', async () => {
      await abrir({ muestras: [SOLO_GREEN], barras: PAR4 });
      marcar();
      tocar(alNorte(300));
      expect(avisos.error).toHaveBeenCalledWith('holeReviews.greenTooClose');
      expect(screen.getByText('holeReviews.tapTeeToGreen')).toBeInTheDocument();
    });

    it('E6: mientras se marca, no se guarda', async () => {
      await abrir({ barras: PAR4 });
      marcar();

      expect(screen.getByRole('button', { name: 'holeReviews.save' })).toBeDisabled();
    });

    it('E7: sin par conocido, un codo', async () => {
      await abrir({ muestras: [], barras: [] });
      marcar();
      tocar(T);
      tocar(alNorte(300));

      expect(mapa.props.linea.bends).toHaveLength(1);
    });

    it('E11: con pares distintos, los codos con el par de la más larga', async () => {
      await abrir({ muestras: [], barras: [{ ...PAR4[0], par: 5, metros: 410 }, { ...PAR4[0], color: 'WHITE', par: 3, metros: 180 }] });
      marcar();
      tocar(T);
      tocar(alNorte(400));

      expect(mapa.props.linea.bends).toHaveLength(2);
    });

    it('E8: la tarjeta en una línea, de la más corta a la más larga', async () => {
      await abrir({ barras: [{ ...PAR4[0], par: 5, metros: 500 }, { ...PAR4[0], par: 5, metros: 430 }] });

      expect(screen.getByText('holeReviews.cardRange {"par":"5","desde":430,"hasta":500}')).toBeInTheDocument();
      expect(screen.queryByText(/holeReviews.card {/)).toBeNull();
    });

    it('E9: todas iguales', async () => {
      await abrir({ barras: [PAR4[0], PAR4[0]] });
      expect(screen.getByText('holeReviews.cardSame {"par":"4","metros":350}')).toBeInTheDocument();
    });

    it('E10: sin metros en ninguna barra', async () => {
      await abrir({ barras: [{ ...PAR4[0], metros: null }] });
      expect(screen.getByText('holeReviews.cardNoMetres {"par":"4"}')).toBeInTheDocument();
    });

    it('E11: el par cambia entre barras', async () => {
      await abrir({ barras: [{ ...PAR4[0], par: 5, metros: 410 }, { ...PAR4[0], par: 4, metros: 480 }] });
      expect(screen.getByText('holeReviews.cardRange {"par":"4–5","desde":410,"hasta":480}')).toBeInTheDocument();
    });

    it('E14: el mapa parte de la ubicación del campo', async () => {
      casos.campo.mockResolvedValue({ ...campo({}), ubicacion: T });
      render(<RevisarHoyo golfCourseId="gc-1" nombre="Alcanada" numeroDeHoyo={1} onCerrar={vi.fn()} />);
      await screen.findByTestId('mapa-de-revision');

      expect(mapa.props.centro).toEqual(T);
    });

    it('E14: el GPS no se pide hasta tocar «Mi posición»; luego el mapa se centra en ti', async () => {
      gps.activo = [];
      gps.lectura = { estado: 'buscando', posicion: null, precision: null };
      await abrir({ muestras: [], barras: PAR4 });
      expect(gps.activo.every((a) => a === false)).toBe(true);
      expect(mapa.props.posicion).toBeNull();

      fireEvent.click(screen.getByRole('button', { name: 'holeReviews.myPosition' }));
      expect(gps.activo.at(-1)).toBe(true);
      expect(screen.getByText('holeReviews.findingPosition')).toBeInTheDocument();
      const pedido = mapa.props.centrarEnMi;
      expect(pedido).toBeGreaterThan(0);

      gps.lectura = { estado: 'listo', posicion: alNorte(20), precision: 8 };
      // Un repintado cualquiera: la lectura nueva llega al mapa
      fireEvent.click(screen.getByRole('button', { name: 'holeReviews.markFromScratch' }));
      await waitFor(() => expect(mapa.props.posicion).toEqual(alNorte(20)));
      fireEvent.click(screen.getByRole('button', { name: 'holeReviews.myPosition' }));
      expect(mapa.props.centrarEnMi).toBeGreaterThan(pedido);
    });

    it('E14: para centrar el mapa vale cualquier posición válida (un ordenador va por Wi-Fi)', async () => {
      await abrir({ barras: PAR4 });
      fireEvent.click(screen.getByRole('button', { name: 'holeReviews.myPosition' }));

      expect(gps.precisionMaxima).toBe(Infinity);
    });

    it('E14: sin permiso de ubicación, se dice', async () => {
      gps.lectura = { estado: 'denegado', posicion: null, precision: null };
      await abrir({ barras: PAR4 });
      fireEvent.click(screen.getByRole('button', { name: 'holeReviews.myPosition' }));

      expect(screen.getByText('holeReviews.positionDenied')).toBeInTheDocument();
    });

    it('E12: lo que mide la línea sigue a la vista', async () => {
      await abrir({ barras: PAR4 });
      expect(screen.getByText(/holeReviews.lineMetres/)).toBeInTheDocument();
    });

    describe('revisión (17 oct)', () => {
      const conCampo = async (hoyo) => {
        casos.campo.mockResolvedValue({ ...campo(hoyo), ubicacion: T });
        render(<RevisarHoyo golfCourseId="gc-1" nombre="Alcanada" numeroDeHoyo={1} onCerrar={vi.fn()} />);
        await screen.findByTestId('mapa-de-revision');
      };

      it('E15: un punto a más de 3 km del campo: aviso, y no se coloca', async () => {
        await conCampo({ muestras: [], barras: PAR4 });
        marcar();
        tocar(alNorte(3500));

        expect(avisos.error).toHaveBeenCalledWith('holeReviews.tooFarFromCourse');
        expect(mapa.props.marcados).toEqual([]);
        expect(screen.getByText('holeReviews.tapTee')).toBeInTheDocument();
        tocar(T);
        tocar(alNorte(3600));
        expect(avisos.error).toHaveBeenCalledTimes(2);
        expect(screen.getByText('holeReviews.tapGreen')).toBeInTheDocument();
      });

      it('E15: sin ubicación del campo, no se puede mirar y se deja', async () => {
        await abrir({ muestras: [], barras: PAR4 });
        marcar();
        tocar(alNorte(3500));

        expect(screen.getByText('holeReviews.tapGreen')).toBeInTheDocument();
      });

      it('E4: mientras se marca, la línea de antes no se arrastra, y Cancelar la devuelve tal cual', async () => {
        await abrir({ barras: PAR4 });
        const antes = mapa.props.linea;
        expect(mapa.props.bloqueada).toBe(false);
        marcar();
        expect(mapa.props.bloqueada).toBe(true);
        fireEvent.click(screen.getByRole('button', { name: 'holeReviews.cancelMarking' }));

        expect(mapa.props.bloqueada).toBe(false);
        expect(mapa.props.linea).toEqual(antes);
        // Nada que guardar: la línea no se tocó
        fireEvent.click(screen.getByRole('button', { name: 'holeReviews.close' }));
        expect(screen.queryByText('holeReviews.unsaved')).toBeNull();
      });

      it('mientras se marca, reabrir, partir de otra muestra y borrar no se pueden pulsar', async () => {
        await abrir({ guardada: { tee: T, bends: [], greenCenter: alNorte(300) }, barras: PAR4 });
        marcar();

        expect(screen.getByRole('button', { name: 'holeReviews.reopen' })).toBeDisabled();
        expect(filas().length).toBeGreaterThan(0);
        for (const b of filas()) expect(b).toBeDisabled();
        for (const b of screen.getAllByRole('button', { name: 'holeReviews.delete' })) expect(b).toBeDisabled();
      });

      // Guardar, reabrir y borrar no se pueden pulsar mientras se marca, y marcar
      // no se puede empezar mientras se guarda: nunca están a la vez
      it('mientras se guarda, un toque en el mapa no cuenta', async () => {
        await abrir({ barras: PAR4 });
        casos.guardar.mockReturnValue(new Promise(() => {}));
        fireEvent.click(screen.getByRole('button', { name: 'holeReviews.save' }));

        expect(mapa.props.onToque).toBeUndefined();
      });

      it('Escape mientras se marca cancela el marcado, no cierra', async () => {
        const onCerrar = vi.fn();
        await abrir({ barras: PAR4 }, onCerrar);
        marcar();
        fireEvent.keyDown(document, { key: 'Escape' });

        expect(onCerrar).not.toHaveBeenCalled();
        expect(screen.queryByText('holeReviews.tapTee')).toBeNull();
      });

      it('al empezar a marcar, el foco va a Cancelar; la instrucción se anuncia sin el botón', async () => {
        await abrir({ barras: PAR4 });
        marcar();

        expect(screen.getByRole('button', { name: 'holeReviews.cancelMarking' })).toHaveFocus();
        expect(screen.getByRole('status')).toHaveTextContent(/^holeReviews.tapTee$/);
      });

      it('«Mi posición» no se desactiva mientras busca: lo dice y queda ocupado', async () => {
        gps.lectura = { estado: 'buscando', posicion: null, precision: null };
        await abrir({ barras: PAR4 });
        fireEvent.click(screen.getByRole('button', { name: 'holeReviews.myPosition' }));

        const boton = screen.getByRole('button', { name: 'holeReviews.myPosition' });
        expect(boton).not.toBeDisabled();
        expect(boton).toHaveAttribute('aria-busy', 'true');
        expect(screen.getByText('holeReviews.findingPosition')).toBeInTheDocument();
      });

      it('sin marcar nada, lo marcado es siempre la misma lista vacía', async () => {
        await abrir({ barras: PAR4 });
        const antes = mapa.props.marcados;
        marcar();
        fireEvent.click(screen.getByRole('button', { name: 'holeReviews.cancelMarking' }));

        expect(mapa.props.marcados).toBe(antes);
      });

      it('/code-review: mientras se marca, «Cerrar» cierra (de un modal se sale siempre)', async () => {
        const onCerrar = vi.fn();
        await abrir({ barras: PAR4 }, onCerrar);
        marcar();
        fireEvent.click(screen.getByRole('button', { name: 'holeReviews.close' }));

        expect(onCerrar).toHaveBeenCalledWith({ cambiado: false });
      });

      it('/code-review: sin GPS en el navegador, «Mi posición» lo dice', async () => {
        gps.lectura = { estado: 'no-disponible', posicion: null, precision: null };
        await abrir({ barras: PAR4 });
        fireEvent.click(screen.getByRole('button', { name: 'holeReviews.myPosition' }));

        expect(screen.getByText('holeReviews.positionUnavailable')).toBeInTheDocument();
      });

      it('/code-review: con línea guardada y un green suelto, se marcan la salida y el green', async () => {
        await abrir({ guardada: { tee: T, bends: [], greenCenter: alNorte(300) }, muestras: [SOLO_GREEN], barras: PAR4 });
        marcar();

        expect(screen.getByText('holeReviews.tapTee')).toBeInTheDocument();
        tocar(alNorte(5));
        expect(screen.getByText('holeReviews.tapGreen')).toBeInTheDocument();
      });

      it('/code-review: al acabar de marcar, el foco vuelve a «Marcar desde cero»', async () => {
        await abrir({ barras: PAR4 });
        marcar();
        fireEvent.click(screen.getByRole('button', { name: 'holeReviews.cancelMarking' }));

        expect(screen.getByRole('button', { name: 'holeReviews.markFromScratch' })).toHaveFocus();
      });
    });

  describe('T: desde «Todos los campos» (17 oct)', () => {
    const PAR3 = [{ color: 'YELLOW', gender: 'MALE', identifier: null, par: 3, metros: 150 }];
    const OSM = { puntos: [T, alNorte(80), alNorte(148)], green: alNorte(150) };

    it('T7: la línea de OSM se ve, y sin línea guardada es la de partida, con los codos de su par', async () => {
      await abrir({ muestras: [], osm: OSM, barras: PAR3 });

      expect(mapa.props.osm).toEqual(OSM.puntos);
      expect(mapa.props.linea).toEqual({ tee: T, bends: [], greenCenter: alNorte(150) });
    });

    it('T7: con línea guardada, se parte de la guardada', async () => {
      const guardada = { tee: alNorte(5), bends: [], greenCenter: alNorte(150) };
      await abrir({ muestras: [], osm: OSM, guardada, barras: PAR3 });

      expect(mapa.props.linea).toEqual(guardada);
    });

    it('T7: una línea de OSM sin green se ve, pero no es la de partida', async () => {
      await abrir({ muestras: [], osm: { puntos: OSM.puntos, green: null }, barras: PAR3 });

      expect(mapa.props.osm).toEqual(OSM.puntos);
      expect(mapa.props.linea).toBeNull();
    });

    it('/code-review: «Empezar desde OpenStreetMap» vuelve a la línea de OSM tras moverla', async () => {
      await abrir({ muestras: [], osm: OSM, barras: PAR3 });
      const deOsm = mapa.props.linea;
      act(() => mapa.props.onLinea({ tee: alNorte(10), bends: [], greenCenter: alNorte(150) }));

      fireEvent.click(screen.getByRole('button', { name: 'holeReviews.useOsm' }));

      expect(mapa.props.linea).toEqual(deOsm);
    });

    it('/code-review: sin línea de OSM con green, no hay «Empezar desde OpenStreetMap»', async () => {
      await abrir({ muestras: [], osm: { puntos: OSM.puntos, green: null }, barras: PAR3 });

      expect(screen.queryByRole('button', { name: 'holeReviews.useOsm' })).toBeNull();
    });

    it('T9: reabrir un hoyo guardado cierra la revisión con el cambio', async () => {
      const onCerrar = await abrir({ guardada: { tee: T, bends: [], greenCenter: alNorte(300) } });
      casos.reabrir.mockResolvedValue(undefined);

      fireEvent.click(screen.getByRole('button', { name: 'holeReviews.reopen' }));

      await waitFor(() => expect(onCerrar).toHaveBeenCalledWith({ cambiado: true }));
      expect(avisos.success).toHaveBeenCalledWith('holeReviews.reopenedOk {"numero":1}');
    });
  });
  });
});


describe('RevisarHoyo — reportes (entrega 7)', () => {
  const REPORTE = { id: 'r-1', motivo: 'WRONG_LINE', tee: alNorte(20), bends: [alNorte(150)], greenCenter: alNorte(310), llego: '2026-10-18' };

  beforeEach(() => {
    for (const f of Object.values(casos)) f.mockReset();
    avisos.success.mockReset();
    avisos.error.mockReset();
    mapa.props = null;
  });

  describe('V: con qué línea abre un hoyo reportado (18 oct)', () => {
    const OSM = { puntos: [T, alNorte(80), alNorte(148)], green: alNorte(150) };
    const PAR3 = [{ color: 'YELLOW', gender: 'MALE', identifier: null, par: 3, metros: 150 }];
    const SEGUNDO = { ...REPORTE, id: 'r-2', tee: alNorte(40), bends: [], greenCenter: alNorte(320), llego: '2026-10-18' };
    const deLaLinea = (r) => ({ tee: r.tee, bends: r.bends, greenCenter: r.greenCenter });

    it('V1: sin guardada, abre con la línea del primer reporte (solo reportes)', async () => {
      await abrir({ muestras: [], reportes: [REPORTE, SEGUNDO] });

      expect(mapa.props.linea).toEqual(deLaLinea(REPORTE));
    });

    it('V1: el primer reporte gana a la línea de OSM', async () => {
      await abrir({ muestras: [], osm: OSM, barras: PAR3, reportes: [REPORTE] });

      expect(mapa.props.linea).toEqual(deLaLinea(REPORTE));
    });

    it('V1: el primer reporte gana a las muestras', async () => {
      await abrir({ reportes: [REPORTE] });

      expect(mapa.props.linea).toEqual(deLaLinea(REPORTE));
    });

    it('V1: un primer reporte sin salida no cuenta: se parte del siguiente (/code-review)', async () => {
      await abrir({ muestras: [], osm: OSM, barras: PAR3, reportes: [{ ...REPORTE, id: 'r-0', tee: null }, SEGUNDO] });

      expect(mapa.props.linea).toEqual(deLaLinea(SEGUNDO));
    });

    it('V2: con línea guardada, abre con ella aunque haya reportes', async () => {
      const guardada = { tee: alNorte(10), bends: [], greenCenter: alNorte(300) };
      await abrir({ guardada, osm: OSM, barras: PAR3, reportes: [REPORTE] });

      expect(mapa.props.linea).toEqual(guardada);
    });

    it('V3: sin reportes, como antes: OSM y, sin OSM, la primera muestra completa', async () => {
      await abrir({ reportes: [] });
      expect(mapa.props.linea).toEqual({ tee: T, bends: [], greenCenter: alNorte(300) });
    });

    it('V5: un primer reporte sin codos abre con su salida y su green', async () => {
      await abrir({ muestras: [], reportes: [SEGUNDO, REPORTE] });

      expect(mapa.props.linea).toEqual({ tee: alNorte(40), bends: [], greenCenter: alNorte(320) });
    });

    it('V4: descartar el primer reporte sin haber tocado su línea pasa a la del siguiente (Agustín, 18 oct)', async () => {
      await abrir({ muestras: [], reportes: [REPORTE, SEGUNDO] });
      casos.descartar.mockResolvedValue(undefined);
      // Tras descartar, el hoyo vuelve sin ese reporte: el primero pasa a ser otro
      casos.campo.mockResolvedValue(campo({ muestras: [], reportes: [SEGUNDO] }));
      const seccion = screen.getByRole('region', { name: 'holeReviews.reportsTitle' });

      fireEvent.click(within(seccion).getAllByRole('button', { name: 'holeReviews.discard' })[0]);
      fireEvent.click(within(seccion).getByRole('button', { name: 'holeReviews.confirmDiscard' }));

      await waitFor(() => expect(avisos.success).toHaveBeenCalledWith('holeReviews.discardedOk'));
      await waitFor(() => expect(casos.campo).toHaveBeenCalledTimes(2));
      expect(screen.getAllByRole('button', { name: 'holeReviews.discard' })).toHaveLength(1);
      expect(mapa.props.linea).toEqual(deLaLinea(SEGUNDO));
    });

    it('V4: descartado el último reporte sin tocar su línea, se parte de OSM', async () => {
      await abrir({ muestras: [], osm: OSM, barras: PAR3, reportes: [] });
      const deOsm = mapa.props.linea;
      cleanup();
      await abrir({ muestras: [], osm: OSM, barras: PAR3, reportes: [REPORTE] });
      casos.descartar.mockResolvedValue(undefined);
      casos.campo.mockResolvedValue(campo({ muestras: [], osm: OSM, barras: PAR3, reportes: [] }));
      const seccion = screen.getByRole('region', { name: 'holeReviews.reportsTitle' });

      fireEvent.click(within(seccion).getByRole('button', { name: 'holeReviews.discard' }));
      fireEvent.click(within(seccion).getByRole('button', { name: 'holeReviews.confirmDiscard' }));

      await waitFor(() => expect(mapa.props.linea).toEqual(deOsm));
      expect(deOsm).not.toBeNull();
    });

    it('V4: borrar sin tocarla la muestra de la que se partía pasa a la siguiente', async () => {
      const otra = { ...COMPLETA, id: 's-3', tee: alNorte(30), greenCenter: alNorte(330) };
      await abrir({ muestras: [COMPLETA, otra], reportes: [] });
      casos.borrar.mockResolvedValue(undefined);
      casos.campo.mockResolvedValue(campo({ muestras: [otra], reportes: [] }));

      fireEvent.click(screen.getAllByRole('button', { name: 'holeReviews.delete' })[0]);
      fireEvent.click(screen.getByRole('button', { name: 'holeReviews.confirmDelete' }));

      await waitFor(() => expect(mapa.props.linea).toEqual({ tee: alNorte(30), bends: [], greenCenter: alNorte(330) }));
    });

    it('V4: con la línea movida, descartar el reporte la conserva', async () => {
      await abrir({ muestras: [], reportes: [REPORTE, SEGUNDO] });
      const movida = { tee: alNorte(5), bends: [], greenCenter: alNorte(300) };
      act(() => mapa.props.onLinea(movida));
      casos.descartar.mockResolvedValue(undefined);
      casos.campo.mockResolvedValue(campo({ muestras: [], reportes: [SEGUNDO] }));
      const seccion = screen.getByRole('region', { name: 'holeReviews.reportsTitle' });

      fireEvent.click(within(seccion).getAllByRole('button', { name: 'holeReviews.discard' })[0]);
      fireEvent.click(within(seccion).getByRole('button', { name: 'holeReviews.confirmDiscard' }));

      await waitFor(() => expect(casos.campo).toHaveBeenCalledTimes(2));
      expect(mapa.props.linea).toEqual(movida);
    });
  });

  it('Q3: cada reporte con su motivo y su día', async () => {
    await abrir({ reportes: [REPORTE, { ...REPORTE, id: 'r-2', motivo: 'HOLE_CHANGED' }] });

    const seccion = screen.getByRole('region', { name: 'holeReviews.reportsTitle' });
    expect(seccion).toHaveTextContent('holeReviews.reasons.WRONG_LINE');
    expect(seccion).toHaveTextContent('holeReviews.reasons.HOLE_CHANGED');
    expect(seccion).toHaveTextContent('2026');
  });

  it('Q5: pedir descartar cierra la confirmación de borrar una muestra, y al revés', async () => {
    await abrir({ reportes: [REPORTE] });
    const seccion = screen.getByRole('region', { name: 'holeReviews.reportsTitle' });
    fireEvent.click(screen.getAllByRole('button', { name: 'holeReviews.delete' })[0]);
    expect(screen.getByRole('button', { name: 'holeReviews.confirmDelete' })).toBeInTheDocument();

    fireEvent.click(within(seccion).getByRole('button', { name: 'holeReviews.discard' }));
    expect(screen.queryByRole('button', { name: 'holeReviews.confirmDelete' })).toBeNull();
    fireEvent.click(screen.getAllByRole('button', { name: 'holeReviews.delete' })[0]);

    expect(within(seccion).queryByRole('button', { name: 'holeReviews.confirmDiscard' })).toBeNull();
  });

  it('Q5: tocar un reporte cierra una confirmación de descartar abierta', async () => {
    await abrir({ reportes: [REPORTE, { ...REPORTE, id: 'r-2' }] });
    const seccion = screen.getByRole('region', { name: 'holeReviews.reportsTitle' });
    fireEvent.click(within(seccion).getAllByRole('button', { name: 'holeReviews.discard' })[0]);

    fireEvent.click(filas(seccion)[1]);

    expect(within(seccion).queryByRole('button', { name: 'holeReviews.confirmDiscard' })).toBeNull();
  });

  it('Q5: tocar una muestra también cierra la confirmación de descartar (CodeRabbit)', async () => {
    await abrir({ reportes: [REPORTE] });
    const seccion = screen.getByRole('region', { name: 'holeReviews.reportsTitle' });
    fireEvent.click(within(seccion).getByRole('button', { name: 'holeReviews.discard' }));

    const deLasMuestras = filas().filter((b) => !seccion.contains(b));
    fireEvent.click(deLasMuestras[0]);

    expect(within(seccion).queryByRole('button', { name: 'holeReviews.confirmDiscard' })).toBeNull();
  });

  it('Q5: tocar una muestra cierra la confirmación de borrarla', async () => {
    await abrir({ reportes: [REPORTE] });
    fireEvent.click(screen.getAllByRole('button', { name: 'holeReviews.delete' })[0]);
    const seccion = screen.getByRole('region', { name: 'holeReviews.reportsTitle' });

    fireEvent.click(filas().filter((b) => !seccion.contains(b))[0]);

    expect(screen.queryByRole('button', { name: 'holeReviews.confirmDelete' })).toBeNull();
  });

  it('Q3: sin reportes, no hay sección', async () => {
    await abrir({ reportes: [] });

    expect(screen.queryByRole('region', { name: 'holeReviews.reportsTitle' })).toBeNull();
  });

  it('Q4: tocar un reporte pone su línea', async () => {
    await abrir({ reportes: [REPORTE] });
    const seccion = screen.getByRole('region', { name: 'holeReviews.reportsTitle' });

    fireEvent.click(filas(seccion)[0]);

    expect(mapa.props.linea).toEqual({ tee: alNorte(20), bends: [alNorte(150)], greenCenter: alNorte(310) });
  });

  it('Q5: «Descartar» pide confirmar; al confirmar se descarta y la línea que se edita se queda', async () => {
    await abrir({ reportes: [REPORTE] });
    act(() => mapa.props.onLinea({ tee: alNorte(5), bends: [], greenCenter: alNorte(300) }));
    casos.descartar.mockResolvedValue(undefined);
    const seccion = screen.getByRole('region', { name: 'holeReviews.reportsTitle' });

    fireEvent.click(within(seccion).getByRole('button', { name: 'holeReviews.discard' }));
    expect(casos.descartar).not.toHaveBeenCalled();
    fireEvent.click(within(seccion).getByRole('button', { name: 'holeReviews.confirmDiscard' }));

    await waitFor(() => expect(casos.descartar).toHaveBeenCalledWith('gc-1', 'r-1'));
    await waitFor(() => expect(avisos.success).toHaveBeenCalledWith('holeReviews.discardedOk'));
    expect(mapa.props.linea).toEqual({ tee: alNorte(5), bends: [], greenCenter: alNorte(300) });
  });
  describe('S: seleccionar = editar', () => {
    const OTRA = { ...COMPLETA, id: 's-3', tee: alNorte(30), greenCenter: alNorte(330) };

    it('S1: en el mapa, los reportes y las muestras', async () => {
      await abrir({ reportes: [REPORTE] });

      expect(mapa.props.muestras).toEqual([REPORTE, COMPLETA, SOLO_GREEN]);
      expect(mapa.props.destacado).toBeNull();
    });

    it('S2: partiendo de la primera completa, su fila sale seleccionada', async () => {
      await abrir();

      expect(seleccionadas()).toHaveLength(1);
      expect(seleccionadas()[0]).toBe(filas()[0]);
    });

    it('S2: partiendo del primer reporte, su fila', async () => {
      await abrir({ reportes: [REPORTE] });
      const seccion = screen.getByRole('region', { name: 'holeReviews.reportsTitle' });

      expect(seleccionadas()).toEqual([filas(seccion)[0]]);
      expect(filas(seccion)[0].closest('li')).toHaveClass('border-red-600');
      expect(filas()[filas().length - 1].closest('li')).not.toHaveClass('border-red-600');
    });

    it('S2: partiendo de la guardada o de OSM, ninguna', async () => {
      await abrir({ guardada: { tee: alNorte(10), bends: [], greenCenter: alNorte(300) } });
      expect(seleccionadas()).toEqual([]);
      cleanup();

      await abrir({ osm: { puntos: [T, alNorte(80), alNorte(148)], green: alNorte(150) } });
      expect(mapa.props.linea.greenCenter).toEqual(alNorte(150));
      expect(seleccionadas()).toEqual([]);
    });

    it('S3/S4/S8: tocar otra fila pone su línea y la selecciona, con borde rojo; ya no hay «Partir de esta»', async () => {
      await abrir({ muestras: [COMPLETA, OTRA] });

      fireEvent.click(filas()[1]);

      expect(mapa.props.linea).toEqual({ tee: alNorte(30), bends: [], greenCenter: alNorte(330) });
      expect(seleccionadas()).toEqual([filas()[1]]);
      expect(filas()[1].closest('li')).toHaveClass('border-red-600');
      expect(filas()[0].closest('li')).not.toHaveClass('border-red-600');
      expect(screen.queryByRole('button', { name: 'holeReviews.useThis' })).toBeNull();
      // Elegida, hay algo que perder al cerrar
      fireEvent.click(screen.getByRole('button', { name: 'holeReviews.close' }));
      expect(screen.getByText('holeReviews.unsaved')).toBeInTheDocument();
    });

    it('S5: tocar la fila seleccionada con la línea movida la devuelve a la original', async () => {
      await abrir();
      act(() => mapa.props.onLinea({ tee: alNorte(5), bends: [], greenCenter: alNorte(300) }));

      fireEvent.click(filas()[0]);

      expect(mapa.props.linea).toEqual({ tee: T, bends: [], greenCenter: alNorte(300) });
      expect(seleccionadas()).toEqual([filas()[0]]);
      fireEvent.click(screen.getByRole('button', { name: 'holeReviews.close' }));
      expect(screen.getByText('holeReviews.unsaved')).toBeInTheDocument();
    });

    it('S5b: sin haber movido nada, tocarla no cambia nada', async () => {
      await abrir();

      fireEvent.click(filas()[0]);

      fireEvent.click(screen.getByRole('button', { name: 'holeReviews.close' }));
      expect(screen.queryByText('holeReviews.unsaved')).toBeNull();
    });

    it('S5c: tocar el solo green seleccionado no cambia la línea', async () => {
      await abrir();
      fireEvent.click(filas()[1]);
      const movida = { tee: alNorte(5), bends: [], greenCenter: alNorte(300) };
      act(() => mapa.props.onLinea(movida));

      fireEvent.click(filas()[1]);

      expect(mapa.props.linea).toEqual(movida);
      expect(mapa.props.destacado).toEqual(SOLO_GREEN.greenCenter);
    });

    it('M1/M5: elegir una muestra en el mapa es como tocar su fila, y la lista la enseña', async () => {
      const verla = vi.fn();
      globalThis.Element.prototype.scrollIntoView = verla;
      await abrir({ muestras: [COMPLETA, OTRA] });

      act(() => mapa.props.onElegir('s-3'));

      expect(mapa.props.linea).toEqual({ tee: alNorte(30), bends: [], greenCenter: alNorte(330) });
      expect(seleccionadas()).toEqual([filas()[1]]);
      expect(verla).toHaveBeenCalledTimes(1);
      expect(verla.mock.contexts[0]).toBe(filas()[1].closest('li'));
      delete globalThis.Element.prototype.scrollIntoView;
    });

    it('M2: un solo green en el mapa, como su fila', async () => {
      await abrir();

      act(() => mapa.props.onElegir('s-2'));

      expect(mapa.props.destacado).toEqual(SOLO_GREEN.greenCenter);
    });

    it('M1: un reporte en el mapa, como su fila', async () => {
      await abrir({ reportes: [REPORTE, { ...REPORTE, id: 'r-2', tee: alNorte(40) }] });

      act(() => mapa.props.onElegir('r-2'));

      expect(mapa.props.linea.tee).toEqual(alNorte(40));
    });

    it('M6: elegir en el mapa la ya seleccionada no deshace lo movido', async () => {
      await abrir();
      const movida = { tee: alNorte(5), bends: [], greenCenter: alNorte(300) };
      act(() => mapa.props.onLinea(movida));

      act(() => mapa.props.onElegir('s-1'));

      expect(mapa.props.linea).toEqual(movida);
    });

    it('M8/M9: marcando o guardando, el mapa no elige', async () => {
      await abrir();
      expect(mapa.props.onElegir).toBeInstanceOf(Function);

      fireEvent.click(screen.getByRole('button', { name: 'holeReviews.markFromScratch' }));
      expect(mapa.props.onElegir).toBeUndefined();
      fireEvent.click(screen.getByRole('button', { name: 'holeReviews.cancelMarking' }));
      casos.guardar.mockReturnValue(new Promise(() => {}));
      fireEvent.click(screen.getByRole('button', { name: 'holeReviews.save' }));
      expect(mapa.props.onElegir).toBeUndefined();
    });

    it('S6: tocar un solo green lo pone en rojo y lo selecciona; la línea no cambia', async () => {
      await abrir();
      const antes = mapa.props.linea;

      fireEvent.click(filas()[1]);

      expect(mapa.props.destacado).toEqual(SOLO_GREEN.greenCenter);
      expect(seleccionadas()).toEqual([filas()[1]]);
      expect(mapa.props.linea).toEqual(antes);
      fireEvent.click(filas()[0]);
      expect(mapa.props.destacado).toBeNull();
    });

    it('S6: tocar un solo green cierra una confirmación abierta, como cualquier fila', async () => {
      await abrir({ reportes: [REPORTE] });
      fireEvent.click(screen.getAllByRole('button', { name: 'holeReviews.delete' })[0]);
      const seccion = screen.getByRole('region', { name: 'holeReviews.reportsTitle' });

      fireEvent.click(filas().filter((b) => !seccion.contains(b))[1]);

      expect(screen.queryByRole('button', { name: 'holeReviews.confirmDelete' })).toBeNull();
    });

    it('S7: moviendo la línea, la fila sigue seleccionada', async () => {
      await abrir({ muestras: [COMPLETA, OTRA] });
      fireEvent.click(filas()[1]);

      act(() => mapa.props.onLinea({ tee: alNorte(35), bends: [], greenCenter: alNorte(330) }));

      expect(seleccionadas()).toEqual([filas()[1]]);
    });

    it('S11: la línea marcada desde cero no es de ninguna fila', async () => {
      await abrir({ barras: [{ color: 'YELLOW', gender: 'MALE', identifier: null, par: 4, metros: 350 }] });
      expect(seleccionadas()).toHaveLength(1);

      fireEvent.click(screen.getByRole('button', { name: 'holeReviews.markFromScratch' }));
      act(() => mapa.props.onToque(T));
      act(() => mapa.props.onToque(alNorte(300)));

      expect(mapa.props.linea.tee).toEqual(T);
      expect(seleccionadas()).toEqual([]);
    });

    it('S11: con un green suelto, la línea marcada tampoco', async () => {
      await abrir({ muestras: [SOLO_GREEN] });
      fireEvent.click(filas()[0]);

      fireEvent.click(screen.getByRole('button', { name: 'holeReviews.markFromScratch' }));
      act(() => mapa.props.onToque(T));

      expect(mapa.props.linea.greenCenter).toEqual(SOLO_GREEN.greenCenter);
      expect(seleccionadas()).toEqual([]);
      expect(mapa.props.destacado).toBeNull();
    });

    it('S14: «Partir de OSM» quita la selección, y volver a tocar la fila pone su línea', async () => {
      await abrir({ osm: { puntos: [T, alNorte(80), alNorte(148)], green: alNorte(150) }, muestras: [COMPLETA, OTRA] });
      fireEvent.click(filas()[1]);

      fireEvent.click(screen.getByRole('button', { name: 'holeReviews.useOsm' }));
      expect(mapa.props.linea.greenCenter).toEqual(alNorte(150));
      expect(seleccionadas()).toEqual([]);

      fireEvent.click(filas()[1]);
      expect(mapa.props.linea.greenCenter).toEqual(alNorte(330));
    });

    it('S10b: borrando otra fila, el solo green seleccionado sigue en rojo', async () => {
      await abrir({ muestras: [COMPLETA, SOLO_GREEN, OTRA] });
      fireEvent.click(filas()[1]);
      casos.borrar.mockResolvedValue(undefined);
      casos.campo.mockResolvedValue(campo({ muestras: [SOLO_GREEN, OTRA] }));

      fireEvent.click(screen.getAllByRole('button', { name: 'holeReviews.delete' })[0]);
      fireEvent.click(screen.getByRole('button', { name: 'holeReviews.confirmDelete' }));

      await waitFor(() => expect(mapa.props.linea.greenCenter).toEqual(alNorte(330)));
      expect(mapa.props.destacado).toEqual(SOLO_GREEN.greenCenter);
      expect(seleccionadas()).toEqual([filas()[0]]);
    });

    it('S10: «Borrar» va aparte de la fila: pulsarlo no la selecciona', async () => {
      await abrir({ muestras: [COMPLETA, OTRA] });

      const borrar = screen.getAllByRole('button', { name: 'holeReviews.delete' })[1];
      expect(filas()[1]).not.toContainElement(borrar);

      fireEvent.click(borrar);

      expect(seleccionadas()).toEqual([filas()[0]]);
    });

    it('S10: borrada la seleccionada que se eligió, la línea se queda y no hay selección', async () => {
      await abrir({ muestras: [COMPLETA, OTRA] });
      fireEvent.click(filas()[1]);
      casos.borrar.mockResolvedValue(undefined);
      casos.campo.mockResolvedValue(campo({ muestras: [COMPLETA] }));

      fireEvent.click(screen.getAllByRole('button', { name: 'holeReviews.delete' })[1]);
      fireEvent.click(screen.getByRole('button', { name: 'holeReviews.confirmDelete' }));

      await waitFor(() => expect(casos.campo).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(filas()).toHaveLength(1));
      expect(mapa.props.linea.greenCenter).toEqual(alNorte(330));
      expect(seleccionadas()).toEqual([]);
    });

    it('S10: borrada la de partida sin tocar nada, se parte de lo que queda y esa se selecciona', async () => {
      await abrir({ muestras: [COMPLETA, OTRA] });
      casos.borrar.mockResolvedValue(undefined);
      casos.campo.mockResolvedValue(campo({ muestras: [OTRA] }));

      fireEvent.click(screen.getAllByRole('button', { name: 'holeReviews.delete' })[0]);
      fireEvent.click(screen.getByRole('button', { name: 'holeReviews.confirmDelete' }));

      await waitFor(() => expect(mapa.props.linea.greenCenter).toEqual(alNorte(330)));
      expect(seleccionadas()).toEqual([filas()[0]]);
    });

    it('S10: borrado el solo green seleccionado, ya no se pinta', async () => {
      await abrir();
      fireEvent.click(filas()[1]);
      casos.borrar.mockResolvedValue(undefined);
      casos.campo.mockResolvedValue(campo({ muestras: [COMPLETA] }));

      fireEvent.click(screen.getAllByRole('button', { name: 'holeReviews.delete' })[1]);
      fireEvent.click(screen.getByRole('button', { name: 'holeReviews.confirmDelete' }));

      await waitFor(() => expect(filas()).toHaveLength(1));
      expect(mapa.props.destacado).toBeNull();
    });
  });
  // | A1   | al abrir                                  | se pide orientar con la línea de partida             |
  // | A2   | elegir otra fila (o en el mapa)           | se pide orientar                                     |
  // | A3   | un solo green                             | no                                                   |
  // | A4   | marcar desde cero o «Partir de OSM»       | se pide orientar                                     |
  // | A5   | arrastrar la línea                        | no                                                   |
  // | A6   | «Orientar»                                | se pide orientar                                     |
  describe('A: orientar el mapa', () => {
    const OTRA = { ...COMPLETA, id: 's-3', tee: alNorte(30), greenCenter: alNorte(330) };

    it('A1: al abrir se pide orientar, con el par de la barra más larga', async () => {
      await abrir();

      expect(mapa.props.orientar).toBe(1);
      expect(mapa.props.par).toBe(4);
    });

    it('A2/A3/A5: elegir otra fila orienta; un solo green o arrastrar, no', async () => {
      await abrir({ muestras: [COMPLETA, SOLO_GREEN, OTRA] });

      fireEvent.click(filas()[2]);
      expect(mapa.props.orientar).toBe(2);
      fireEvent.click(filas()[1]);
      expect(mapa.props.orientar).toBe(2);
      act(() => mapa.props.onLinea({ tee: alNorte(5), bends: [], greenCenter: alNorte(330) }));
      expect(mapa.props.orientar).toBe(2);
      act(() => mapa.props.onElegir('s-1'));
      expect(mapa.props.orientar).toBe(3);
    });

    it('A5: borrar una fila conservando la línea movida no la reorienta; sin moverla, sí', async () => {
      await abrir({ muestras: [COMPLETA, OTRA] });
      act(() => mapa.props.onLinea({ tee: alNorte(5), bends: [], greenCenter: alNorte(300) }));
      casos.borrar.mockResolvedValue(undefined);
      casos.campo.mockResolvedValue(campo({ muestras: [COMPLETA] }));

      fireEvent.click(screen.getAllByRole('button', { name: 'holeReviews.delete' })[1]);
      fireEvent.click(screen.getByRole('button', { name: 'holeReviews.confirmDelete' }));

      await waitFor(() => expect(casos.campo).toHaveBeenCalledTimes(2));
      expect(mapa.props.orientar).toBe(1);
    });

    it('A4: «Partir de OSM» orienta', async () => {
      await abrir({ osm: { puntos: [T, alNorte(80), alNorte(148)], green: alNorte(150) } });
      const antes = mapa.props.orientar;

      fireEvent.click(screen.getByRole('button', { name: 'holeReviews.useOsm' }));

      expect(mapa.props.orientar).toBe(antes + 1);
    });

    it('A4: marcar desde cero orienta al tener la línea', async () => {
      await abrir({ muestras: [] });
      const antes = mapa.props.orientar;
      fireEvent.click(screen.getByRole('button', { name: 'holeReviews.markFromScratch' }));
      act(() => mapa.props.onToque(T));
      expect(mapa.props.orientar).toBe(antes);

      act(() => mapa.props.onToque(alNorte(300)));

      expect(mapa.props.orientar).toBe(antes + 1);
    });

    it('A6: «Orientar» lo vuelve a orientar', async () => {
      await abrir();

      fireEvent.click(screen.getByRole('button', { name: 'holeReviews.orient' }));

      expect(mapa.props.orientar).toBe(2);
    });

    it('A6: sin línea, «Orientar» no se puede pulsar; y abrir sin línea no pide orientar', async () => {
      await abrir({ muestras: [SOLO_GREEN] });

      expect(screen.getByRole('button', { name: 'holeReviews.orient' })).toBeDisabled();
      expect(mapa.props.orientar).toBe(0);
    });
  });
});

