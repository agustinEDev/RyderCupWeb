import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AliasSheet from './AliasSheet';
import ModalShell from '../ui/ModalShell';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key, i18n: { language: 'es' } }),
}));

describe('AliasSheet (FE #435)', () => {
  let onGuardar;
  let onClose;

  beforeEach(() => {
    onGuardar = vi.fn().mockResolvedValue(undefined);
    onClose = vi.fn();
  });

  const abre = (aliasActual = '') =>
    render(<AliasSheet aliasActual={aliasActual} onGuardar={onGuardar} onClose={onClose} />);

  it('llega con el alias actual escrito', () => {
    abre('Chuchi');

    expect(screen.getByTestId('alias-sheet-input')).toHaveValue('Chuchi');
  });

  it('guarda el alias nuevo y se cierra', async () => {
    abre('');

    fireEvent.change(screen.getByTestId('alias-sheet-input'), { target: { value: 'Chuchi' } });
    fireEvent.click(screen.getByTestId('alias-sheet-save'));

    await waitFor(() => expect(onGuardar).toHaveBeenCalledWith('Chuchi'));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('vaciar el campo pide que se borre el alias', async () => {
    abre('Chuchi');

    fireEvent.change(screen.getByTestId('alias-sheet-input'), { target: { value: '' } });
    fireEvent.click(screen.getByTestId('alias-sheet-save'));

    await waitFor(() => expect(onGuardar).toHaveBeenCalledWith(''));
  });

  it('el botón de quitar vacía el campo pero no guarda solo', () => {
    abre('Chuchi');

    fireEvent.click(screen.getByText('edit.personalInfo.aliasClear'));

    expect(screen.getByTestId('alias-sheet-input')).toHaveValue('');
    expect(onGuardar).not.toHaveBeenCalled();
  });

  it('no ofrece quitar cuando no hay alias que quitar', () => {
    abre('');

    expect(screen.queryByText('edit.personalInfo.aliasClear')).not.toBeInTheDocument();
  });

  it('sin cambios se cierra sin llamar a la API', async () => {
    abre('Chuchi');

    fireEvent.click(screen.getByTestId('alias-sheet-save'));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onGuardar).not.toHaveBeenCalled();
  });

  it('para un alias inválido antes de llamar a la API', async () => {
    abre('');

    fireEvent.change(screen.getByTestId('alias-sheet-input'), { target: { value: 'C' } });
    fireEvent.click(screen.getByTestId('alias-sheet-save'));

    await screen.findByRole('alert');
    expect(onGuardar).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('alias.errors.tooShort');
  });

  it('un 409 se queda dentro de la hoja, con lo tecleado intacto', async () => {
    const conflicto = new Error('en uso');
    conflicto.status = 409;
    onGuardar.mockRejectedValue(conflicto);
    abre('');

    fireEvent.change(screen.getByTestId('alias-sheet-input'), { target: { value: 'Chuchi' } });
    fireEvent.click(screen.getByTestId('alias-sheet-save'));

    await screen.findByRole('alert');
    expect(screen.getByRole('alert')).toHaveTextContent('alias.errors.taken');
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByTestId('alias-sheet-input')).toHaveValue('Chuchi');
  });

  it('el foco entra en el campo al abrirse', () => {
    abre('Chuchi');

    expect(screen.getByTestId('alias-sheet-input')).toHaveFocus();
  });

  it('el foco vuelve a quien la abrió al cerrarse', () => {
    // #389: las hojas que ya había declaran aria-modal y dejan escapar el
    // foco. Esta no puede añadirse a esa lista
    const disparador = document.createElement('button');
    document.body.appendChild(disparador);
    disparador.focus();

    const { unmount } = abre('Chuchi');
    expect(screen.getByTestId('alias-sheet-input')).toHaveFocus();

    unmount();

    expect(disparador).toHaveFocus();
    disparador.remove();
  });

  it('Escape la cierra', () => {
    abre('Chuchi');

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalled();
  });
});

