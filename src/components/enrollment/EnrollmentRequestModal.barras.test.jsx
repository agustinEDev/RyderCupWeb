import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import EnrollmentRequestModal from './EnrollmentRequestModal';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (clave) => clave }),
}));
vi.mock('framer-motion', () => {
  const DE_ANIMACION = new Set(['initial', 'animate', 'exit', 'transition']);
  const Div = ({ children, ...props }) => (
    <div
      {...Object.fromEntries(
        Object.entries(props).filter(([k]) => !DE_ANIMACION.has(k)),
      )}
    >
      {children}
    </div>
  );
  return { motion: new Proxy({}, { get: () => Div }) };
});
const mockCampos = vi.fn();
vi.mock('../../composition', () => ({
  getCompetitionGolfCoursesUseCase: { execute: (...a) => mockCampos(...a) },
}));

const campo = (tees) => ({
  golf_courses: [{ golf_course: { id: 'g1', tees } }],
});
// Como Aldeamayor: azules y rojas de mujer, amarillas y blancas de hombre
const ALDEAMAYOR = campo([
  { color: 'WHITE', gender: 'MALE' },
  { color: 'YELLOW', gender: 'MALE' },
  { color: 'BLUE', gender: 'FEMALE' },
  { color: 'RED', gender: 'FEMALE' },
]);

const abre = (props = {}) => {
  const onConfirm = vi.fn();
  render(
    <MemoryRouter>
      <EnrollmentRequestModal
        isOpen
        onClose={() => {}}
        onConfirm={onConfirm}
        competitionId="c1"
        {...props}
      />
    </MemoryRouter>,
  );
  return onConfirm;
};
const opciones = () =>
  within(screen.getByLabelText('competitions:enrollment.colorLabel'))
    .getAllByRole('option')
    .map((o) => o.value);
const confirmar = () =>
  fireEvent.click(screen.getByText('competitions:enrollment.confirm'));

/**
 * Las barras al apuntarse (FE #1214): las de los campos de la competición
 * para su género (y las mixtas), no cinco colores fijos; marcada, la habitual
 * de su género si está.
 */
describe('EnrollmentRequestModal · las barras de los campos', () => {
  beforeEach(() => {
    mockCampos.mockReset();
  });

  it('F1/F2: una mujer ve las suyas y sale marcada la roja', async () => {
    mockCampos.mockResolvedValue(ALDEAMAYOR);
    const onConfirm = abre({ generoDelJugador: 'FEMALE' });

    expect(await screen.findByRole('option', { name: /RED/ })).toBeTruthy();
    expect(mockCampos).toHaveBeenCalledWith('c1');
    expect(opciones()).toEqual(['', 'BLUE', 'RED']);
    confirmar();
    expect(onConfirm).toHaveBeenCalledWith('RED', null, null);
  });

  it('F1/F2: un hombre ve las de hombre y sale marcada la amarilla', async () => {
    mockCampos.mockResolvedValue(ALDEAMAYOR);
    const onConfirm = abre({ generoDelJugador: 'MALE' });

    await screen.findByRole('option', { name: /YELLOW/ });
    expect(opciones()).toEqual(['', 'WHITE', 'YELLOW']);
    confirmar();
    expect(onConfirm).toHaveBeenCalledWith('YELLOW', null, null);
  });

  it('F2: si su habitual no está, sale «sin preferencia»', async () => {
    mockCampos.mockResolvedValue(campo([{ color: 'BLUE', gender: 'FEMALE' }]));
    const onConfirm = abre({ generoDelJugador: 'FEMALE' });

    await screen.findByRole('option', { name: /BLUE/ });
    confirmar();
    expect(onConfirm).toHaveBeenCalledWith(null, null, null);
  });

  it('elige otra y se manda la elegida; «sin preferencia» manda null', async () => {
    mockCampos.mockResolvedValue(ALDEAMAYOR);
    const onConfirm = abre({ generoDelJugador: 'FEMALE' });
    await screen.findByRole('option', { name: /BLUE/ });

    fireEvent.change(
      screen.getByLabelText('competitions:enrollment.colorLabel'),
      {
        target: { value: '' },
      },
    );
    confirmar();
    expect(onConfirm).toHaveBeenLastCalledWith(null, null, null);
  });

  it('sin género en el perfil: con el que elige en el modal', async () => {
    mockCampos.mockResolvedValue(ALDEAMAYOR);
    const onConfirm = abre({ pideGenero: true });
    await screen.findByText('competitions:enrollment.colorLabel');

    fireEvent.change(screen.getByTestId('selector-de-genero'), {
      target: { value: 'FEMALE' },
    });
    await screen.findByRole('option', { name: /RED/ });
    expect(opciones()).toEqual(['', 'BLUE', 'RED']);
    confirmar();
    expect(onConfirm).toHaveBeenCalledWith('RED', 'FEMALE', null);
  });

  it('ninguna para su género: solo «sin preferencia» y se dice', async () => {
    mockCampos.mockResolvedValue(campo([{ color: 'YELLOW', gender: 'MALE' }]));
    abre({ generoDelJugador: 'FEMALE' });

    expect(await screen.findByTestId('sin-barras-para-ti')).toBeInTheDocument();
    expect(opciones()).toEqual(['']);
  });

  it('sin poder leer los campos: se dice y se puede apuntar igual', async () => {
    mockCampos.mockRejectedValue(new Error('red'));
    const onConfirm = abre({ generoDelJugador: 'FEMALE' });

    expect(await screen.findByTestId('barras-sin-cargar')).toBeInTheDocument();
    expect(opciones()).toEqual(['']);
    confirmar();
    expect(onConfirm).toHaveBeenCalledWith(null, null, null);
  });
});
