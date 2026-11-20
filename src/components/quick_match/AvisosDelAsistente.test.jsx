import { describe, it, expect, vi } from 'vitest';
import { createRef } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AvisosDelAsistente from './AvisosDelAsistente';
import CabeceraDelAsistente from './CabeceraDelAsistente';

/**
 * La cabecera y los avisos del asistente de partida rápida.
 */
const t = (clave, valores) =>
  valores ? `${clave} ${JSON.stringify(valores)}` : clave;
const tComun = (clave) => `común:${clave}`;
const tCampos = (clave, { defaultValue }) => defaultValue;

const pinta = (props) =>
  render(
    <AvisosDelAsistente
      error={null}
      refDelAviso={createRef()}
      avisosAlRepetir={[]}
      t={t}
      tComun={tComun}
      tCampos={tCampos}
      {...props}
    />,
  );

describe('AvisosDelAsistente', () => {
  it('sin nada, no pinta nada', () => {
    const { container } = pinta();
    expect(container).toBeEmptyDOMElement();
  });

  it('el error, por su clave; de common; o el texto del servidor', () => {
    const refDelAviso = createRef();
    const { rerender } = pinta({ error: { clave: 'create.x' }, refDelAviso });
    expect(screen.getByTestId('quick-match-modal-error')).toHaveTextContent(
      'create.x',
    );
    expect(refDelAviso.current).toBe(
      screen.getByTestId('quick-match-modal-error'),
    );
    const props = { refDelAviso, avisosAlRepetir: [], t, tComun, tCampos };
    rerender(
      <AvisosDelAsistente
        {...props}
        error={{ clave: 'sinConexion.mensaje', comun: true }}
      />,
    );
    expect(screen.getByTestId('quick-match-modal-error')).toHaveTextContent(
      'común:sinConexion.mensaje',
    );
    rerender(<AvisosDelAsistente {...props} error={{ texto: 'Del server' }} />);
    expect(screen.getByTestId('quick-match-modal-error')).toHaveTextContent(
      'Del server',
    );
  });

  it('los avisos al repetir, en una lista de estado, uno por línea', () => {
    pinta({
      avisosAlRepetir: [
        { tipo: 'invitado', nombre: 'Ana' },
        { tipo: 'invitado', nombre: 'Ana' },
      ],
    });
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByTestId('avisos-al-repetir')).toHaveTextContent(
      'create.repetir.avisoInvitado',
    );
  });
});

describe('CabeceraDelAsistente', () => {
  it('título, paso y la X que cierra (salvo creando)', () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <CabeceraDelAsistente
        titulo="Nueva partida"
        pasoActual={2}
        t={t}
        etiquetaCerrar="Cerrar"
        onClose={onClose}
        isProcessing={false}
      />,
    );
    expect(screen.getByRole('heading')).toHaveTextContent('Nueva partida');
    expect(screen.getByRole('heading')).toHaveAttribute(
      'id',
      'quick-match-modal-title',
    );
    expect(
      screen.getByText('create.step {"current":2,"total":4}'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(
      <CabeceraDelAsistente
        titulo="Nueva partida"
        pasoActual={2}
        t={t}
        etiquetaCerrar="Cerrar"
        onClose={onClose}
        isProcessing
      />,
    );
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeDisabled();
  });
});
