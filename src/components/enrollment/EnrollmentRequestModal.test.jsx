import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import EnrollmentRequestModal from './EnrollmentRequestModal';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (clave) => clave }) }));
vi.mock('framer-motion', () => {
  const DE_ANIMACION = new Set(['initial', 'animate', 'exit', 'transition']);
  const Div = ({ children, ...props }) => (
    <div {...Object.fromEntries(Object.entries(props).filter(([k]) => !DE_ANIMACION.has(k)))}>
      {children}
    </div>
  );
  return { motion: new Proxy({}, { get: () => Div }) };
});

/**
 * Pedir plaza pregunta el género solo a quien no lo tiene (#710, 24 sep).
 */
describe('EnrollmentRequestModal · el género', () => {
  it('M1: con el género puesto no se pregunta nada nuevo', () => {
    const onConfirm = vi.fn();
    render(<EnrollmentRequestModal isOpen onClose={() => {}} onConfirm={onConfirm} />);

    expect(screen.queryByTestId('selector-de-genero')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('competitions:enrollment.confirm'));
    expect(onConfirm).toHaveBeenCalledWith(null, null);
  });

  it('M2: sin género se pregunta, y no se envía hasta elegirlo', () => {
    const onConfirm = vi.fn();
    render(<EnrollmentRequestModal isOpen pideGenero onClose={() => {}} onConfirm={onConfirm} />);

    const enviar = screen.getByText('competitions:enrollment.confirm');
    expect(enviar).toBeDisabled();

    fireEvent.change(screen.getByTestId('selector-de-genero'), { target: { value: 'FEMALE' } });
    expect(enviar).not.toBeDisabled();
    fireEvent.click(enviar);

    expect(onConfirm).toHaveBeenCalledWith(null, 'FEMALE');
  });

  it('M3: si pedir plaza falló, el motivo se lee en el modal (#710)', () => {
    render(
      <EnrollmentRequestModal
        isOpen
        onClose={() => {}}
        onConfirm={() => {}}
        error="La competición está completa: 4 plazas ocupadas."
      />
    );

    expect(screen.getByTestId('apuntarse-error')).toHaveTextContent('completa');
  });
});

/**
 * Sin hándicap no se entra en un Stableford o un Medal (RyderCupAM#506): el
 * modal lo dice con un enlace al perfil y no deja enviar (FE #824, PR 5;
 * Agustín, 11 oct 2026).
 */
describe('EnrollmentRequestModal · el hándicap (FE #824)', () => {
  const pinta = (props) =>
    render(
      <MemoryRouter>
        <EnrollmentRequestModal isOpen onClose={() => {}} onConfirm={vi.fn()} {...props} />
      </MemoryRouter>
    );

  it('H1: sin hándicap, el aviso con el enlace al perfil y sin poder enviar', () => {
    pinta({ faltaHandicap: true });

    expect(screen.getByTestId('falta-handicap')).toHaveTextContent('competitions:enrollment.needsHandicap');
    expect(screen.getByRole('link', { name: 'competitions:enrollment.addHandicap' })).toHaveAttribute('href', '/profile/edit');
    expect(screen.getByText('competitions:enrollment.confirm')).toBeDisabled();
  });

  it('H2: con hándicap, nada', () => {
    pinta({});

    expect(screen.queryByTestId('falta-handicap')).toBeNull();
  });
});
