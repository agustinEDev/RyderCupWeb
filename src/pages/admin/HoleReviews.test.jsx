import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

/**
 * «Hoyos por revisar» del panel de admin (BE #575, 17 oct).
 *
 * | Caso | Qué                                  | Qué se ve                                            |
 * |------|--------------------------------------|------------------------------------------------------|
 * | L1   | cargando / sin nada / falla          | la espera / «nada por revisar» / el fallo y reintentar |
 * | L2   | campos con hoyos                     | cada campo con sus hoyos: cuántas muestras           |
 * | P8   | arriba                               | la explicación: guardar un hoyo lo quita de la lista |
 * | P9   | cada campo                           | su nombre como título y «N hoyos pendientes»         |
 * | P10  | cada hoyo                            | una fila a todo el ancho, de menor a mayor: «Hoyo 7» y «2 muestras» |
 * | P15  | un hoyo pendiente                    | nunca dice «guardado»                                |
 * | L3   | tocar un hoyo                        | se abre su revisión, con el campo y el hoyo         |
 * | L4   | al cerrar la revisión tras un cambio | la lista se vuelve a pedir                           |
 */

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k, o) => (o ? `${k} ${JSON.stringify(o)}` : k) }),
}));

const casos = vi.hoisted(() => ({ lista: vi.fn() }));
vi.mock('../../composition', () => ({ listHoleReviewsUseCase: { execute: casos.lista } }));
const avisos = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('../../utils/toast', () => ({ default: avisos }));

const revision = vi.hoisted(() => ({ props: null }));
vi.mock('../../components/admin/hoyos/RevisarHoyo', () => ({
  default: (props) => {
    revision.props = props;
    return <div data-testid="revisar-hoyo" />;
  },
}));

const { default: HoleReviews } = await import('./HoleReviews');

const LISTA = [
  { golfCourseId: 'gc-1', name: 'Alcanada', holes: [{ holeNumber: 1, samples: 2 }, { holeNumber: 7, samples: 1 }] },
];

