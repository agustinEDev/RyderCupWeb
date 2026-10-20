import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HandicapRequestModal from './HandicapRequestModal';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (clave, valores) => (valores ? `${clave} ${Object.values(valores).join(' ')}` : clave),
  }),
}));

vi.mock('../../composition', () => ({
  updateRfegHandicapUseCase: { execute: vi.fn() },
  updateManualHandicapUseCase: { execute: vi.fn() },
}));

vi.mock('../../utils/toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

/**
 * El modal se abre por dos motivos distintos, y decía lo mismo en los dos
 * (FE #677): «Tu perfil no tiene hándicap configurado» a quien sí tenía uno y
 * solo no se le había podido actualizar hoy.
 */
describe('HandicapRequestModal · el texto dice por qué se abre (FE #677)', () => {
  const abrir = (props) =>
    render(
      <HandicapRequestModal
        isOpen
        user={{ id: 'u-1', country_code: 'ES' }}
        onClose={() => {}}
        onSaved={() => {}}
        {...props}
      />
    );

  it('M1: sin hándicap, dice que no lo tiene', () => {
    abrir({ handicapActual: null });

    expect(screen.getByText('handicapModal.subtitle')).toBeInTheDocument();
    expect(screen.queryByText(/handicapModal\.subtitleStale/)).not.toBeInTheDocument();
  });

  it('M2: con uno guardado, dice cuál es y que hoy no se ha podido actualizar', () => {
    abrir({ handicapActual: 18 });

    expect(screen.getByText('handicapModal.subtitleStale 18.0')).toBeInTheDocument();
    expect(screen.queryByText('handicapModal.subtitle')).not.toBeInTheDocument();
  });
});

/**
 * Auditoría legal del 20 oct 2026 (F4): el hándicap que se trae de la RFEG dice
 * de dónde sale. El que se introduce a mano, no.
 */
describe('HandicapRequestModal · fuente del hándicap (F4)', () => {
  const abrir = (user) =>
    render(<HandicapRequestModal isOpen user={user} onClose={() => {}} onSaved={() => {}} />);

  it('F4: en la pestaña de la RFEG se cita a la federación, con su enlace', () => {
    abrir({ id: 'u-1', country_code: 'ES' });

    expect(screen.getByText(/source\.prefix/)).toBeInTheDocument();
    const enlace = screen.getByRole('link', { name: 'source.rfegName' });
    expect(enlace).toHaveAttribute('href', 'https://www.rfegolf.es');
    expect(enlace).toHaveAttribute('target', '_blank');
  });

  it('F4: en la manual, no', () => {
    abrir({ id: 'u-1', country_code: 'ES' });

    fireEvent.click(screen.getByText('handicapModal.manualTab'));

    expect(screen.queryByRole('link', { name: 'source.rfegName' })).toBeNull();
  });

  it('F4: sin la RFEG disponible (no español), no', () => {
    abrir({ id: 'u-1', country_code: 'FR' });

    expect(screen.queryByRole('link', { name: 'source.rfegName' })).toBeNull();
  });
});
