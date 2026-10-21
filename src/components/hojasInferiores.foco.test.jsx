import { describe, it, expect, vi } from 'vitest';
import { useEffect, useState } from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import TeeSelectPanel from './quick_match/TeeSelectPanel';
import HandicapInputPanel from './quick_match/HandicapInputPanel';
import ScoreInputPanel from './scoring/ScoreInputPanel';
import ModalShell from './ui/ModalShell';

/**
 * Las tres hojas inferiores se anuncian modales y ahora lo son (RyderCupWeb#389).
 *
 *   #   caso                                          | se espera
 *   ----|---------------------------------------------|-------------------------------
 *   B1  se abre                                       | el foco entra en la hoja
 *   B2  Tab en el último / Shift+Tab en el primero    | da la vuelta dentro de la hoja
 *   B2  Tab con el foco fuera                         | vuelve a la hoja
 *   B3  se cierra (cruz o Escape)                     | el foco vuelve al disparador
 *   B4  Escape                                        | cierra
 *   B4  Escape con la hoja sobre otro diálogo         | cierra la hoja y no el de debajo
 *   B2  Tab con la hoja sobre otro diálogo            | se queda en la hoja
 *   B5  aspecto y toque                               | las mismas clases; tocar el
 *                                                     | fondo cierra, dentro no
 */

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (clave) => clave, i18n: { language: 'es' } }),
}));

const TEES = [
  { color: 'YELLOW', gender: 'MALE', identifier: null },
  { color: 'RED', gender: 'FEMALE', identifier: null },
];

const HOJAS = [
  {
    nombre: 'TeeSelectPanel',
    cruz: 'create.teePanel.close',
    caja: 'bg-white rounded-t-2xl w-full max-w-md p-4 pb-[calc(2rem+env(safe-area-inset-bottom))] shadow-xl max-h-[80vh] overflow-y-auto',
    pinta: (onClose) => (
      <TeeSelectPanel courseTees={TEES} playerName="Ana" onSelect={vi.fn()} onClose={onClose} />
    ),
  },
  {
    nombre: 'HandicapInputPanel',
    cruz: 'create.handicapPanel.close',
    caja: 'bg-white rounded-t-2xl w-full max-w-md p-4 pb-[calc(2rem+env(safe-area-inset-bottom))] shadow-xl',
    pinta: (onClose) => <HandicapInputPanel value={null} label="Ana" onConfirm={vi.fn()} onClose={onClose} />,
  },
  {
    nombre: 'ScoreInputPanel',
    cruz: 'input.close',
    caja: 'bg-white rounded-t-2xl w-full max-w-md p-4 pb-[calc(2rem+env(safe-area-inset-bottom))] shadow-xl',
    pinta: (onClose) => <ScoreInputPanel value={undefined} onSelect={vi.fn()} onClose={onClose} label="Ana" par={4} />,
  },
];

const enfocables = (hoja) => [...hoja.querySelectorAll('button:not([disabled]), input:not([disabled])')];

/** Un disparador que abre la hoja, como en la aplicación. */
const ConDisparador = ({ hoja, alCerrar = () => {} }) => {
  const [abierta, setAbierta] = useState(false);
  const cerrar = () => {
    alCerrar();
    setAbierta(false);
  };
  return (
    <>
      <button type="button" onClick={() => setAbierta(true)}>
        abrir
      </button>
      <button type="button">otro de la página</button>
      {abierta && hoja.pinta(cerrar)}
    </>
  );
};

const abrir = (hoja) => {
  render(<ConDisparador hoja={hoja} />);
  const disparador = screen.getByRole('button', { name: 'abrir' });
  disparador.focus();
  fireEvent.click(disparador);
  return { disparador, dialogo: screen.getByRole('dialog') };
};

