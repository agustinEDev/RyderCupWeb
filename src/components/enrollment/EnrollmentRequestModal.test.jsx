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
    expect(onConfirm).toHaveBeenCalledWith(null, null, null);
  });

  it('M2: sin género se pregunta, y no se envía hasta elegirlo', () => {
    const onConfirm = vi.fn();
    render(<EnrollmentRequestModal isOpen pideGenero onClose={() => {}} onConfirm={onConfirm} />);

    const enviar = screen.getByText('competitions:enrollment.confirm');
    expect(enviar).toBeDisabled();

    fireEvent.change(screen.getByTestId('selector-de-genero'), { target: { value: 'FEMALE' } });
    expect(enviar).not.toBeDisabled();
    fireEvent.click(enviar);

    expect(onConfirm).toHaveBeenCalledWith(null, 'FEMALE', null);
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

/**
 * Inscripción directa en las públicas (release social 3, 28 oct 2026): en un
 * stroke play con franjas se elige en el mismo paso la franja con hueco, o la
 * espera de una llena (D3-D7). Sin franjas, solo la barra (D1).
 */
const franja = (id, dia, hora, capacidad, ocupadas, enEspera = 0) => ({
  id,
  roundDate: dia,
  sessionType: 'MORNING',
  teeSheet: {
    firstTeeTime: hora,
    lastTeeTime: hora,
    capacity: capacidad,
    placesTaken: ocupadas,
    waitingCount: enEspera,
  },
});

describe('EnrollmentRequestModal · la franja (release social 3)', () => {
  it('D1: sin franjas solo se elige la barra', () => {
    const onConfirm = vi.fn();
    render(<EnrollmentRequestModal isOpen onClose={() => {}} onConfirm={onConfirm} />);

    expect(screen.queryByTestId('elegir-franja')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('competitions:enrollment.confirm'));
    expect(onConfirm).toHaveBeenCalledWith(null, null, null);
  });

  it('D4: con franjas no se envía hasta elegir una', () => {
    const onConfirm = vi.fn();
    render(
      <EnrollmentRequestModal
        isOpen
        onClose={() => {}}
        onConfirm={onConfirm}
        franjas={[franja('r1', '2027-03-03', '09:00', 4, 1)]}
      />
    );

    expect(screen.getByTestId('elegir-franja')).toBeInTheDocument();
    expect(screen.getByText('competitions:enrollment.confirm')).toBeDisabled();
  });

  it('D3: una con hueco entra con su plaza', () => {
    const onConfirm = vi.fn();
    render(
      <EnrollmentRequestModal
        isOpen
        onClose={() => {}}
        onConfirm={onConfirm}
        franjas={[franja('r1', '2027-03-03', '09:00', 4, 1)]}
      />
    );

    fireEvent.click(screen.getByTestId('franja-r1'));
    fireEvent.click(screen.getByText('competitions:enrollment.confirm'));

    expect(onConfirm).toHaveBeenCalledWith(null, null, { roundId: 'r1', waiting: false });
  });

  it('D6: una llena ofrece su espera, y se envía a la espera', () => {
    const onConfirm = vi.fn();
    render(
      <EnrollmentRequestModal
        isOpen
        onClose={() => {}}
        onConfirm={onConfirm}
        franjas={[franja('r1', '2027-03-03', '09:00', 4, 4, 2)]}
      />
    );

    expect(screen.getByTestId('franja-r1')).toHaveTextContent('competitions:enrollment.full');
    fireEvent.click(screen.getByTestId('franja-r1'));
    fireEvent.click(screen.getByText('competitions:enrollment.joinWaitingList'));

    expect(onConfirm).toHaveBeenCalledWith(null, null, { roundId: 'r1', waiting: true });
  });

  it('las franjas van por día y hora', () => {
    render(
      <EnrollmentRequestModal
        isOpen
        onClose={() => {}}
        onConfirm={() => {}}
        franjas={[
          franja('tarde', '2027-03-03', '15:00', 4, 0),
          franja('domingo', '2027-03-04', '08:00', 4, 0),
          franja('manana', '2027-03-03', '09:00', 4, 0),
        ]}
      />
    );

    const orden = screen.getAllByTestId(/^franja-/).map((b) => b.dataset.testid);
    expect(orden).toEqual(['franja-manana', 'franja-tarde', 'franja-domingo']);
  });
});


describe('EnrollmentRequestModal · code-review (release social 3)', () => {
  it('sin capacidad en la hoja la calcula de sus salidas', () => {
    const sinCapacidad = {
      ...franja('r1', '2027-03-03', '09:00', undefined, 4),
      teeSheet: { firstTeeTime: '09:00', lastTeeTime: '09:00', teeTimes: ['09:00'], groupSize: 4, placesTaken: 4, waitingCount: 0 },
    };
    render(
      <EnrollmentRequestModal isOpen onClose={() => {}} onConfirm={() => {}} franjas={[sinCapacidad]} />
    );

    expect(screen.getByTestId('franja-r1')).toHaveTextContent('competitions:enrollment.full');
  });

  it('si no se pudieron cargar, se puede volver a intentar', () => {
    const onReintentar = vi.fn();
    render(
      <EnrollmentRequestModal
        isOpen
        onClose={() => {}}
        onConfirm={() => {}}
        franjasSinCargar
        onReintentar={onReintentar}
      />
    );

    fireEvent.click(screen.getByText('competitions:enrollment.retryWindows'));

    expect(onReintentar).toHaveBeenCalled();
  });
});
