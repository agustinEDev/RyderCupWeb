import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

/**
 * «Hoyos por revisar» del panel de admin (BE #575, 17 oct).
 *
 * | Caso | Qué                                  | Qué se ve                                            |
 * |------|--------------------------------------|------------------------------------------------------|
 * | L1   | cargando / sin nada / falla          | la espera / «nada por revisar» / el fallo y reintentar |
 * | L2   | campos con hoyos                     | cada campo con sus hoyos: cuántas muestras y si está guardado |
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
  { golfCourseId: 'gc-1', name: 'Alcanada', holes: [{ holeNumber: 1, samples: 2, saved: false }, { holeNumber: 7, samples: 0, saved: true }] },
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

  it('L2: cada campo con sus hoyos: cuántas muestras y si está guardado', async () => {
    casos.lista.mockResolvedValue(LISTA);

    render(<HoleReviews />);

    expect(await screen.findByText('Alcanada')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /holeReviews.hole {"numero":1}.*holeReviews.samples {"count":2}/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /holeReviews.hole {"numero":7}.*holeReviews.saved/ })).toBeInTheDocument();
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
});