describe('AliasSheet · el foco de la hoja modal, el compartido (#389)', () => {
  const tab = (el, opciones = {}) => {
    const evento = new globalThis.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true, ...opciones });
    el.dispatchEvent(evento);
    return evento;
  };

  it('Tab en el último vuelve al primero, y Shift+Tab en el primero va al último', () => {
    render(<AliasSheet aliasActual="Chuchi" onGuardar={vi.fn()} onClose={vi.fn()} />);
    const cruz = screen.getByRole('button', { name: 'alias.sheet.close' });
    const guardar = screen.getByTestId('alias-sheet-save');

    guardar.focus();
    tab(guardar);
    expect(cruz).toHaveFocus();

    tab(cruz, { shiftKey: true });
    expect(guardar).toHaveFocus();
  });

  it('con el foco fuera, Tab lo devuelve a la hoja', () => {
    const fuera = document.createElement('button');
    document.body.appendChild(fuera);
    render(<AliasSheet aliasActual="Chuchi" onGuardar={vi.fn()} onClose={vi.fn()} />);

    fuera.focus();
    tab(fuera);

    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
    fuera.remove();
  });

  it('guardando, los botones desactivados no cuentan: Tab no se escapa del campo', async () => {
    // Antes los contaba: el último era «Guardar», desactivado, y el tabulador
    // desde el campo seguía de largo hacia la página de detrás
    const onGuardar = vi.fn(() => new Promise(() => {}));
    render(<AliasSheet aliasActual="" onGuardar={onGuardar} onClose={vi.fn()} />);
    const campo = screen.getByTestId('alias-sheet-input');
    fireEvent.change(campo, { target: { value: 'Chuchi' } });
    fireEvent.click(screen.getByTestId('alias-sheet-save'));
    await waitFor(() => expect(screen.getByTestId('alias-sheet-save')).toBeDisabled());

    campo.focus();
    const evento = tab(campo);

    expect(evento.defaultPrevented).toBe(true);
    expect(campo).toHaveFocus();
  });

  it('Escape es suyo: no llega a quien lo escuche por su cuenta en la página', () => {
    const escapeDeLaPagina = vi.fn();
    const alPulsar = (e) => e.key === 'Escape' && escapeDeLaPagina();
    document.addEventListener('keydown', alPulsar);
    const onClose = vi.fn();
    render(<AliasSheet aliasActual="Chuchi" onGuardar={vi.fn()} onClose={onClose} />);

    fireEvent.keyDown(document.activeElement, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(escapeDeLaPagina).not.toHaveBeenCalled();
    document.removeEventListener('keydown', alPulsar);
  });

  it('sobre otro diálogo de la pila, Escape cierra la hoja y no el de debajo', () => {
    const cerrarModal = vi.fn();
    const cerrarHoja = vi.fn();
    render(
      <ModalShell isOpen onClose={cerrarModal} labelledBy="t">
        <h2 id="t">Debajo</h2>
        <button type="button">del modal</button>
      </ModalShell>
    );
    render(<AliasSheet aliasActual="Chuchi" onGuardar={vi.fn()} onClose={cerrarHoja} />);

    fireEvent.keyDown(document.activeElement, { key: 'Escape' });

    expect(cerrarHoja).toHaveBeenCalledTimes(1);
    expect(cerrarModal).not.toHaveBeenCalled();
  });
});

describe('AliasSheet — lo que no se puede afirmar (FE #435)', () => {
  it('no se cierra mientras hay una petición en vuelo', async () => {
    // Si se cerrara y esa petición acabara en 409, el aviso caería sobre un
    // componente desmontado: el conflicto desaparecería sin decir nada
    let resolver;
    const onGuardar = vi.fn(() => new Promise((r) => { resolver = r; }));
    const onClose = vi.fn();
    render(<AliasSheet aliasActual="" onGuardar={onGuardar} onClose={onClose} />);

    fireEvent.change(screen.getByTestId('alias-sheet-input'), { target: { value: 'Chuchi' } });
    fireEvent.click(screen.getByTestId('alias-sheet-save'));

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();

    resolver();
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