describe.each(HOJAS)('$nombre · foco de hoja modal (#389)', (hoja) => {
  it('B1: al abrirse, el foco entra en la hoja', () => {
    const { dialogo } = abrir(hoja);
    expect(dialogo.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).toBe(enfocables(dialogo)[0]);
  });

  it('B2: Tab en el último vuelve al primero, y Shift+Tab en el primero va al último', () => {
    const { dialogo } = abrir(hoja);
    const lista = enfocables(dialogo);
    const ultimo = lista.at(-1);
    ultimo.focus();
    fireEvent.keyDown(ultimo, { key: 'Tab' });
    expect(document.activeElement).toBe(lista[0]);

    fireEvent.keyDown(lista[0], { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(ultimo);
  });

  it('B2: Tab con el foco fuera lo devuelve a la hoja', () => {
    const { dialogo } = abrir(hoja);
    const fuera = screen.getByRole('button', { name: 'otro de la página' });
    fuera.focus();
    fireEvent.keyDown(fuera, { key: 'Tab' });
    expect(dialogo.contains(document.activeElement)).toBe(true);
  });

  it('B3: al cerrarla con la cruz, el foco vuelve al disparador', () => {
    const { disparador, dialogo } = abrir(hoja);
    fireEvent.click(within(dialogo).getByRole('button', { name: hoja.cruz }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(disparador);
  });

  it('B3/B4: Escape la cierra y el foco vuelve al disparador', () => {
    const { disparador } = abrir(hoja);
    fireEvent.keyDown(document.activeElement, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(disparador);
  });

  /** La hoja se abre desde dentro de un diálogo ya abierto, como en la app. */
  const SobreUnModal = ({ cerrarModal, cerrarHoja }) => {
    const [abierta, setAbierta] = useState(false);
    return (
      <ModalShell isOpen onClose={cerrarModal} labelledBy="t">
        <h2 id="t">Debajo</h2>
        <button type="button" onClick={() => setAbierta(true)}>
          abrir hoja
        </button>
        {abierta && hoja.pinta(cerrarHoja)}
        <button type="button">del modal, detrás de la hoja</button>
      </ModalShell>
    );
  };

  const abrirSobreUnModal = () => {
    const cerrarModal = vi.fn();
    const cerrarHoja = vi.fn();
    render(<SobreUnModal cerrarModal={cerrarModal} cerrarHoja={cerrarHoja} />);
    fireEvent.click(screen.getByRole('button', { name: 'abrir hoja' }));
    // La de la hoja es la de dentro: la última en la página
    return { cerrarModal, cerrarHoja, dialogo: screen.getAllByRole('dialog').at(-1) };
  };

  it('B4: sobre otro diálogo, Escape cierra la hoja y no el de debajo', () => {
    const { cerrarModal, cerrarHoja, dialogo } = abrirSobreUnModal();
    expect(dialogo.contains(document.activeElement)).toBe(true);
    fireEvent.keyDown(document.activeElement, { key: 'Escape' });
    expect(cerrarHoja).toHaveBeenCalledTimes(1);
    expect(cerrarModal).not.toHaveBeenCalled();
  });

  it('B2: sobre otro diálogo, el tabulador se queda en la hoja', () => {
    const { dialogo } = abrirSobreUnModal();
    const lista = enfocables(dialogo);
    lista.at(-1).focus();
    fireEvent.keyDown(lista.at(-1), { key: 'Tab' });
    expect(document.activeElement).toBe(lista[0]);

    fireEvent.keyDown(lista[0], { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(lista.at(-1));
  });

  it('B4: sobre un diálogo con su propio Escape (el de crear partida), solo se cierra la hoja', () => {
    const escapeDelDeDebajo = vi.fn();
    const DialogoConSuEscape = () => {
      const [abierta, setAbierta] = useState(false);
      // Como CreateQuickMatchModal: escucha Escape en el documento, por su cuenta
      useEffect(() => {
        const alPulsar = (e) => e.key === 'Escape' && escapeDelDeDebajo();
        document.addEventListener('keydown', alPulsar);
        return () => document.removeEventListener('keydown', alPulsar);
      }, []);
      return (
        <div role="dialog" aria-modal="true" aria-label="crear">
          <button type="button" onClick={() => setAbierta(true)}>
            abrir hoja
          </button>
          {abierta && hoja.pinta(() => setAbierta(false))}
        </div>
      );
    };
    render(<DialogoConSuEscape />);
    fireEvent.click(screen.getByRole('button', { name: 'abrir hoja' }));
    expect(screen.getAllByRole('dialog')).toHaveLength(2);

    fireEvent.keyDown(document.activeElement, { key: 'Escape' });

    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(escapeDelDeDebajo).not.toHaveBeenCalled();
  });

  it('B5: la misma caja, y tocar el fondo cierra pero dentro no', () => {
    const onClose = vi.fn();
    render(hoja.pinta(onClose));
    const dialogo = screen.getByRole('dialog');
    expect(dialogo.className.split(/\s+/)).toEqual(expect.arrayContaining(hoja.caja.split(' ')));
    expect(dialogo.parentElement).toHaveClass('fixed', 'inset-0', 'z-50', 'flex', 'items-end', 'justify-center', 'bg-black/40');

    fireEvent.click(dialogo);
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(dialogo.parentElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
