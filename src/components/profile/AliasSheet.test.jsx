import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AliasSheet from './AliasSheet';

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
