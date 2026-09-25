import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (clave, params) =>
      params && typeof params === 'object' ? `${clave} ${Object.values(params).join(' ')}` : clave,
  }),
}));

import NameCaptainsModal from './NameCaptainsModal';

/**
 * LA TABLA del modal de capitanes en el bloque 3 de la FE #710.
 *
 *   #   caso                                   | qué pasa
 *   ----|--------------------------------------|-------------------------------------------
 *   C1  los desplegables                       | por hándicap, de menor a mayor, y lo dicen
 *   C2  sin hándicap                           | al final, sin número
 *   C3  el mismo jugador en los dos equipos    | «Nombrar» desactivado, y se dice por qué
 *   C4  dos distintos                          | sin aviso, y se puede nombrar
 */
const JUGADORES = [
  { userId: 'dani', name: 'Dani Díaz', handicap: 20 },
  { userId: 'eva', name: 'Eva Esteve', handicap: null },
  { userId: 'carla', name: 'Carla Cruz', handicap: 8.4 },
];

const pintar = (props = {}) =>
  render(
    <NameCaptainsModal
      isOpen
      players={JUGADORES}
      teamNames={{ a: 'Europa', b: 'América' }}
      current={{ teamA: null, teamB: null }}
      closesEnrollment={false}
      onConfirm={vi.fn()}
      onClose={vi.fn()}
      isLoading={false}
      {...props}
    />
  );

const opciones = (id) =>
  within(document.getElementById(id))
    .getAllByRole('option')
    .slice(1)
    .map((o) => o.textContent);

describe('NameCaptainsModal · lo que se elige (FE #710)', () => {
  it('C1/C2: por hándicap, que se ve; sin él, al final', () => {
    pintar();

    for (const id of ['capitan-a', 'capitan-b']) {
      expect(opciones(id)).toEqual(['Carla Cruz (8.4)', 'Dani Díaz (20.0)', 'Eva Esteve']);
    }
  });

  it('C3: el mismo en los dos: se dice por qué no se puede nombrar', () => {
    pintar({ current: { teamA: 'carla', teamB: 'carla' } });

    expect(screen.getByTestId('capitanes-el-mismo')).toBeInTheDocument();
    expect(screen.getByText('detail.captains.confirm')).toBeDisabled();
  });

  it('C4: dos distintos: sin aviso, y se puede', () => {
    pintar();

    fireEvent.change(document.getElementById('capitan-a'), { target: { value: 'carla' } });
    fireEvent.change(document.getElementById('capitan-b'), { target: { value: 'dani' } });

    expect(screen.queryByTestId('capitanes-el-mismo')).not.toBeInTheDocument();
    expect(screen.getByText('detail.captains.confirm')).toBeEnabled();
  });
});
