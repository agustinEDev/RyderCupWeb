import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
