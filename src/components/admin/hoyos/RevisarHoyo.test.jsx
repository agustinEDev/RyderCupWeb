import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';

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
 */

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k, o) => (o ? `${k} ${JSON.stringify(o)}` : k) }),
}));
const avisos = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('../../../utils/toast', () => ({ default: avisos }));

const casos = vi.hoisted(() => ({ campo: vi.fn(), guardar: vi.fn(), reabrir: vi.fn(), borrar: vi.fn() }));
vi.mock('../../../composition', () => ({
  getHoleReviewUseCase: { execute: casos.campo },
  saveHoleLineUseCase: { execute: casos.guardar },
  reopenHoleUseCase: { execute: casos.reabrir },
  deleteHoleSampleUseCase: { execute: casos.borrar },
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
const COMPLETA = { id: 's-1', barra: { color: 'YELLOW', gender: 'MALE' }, tee: T, bends: [], greenCenter: alNorte(300), llego: '2026-10-17' };
const SOLO_GREEN = { id: 's-2', barra: { color: 'RED', gender: 'FEMALE' }, tee: null, bends: [], greenCenter: alNorte(305), llego: '2026-10-17' };
const campo = (hoyo) => ({ golfCourseId: 'gc-1', name: 'Alcanada', holes: [{ holeNumber: 1, guardada: null, muestras: [COMPLETA, SOLO_GREEN], barras: [{ color: 'YELLOW', gender: 'MALE', identifier: null, par: 4, metros: 350 }], ...hoyo }] });

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

  it('R2: cada muestra con su barra, su día y lo que mide; la tarjeta, en una línea', async () => {
    await abrir();

    expect(screen.getByText(/holeReviews.metres {"metros":300}/)).toBeInTheDocument();
    expect(screen.getByText(/holeReviews.greenOnly/)).toBeInTheDocument();
    expect(screen.getByText('holeReviews.cardSame {"par":"4","metros":350}')).toBeInTheDocument();
  });

  it('R3/R4: partir de otra muestra, y lo que mide sigue a la línea', async () => {
    const otra = { ...COMPLETA, id: 's-3', greenCenter: alNorte(320) };
    await abrir({ muestras: [COMPLETA, otra] });

    fireEvent.click(screen.getAllByRole('button', { name: 'holeReviews.useThis' })[1]);
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
    expect(screen.getByRole('button', { name: 'holeReviews.useThis' })).toBeDisabled();
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
        for (const b of screen.getAllByRole('button', { name: 'holeReviews.useThis' })) expect(b).toBeDisabled();
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
  });
});
