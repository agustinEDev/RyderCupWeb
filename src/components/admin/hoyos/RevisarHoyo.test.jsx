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
 * | R5   | «Guardar línea»                           | se guarda la línea, se recarga y al cerrar avisa del cambio |
 * | R5   | si falla                                  | un aviso, y nada cambia                               |
 * | R6   | «Reabrir hoyo» (solo si está guardado)    | se quita la línea                                     |
 * | R7   | «Borrar» una muestra                      | pide confirmar; al confirmar, se borra                |
 * | R8   | «Cerrar» sin cambios                      | avisa sin cambio                                      |
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

  it('R2: cada muestra con su barra, su día y lo que mide; la tarjeta de cada barra', async () => {
    await abrir();

    expect(screen.getByText(/holeReviews.metres {"metros":300}/)).toBeInTheDocument();
    expect(screen.getByText(/holeReviews.greenOnly/)).toBeInTheDocument();
    expect(screen.getByText(/holeReviews.card {"par":4,"metros":350}/)).toBeInTheDocument();
  });

  it('R3/R4: partir de otra muestra, y lo que mide sigue a la línea', async () => {
    const otra = { ...COMPLETA, id: 's-3', greenCenter: alNorte(320) };
    await abrir({ muestras: [COMPLETA, otra] });

    fireEvent.click(screen.getAllByRole('button', { name: 'holeReviews.useThis' })[1]);
    expect(mapa.props.linea.greenCenter).toEqual(alNorte(320));

    act(() => mapa.props.onLinea({ tee: T, bends: [], greenCenter: alNorte(340) }));
    expect(screen.getByTestId('lo-que-mide')).toHaveTextContent('holeReviews.lineMetres {"metros":340}');
  });

  it('R5: guardar la línea, recargar y avisar del cambio al cerrar', async () => {
    const onCerrar = await abrir();
    casos.guardar.mockResolvedValue(undefined);

    fireEvent.click(screen.getByRole('button', { name: 'holeReviews.save' }));

    await waitFor(() => expect(casos.guardar).toHaveBeenCalledWith('gc-1', 1, { tee: T, bends: [], greenCenter: alNorte(300) }));
    expect(avisos.success).toHaveBeenCalled();
    await waitFor(() => expect(casos.campo).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole('button', { name: 'holeReviews.close' }));
    expect(onCerrar).toHaveBeenCalledWith({ cambiado: true });
  });

  it('R5: si guardar falla, un aviso y nada cambia', async () => {
    const onCerrar = await abrir();
    casos.guardar.mockRejectedValue(Object.assign(new Error('x'), { errorCode: 'INVALID_HOLE_LINE' }));

    fireEvent.click(screen.getByRole('button', { name: 'holeReviews.save' }));

    await waitFor(() => expect(avisos.error).toHaveBeenCalledWith('holeReviews.invalidLine'));
    fireEvent.click(screen.getByRole('button', { name: 'holeReviews.close' }));
    expect(onCerrar).toHaveBeenCalledWith({ cambiado: false });
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

  it('R5: tras guardar, la línea es la guardada (la de la recarga)', async () => {
    await abrir();
    const guardada = { tee: alNorte(5), bends: [], greenCenter: alNorte(300) };
    casos.guardar.mockResolvedValue(undefined);
    casos.campo.mockResolvedValue(campo({ guardada }));

    fireEvent.click(screen.getByRole('button', { name: 'holeReviews.save' }));

    await waitFor(() => expect(mapa.props.guardada).toEqual(guardada));
    expect(mapa.props.linea).toEqual(guardada);
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

  it('R11: una tarjeta sin metros dice «—»; el día, en el formato del idioma', async () => {
    await abrir({ barras: [{ color: 'YELLOW', gender: 'MALE', identifier: null, par: 4, metros: null }] });

    expect(screen.getByText(/holeReviews.cardNoMetres {"par":4}/)).toBeInTheDocument();
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
});
