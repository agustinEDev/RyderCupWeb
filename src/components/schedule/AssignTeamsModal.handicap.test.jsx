import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AssignTeamsModal from './AssignTeamsModal';
import { abreviaturaDeHandicap } from './__fixtures__/abreviaturaDeHandicap';

/**
 * El modal solo se abre sin equipos: con ellos formados no se reparten de
 * nuevo, se deshacen antes (29-30 oct 2026). El modo «reasignar» se quitó.
 *
 *   #   caso                                   | al abrir
 *   ----|---------------------------------------|----------------------------
 *   C1  sin equipos                            | automático
 *   C4  sin poder cargar los inscritos         | no se bloquea: el automático
 *       |                                       | lo hace el servidor con los suyos
 *   H1  hándicap plus en el reparto manual     | con «+»
 */
vi.mock('framer-motion', () => {
  const DE_ANIMACION = new Set(['initial', 'animate', 'exit', 'transition']);
  const Div = ({ children, ...props }) => (
    <div {...Object.fromEntries(Object.entries(props).filter(([k]) => !DE_ANIMACION.has(k)))}>
      {children}
    </div>
  );
  return { motion: new Proxy({}, { get: () => Div }) };
});

const t = (clave, params) =>
  abreviaturaDeHandicap(clave, params) ??
  (params?.count !== undefined ? `${clave}_${params.count}` : clave);

const INSCRITOS = [
  { userId: 'ana', userName: 'Ana Alba', status: 'APPROVED', userHandicap: 8 },
  { userId: 'bea', userName: 'Bea Blanco', status: 'APPROVED', userHandicap: 12 },
  { userId: 'carla', userName: 'Carla Cruz', status: 'APPROVED', userHandicap: 15 },
  { userId: 'dani', userName: 'Dani Díaz', status: 'APPROVED', userHandicap: 20 },
];

const pintar = (props = {}) =>
  render(
    <AssignTeamsModal
      isOpen
      onClose={vi.fn()}
      onConfirm={vi.fn()}
      enrollments={INSCRITOS}
      isProcessing={false}
      teamNames={{ teamA: 'Europa', teamB: 'América' }}
      captains={{ teamA: 'ana', teamB: 'bea' }}
      t={t}
      {...props}
    />
  );

describe('AssignTeamsModal · al abrirse', () => {
  it('C1: abre en automático', () => {
    pintar();

    expect(screen.getByDisplayValue('automatic')).toBeChecked();
  });

  it('C4: sin poder cargar los inscritos, el automático sigue disponible', () => {
    const onConfirm = vi.fn();
    pintar({ enrollments: [], onConfirm });

    fireEvent.submit(screen.getByDisplayValue('automatic').closest('form'));

    expect(onConfirm).toHaveBeenCalledWith({ mode: 'automatic' });
  });
});

// Un hándicap plus se guarda negativo y se lee con «+» (FE #797)
describe('AssignTeamsModal · hándicap plus (FE #797)', () => {
  it('H1: en el reparto manual, el plus con «+» y el positivo sin signo', () => {
    pintar({ enrollments: [{ ...INSCRITOS[0], userHandicap: -2 }, ...INSCRITOS.slice(1)] });
    fireEvent.click(screen.getByDisplayValue('manual'));

    expect(screen.getByText('HCP: +2.0')).toBeInTheDocument();
    expect(screen.getByText('HCP: 12.0')).toBeInTheDocument();
  });
});