describe('HoleReviews', () => {
  beforeEach(() => {
    casos.lista.mockReset();
    revision.props = null;
  });

  it('L1: sin nada por revisar, lo dice', async () => {
    casos.lista.mockResolvedValue([]);

    render(<HoleReviews />);

    expect(await screen.findByText('holeReviews.empty')).toBeInTheDocument();
  });

  it('L1: si falla, lo dice y se puede reintentar', async () => {
    casos.lista.mockRejectedValueOnce(new Error('x'));
    casos.lista.mockResolvedValueOnce(LISTA);

    render(<HoleReviews />);
    fireEvent.click(await screen.findByRole('button', { name: 'holeReviews.retry' }));

    expect(await screen.findByText('Alcanada')).toBeInTheDocument();
  });

  it('L2/P9/P10: cada campo con su título, cuántos hoyos quedan y una fila por hoyo', async () => {
    casos.lista.mockResolvedValue(LISTA);

    render(<HoleReviews />);

    const campo = await screen.findByRole('region', { name: 'Alcanada' });
    expect(within(campo).getByRole('heading', { name: 'Alcanada' })).toBeInTheDocument();
    expect(within(campo).getByText('holeReviews.pendingHoles {"count":2}')).toBeInTheDocument();
    const filas = within(campo).getAllByRole('button');
    expect(filas.map((f) => f.textContent)).toEqual([
      'holeReviews.hole {"numero":1}holeReviews.samples {"count":2}',
      'holeReviews.hole {"numero":7}holeReviews.samples {"count":1}',
    ]);
    // A todo el ancho, una debajo de otra: nada de etiquetas de distintos anchos
    for (const fila of filas) expect(fila).toHaveClass('w-full');
  });

  it('P8: arriba se explica qué es esto y que guardar un hoyo lo quita de aquí', async () => {
    casos.lista.mockResolvedValue(LISTA);

    render(<HoleReviews />);

    expect(await screen.findByText('holeReviews.intro')).toBeInTheDocument();
  });

  it('L3/L4: tocar un hoyo abre su revisión; al cerrarla tras un cambio, la lista se vuelve a pedir', async () => {
    casos.lista.mockResolvedValue(LISTA);
    render(<HoleReviews />);

    fireEvent.click(await screen.findByRole('button', { name: /holeReviews.hole {"numero":1}/ }));

    expect(screen.getByTestId('revisar-hoyo')).toBeInTheDocument();
    expect(revision.props).toMatchObject({ golfCourseId: 'gc-1', nombre: 'Alcanada', numeroDeHoyo: 1 });
    const { act } = await import('react');
    await act(async () => revision.props.onCerrar({ cambiado: true }));
    expect(screen.queryByTestId('revisar-hoyo')).toBeNull();
    expect(casos.lista).toHaveBeenCalledTimes(2);
  });

  it('L4: si la recarga falla, la lista se queda y se avisa', async () => {
    casos.lista.mockResolvedValueOnce(LISTA);
    casos.lista.mockRejectedValueOnce(new Error('x'));
    render(<HoleReviews />);
    fireEvent.click(await screen.findByRole('button', { name: /holeReviews.hole {"numero":1}/ }));

    const { act } = await import('react');
    await act(async () => revision.props.onCerrar({ cambiado: true }));

    expect(screen.getByText('Alcanada')).toBeInTheDocument();
    expect(avisos.error).toHaveBeenCalledWith('holeReviews.error');
  });
  it('P12: el hoyo guardado sale de la lista aunque la recarga falle', async () => {
    casos.lista.mockResolvedValueOnce(LISTA);
    casos.lista.mockRejectedValueOnce(new Error('sin red'));
    render(<HoleReviews />);
    fireEvent.click(await screen.findByRole('button', { name: /holeReviews.hole {"numero":1}/ }));

    const { act } = await import('react');
    await act(async () => revision.props.onCerrar({ cambiado: true, guardado: true }));

    const filas = within(screen.getByRole('region', { name: 'Alcanada' })).getAllByRole('button');
    expect(filas.map((f) => f.textContent)).toEqual([expect.stringContaining('"numero":7')]);
    expect(screen.getByText('holeReviews.pendingHoles {"count":1}')).toBeInTheDocument();
  });

  it('P12: guardado el último hoyo de un campo, el campo desaparece', async () => {
    casos.lista.mockResolvedValueOnce([{ ...LISTA[0], holes: [LISTA[0].holes[0]] }]);
    casos.lista.mockReturnValueOnce(new Promise(() => {}));
    render(<HoleReviews />);
    fireEvent.click(await screen.findByRole('button', { name: /holeReviews.hole {"numero":1}/ }));

    const { act } = await import('react');
    await act(async () => revision.props.onCerrar({ cambiado: true, guardado: true }));

    expect(screen.queryByRole('region', { name: 'Alcanada' })).toBeNull();
  });
  it('CodeRabbit: si dos recargas se cruzan, manda la última que se pidió', async () => {
    let primera;
    casos.lista.mockResolvedValueOnce(LISTA);
    casos.lista.mockReturnValueOnce(new Promise((ok) => { primera = ok; }));
    casos.lista.mockResolvedValueOnce([{ ...LISTA[0], holes: [LISTA[0].holes[1]] }]);
    render(<HoleReviews />);
    const { act } = await import('react');

    fireEvent.click(await screen.findByRole('button', { name: /holeReviews.hole {"numero":1}/ }));
    await act(async () => revision.props.onCerrar({ cambiado: true }));
    fireEvent.click(screen.getByRole('button', { name: /holeReviews.hole {"numero":7}/ }));
    await act(async () => revision.props.onCerrar({ cambiado: true }));
    // La primera recarga llega tarde, con la lista vieja: no pisa la nueva
    await act(async () => primera(LISTA));

    const filas = within(screen.getByRole('region', { name: 'Alcanada' })).getAllByRole('button');
    expect(filas.map((f) => f.textContent)).toEqual([expect.stringContaining('"numero":7')]);
  });

  it('CodeRabbit: un fallo de una recarga vieja tampoco cuenta', async () => {
    let primera;
    casos.lista.mockResolvedValueOnce(LISTA);
    casos.lista.mockReturnValueOnce(new Promise((_, mal) => { primera = mal; }));
    casos.lista.mockResolvedValueOnce(LISTA);
    render(<HoleReviews />);
    const { act } = await import('react');

    fireEvent.click(await screen.findByRole('button', { name: /holeReviews.hole {"numero":1}/ }));
    await act(async () => revision.props.onCerrar({ cambiado: true }));
    fireEvent.click(screen.getByRole('button', { name: /holeReviews.hole {"numero":1}/ }));
    await act(async () => revision.props.onCerrar({ cambiado: true }));
    avisos.error.mockReset();
    await act(async () => primera(new Error('tarde')));

    expect(avisos.error).not.toHaveBeenCalled();
  });
});
