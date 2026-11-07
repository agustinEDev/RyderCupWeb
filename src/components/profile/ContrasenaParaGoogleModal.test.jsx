import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ContrasenaParaGoogleModal from './ContrasenaParaGoogleModal';

/**
 * La contraseña antes de vincular Google (RyderCupAm #753).
 *
 *   M1 sin escribir nada no se puede continuar
 *   M2 al continuar, se comprueba la contraseña escrita
 *   M3 si falla, dice por qué y deja reintentar
 *   M4 mientras comprueba, el botón lo dice y no se envía dos veces (tampoco con Intro)
 *   M5 de un modal se sale siempre: «Cancelar» cierra y olvida lo escrito
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (clave) => clave }),
}));

const abre = (alConfirmar = vi.fn().mockResolvedValue(null), onClose = vi.fn()) => {
  render(<ContrasenaParaGoogleModal isOpen onClose={onClose} alConfirmar={alConfirmar} />);
  return { alConfirmar, onClose };
};
const escribe = (texto) =>
  fireEvent.change(screen.getByLabelText('edit.linkedAccounts.currentPassword'), {
    target: { value: texto },
  });
const continuar = () => screen.getByRole('button', { name: /edit\.linkedAccounts\.(continue|checking)/ });

describe('ContrasenaParaGoogleModal', () => {
  it('M1: sin contraseña, no se puede continuar', () => {
    abre();
    expect(continuar()).toBeDisabled();
  });

  it('M2: comprueba la contraseña escrita', async () => {
    const { alConfirmar } = abre();
    escribe('Actual123!');

    fireEvent.click(continuar());

    await waitFor(() => expect(alConfirmar).toHaveBeenCalledWith('Actual123!'));
  });

  it('M3: si falla, dice por qué y deja reintentar', async () => {
    const alConfirmar = vi.fn().mockResolvedValue('edit.linkedAccounts.wrongPassword');
    abre(alConfirmar);
    escribe('Mala123!');

    fireEvent.click(continuar());

    expect(await screen.findByRole('alert')).toHaveTextContent('edit.linkedAccounts.wrongPassword');
    expect(continuar()).not.toBeDisabled();
  });

  it('M4: mientras comprueba, lo dice y no envía dos veces', async () => {
    const alConfirmar = vi.fn(() => new Promise(() => {}));
    abre(alConfirmar);
    escribe('Actual123!');

    fireEvent.click(continuar());
    fireEvent.click(continuar());

    expect(await screen.findByRole('button', { name: 'edit.linkedAccounts.checking' })).toBeDisabled();
    expect(alConfirmar).toHaveBeenCalledTimes(1);
  });

  it('M4b: un segundo envío del formulario (Intro) mientras comprueba no sale', async () => {
    const alConfirmar = vi.fn(() => new Promise(() => {}));
    abre(alConfirmar);
    escribe('Actual123!');
    const formulario = screen.getByLabelText('edit.linkedAccounts.currentPassword').closest('form');

    fireEvent.submit(formulario);
    fireEvent.submit(formulario);

    await waitFor(() => expect(alConfirmar).toHaveBeenCalledTimes(1));
  });

  it('M5: «Cancelar» cierra, también mientras comprueba', () => {
    const { onClose } = abre(vi.fn(() => new Promise(() => {})));
    escribe('Actual123!');
    fireEvent.click(continuar());

    fireEvent.click(screen.getByRole('button', { name: 'edit.linkedAccounts.cancel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
