import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ContrasenaParaGoogleModal from './ContrasenaParaGoogleModal';

/**
 * La contraseña antes de vincular Google (RyderCupAm #753).
 *
 *   M1 sin escribir nada no se puede continuar
 *   M2 al continuar, se comprueba la contraseña escrita
 *   M3 si falla, dice por qué y deja reintentar
 *   M4 mientras comprueba, el botón lo dice y no se envía dos veces (tampoco con Intro)
 *   M5 de un modal se sale siempre: «Cancelar» cierra y olvida lo escrito
 *   M6 si la comprobación lanza, deja reintentar con un error general
 *   M7 la respuesta que llega tras cancelar no deja un error al volver a abrir
 *   M8 al escribir otra vez, el error se borra
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

  it('M6: si la comprobación lanza, deja reintentar con un error general', async () => {
    abre(vi.fn().mockRejectedValue(new Error('red')));
    escribe('Actual123!');

    fireEvent.click(continuar());

    expect(await screen.findByRole('alert')).toHaveTextContent('edit.linkedAccounts.passwordCheckFailed');
    expect(continuar()).not.toBeDisabled();
  });

  it('M7: lo que responde tras cancelar no aparece al volver a abrir', async () => {
    let suelta;
    const alConfirmar = vi.fn(() => new Promise((r) => { suelta = r; }));
    const onClose = vi.fn();
    const { rerender } = render(<ContrasenaParaGoogleModal isOpen onClose={onClose} alConfirmar={alConfirmar} />);
    escribe('Actual123!');
    fireEvent.click(continuar());
    fireEvent.click(screen.getByRole('button', { name: 'edit.linkedAccounts.cancel' }));
    rerender(<ContrasenaParaGoogleModal isOpen={false} onClose={onClose} alConfirmar={alConfirmar} />);

    await act(async () => suelta('edit.linkedAccounts.wrongPassword'));
    rerender(<ContrasenaParaGoogleModal isOpen onClose={onClose} alConfirmar={alConfirmar} />);

    expect(screen.queryByRole('alert')).toBeNull();
    escribe('Otra123!');
    expect(continuar()).not.toBeDisabled();
  });

  it('M8: al escribir otra vez, el error se borra', async () => {
    abre(vi.fn().mockResolvedValue('edit.linkedAccounts.wrongPassword'));
    escribe('Mala123!');
    fireEvent.click(continuar());
    await screen.findByRole('alert');

    escribe('Otra123!');

    expect(screen.queryByRole('alert')).toBeNull();
  });
});

/**
 * Para desvincular (tabla D aprobada por Agustín el 8 nov 2026):
 *   MD1 su texto y su botón («Desvincular»)
 *   MD2 si va bien, se cierra y olvida lo escrito (la página se queda)
 *   MD3 si falla, dice por qué en la ventana, como al vincular
 *   MD4 para vincular, si va bien, NO se cierra (la página se va a Google)
 */
describe('ContrasenaParaGoogleModal · para desvincular', () => {
  const abrePara = (para, alConfirmar = vi.fn().mockResolvedValue(null), onClose = vi.fn()) => {
    render(
      <ContrasenaParaGoogleModal isOpen onClose={onClose} alConfirmar={alConfirmar} para={para} />
    );
    return { alConfirmar, onClose };
  };

  it('MD1: su explicación y su botón', () => {
    abrePara('desvincular');

    expect(screen.getByText('edit.linkedAccounts.unlinkPasswordExplanation')).toBeInTheDocument();
    expect(screen.queryByText('edit.linkedAccounts.passwordExplanation')).toBeNull();
    expect(screen.getByRole('button', { name: 'edit.linkedAccounts.unlink' })).toBeInTheDocument();
  });

  it('MD2: si va bien, se cierra', async () => {
    const { onClose } = abrePara('desvincular');
    escribe('Actual123!');

    fireEvent.click(screen.getByRole('button', { name: 'edit.linkedAccounts.unlink' }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('MD3: si falla, lo dice en la ventana y no se cierra', async () => {
    const alConfirmar = vi.fn().mockResolvedValue('edit.linkedAccounts.reauthExpired');
    const { onClose } = abrePara('desvincular', alConfirmar);
    escribe('Actual123!');

    fireEvent.click(screen.getByRole('button', { name: 'edit.linkedAccounts.unlink' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('edit.linkedAccounts.reauthExpired');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('MD4: para vincular, si va bien no se cierra (se va a Google)', async () => {
    const { alConfirmar, onClose } = abrePara('vincular');
    escribe('Actual123!');

    fireEvent.click(continuar());

    await waitFor(() => expect(alConfirmar).toHaveBeenCalled());
    await act(async () => {});
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText('edit.linkedAccounts.passwordExplanation')).toBeInTheDocument();
  });
});
