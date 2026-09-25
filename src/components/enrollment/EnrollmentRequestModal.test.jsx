import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
});
