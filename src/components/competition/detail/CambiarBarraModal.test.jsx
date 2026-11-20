import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import CambiarBarraModal from './CambiarBarraModal';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (clave, v) => (v ? `${clave} ${JSON.stringify(v)}` : clave),
  }),
}));
const mockCampos = vi.fn();
vi.mock('../../../composition', () => ({
  getCompetitionGolfCoursesUseCase: { execute: (...a) => mockCampos(...a) },
}));

const ALDEAMAYOR = {
  golf_courses: [
    {
      golf_course: {
        id: 'g1',
        tees: [
          { color: 'YELLOW', gender: 'MALE' },
          { color: 'BLUE', gender: 'FEMALE' },
          { color: 'RED', gender: 'FEMALE' },
        ],
      },
    },
  ],
};
const t = (clave, v) => (v ? `${clave} ${JSON.stringify(v)}` : clave);

const abre = (props = {}) => {
  const onGuardar = vi.fn();
  const onClose = vi.fn();
  render(
    <CambiarBarraModal
      t={t}
      competitionId="c1"
      inscripcion={{
        id: 'e1',
        userId: 'ana',
        userName: 'Ana',
        userGender: 'FEMALE',
        color: null,
      }}
      guardando={false}
      onGuardar={onGuardar}
      onClose={onClose}
      {...props}
    />,
  );
  return { onGuardar, onClose };
};
const selector = () => screen.getByLabelText('detail.tee.label');
const opciones = () =>
  within(selector())
    .getAllByRole('option')
    .map((o) => o.value);

/**
 * Cambiar la barra de un inscrito (FE #1214): las de los campos para SU
 * género y las mixtas, «por defecto» para volver a la habitual, y de él se
 * sale siempre.
 */
describe('CambiarBarraModal', () => {
  beforeEach(() => {
    mockCampos.mockReset();
  });

  it('F4: las de su género, con «por defecto» primero y la actual marcada', async () => {
    mockCampos.mockResolvedValue(ALDEAMAYOR);
    abre();

    await screen.findByRole('option', { name: /BLUE/ });
    expect(opciones()).toEqual(['', 'BLUE', 'RED']);
    expect(selector().value).toBe('');
    expect(screen.getByText(/detail.tee.default .*RED/)).toBeInTheDocument();
  });

  it('elegir otra y guardar manda ese color', async () => {
    mockCampos.mockResolvedValue(ALDEAMAYOR);
    const { onGuardar } = abre();
    await screen.findByRole('option', { name: /BLUE/ });

    fireEvent.change(selector(), { target: { value: 'BLUE' } });
    fireEvent.click(screen.getByText('detail.tee.save'));
    expect(onGuardar).toHaveBeenCalledWith('BLUE');
  });

  it('volver a la de por defecto manda null', async () => {
    mockCampos.mockResolvedValue(ALDEAMAYOR);
    const { onGuardar } = abre({
      inscripcion: {
        id: 'e1',
        userId: 'ana',
        userName: 'Ana',
        userGender: 'FEMALE',
        color: 'BLUE',
      },
    });
    await screen.findByRole('option', { name: /RED/ });
    expect(selector().value).toBe('BLUE');

    fireEvent.change(selector(), { target: { value: '' } });
    fireEvent.click(screen.getByText('detail.tee.save'));
    expect(onGuardar).toHaveBeenCalledWith(null);
  });

  it('sin cambiar nada no se guarda', async () => {
    mockCampos.mockResolvedValue(ALDEAMAYOR);
    abre();
    await screen.findByRole('option', { name: /BLUE/ });
    expect(screen.getByText('detail.tee.save')).toBeDisabled();
  });

  it('sin poder leer los campos, se dice y solo queda «por defecto»', async () => {
    mockCampos.mockRejectedValue(new Error('red'));
    abre();
    expect(await screen.findByTestId('barras-sin-cargar')).toBeInTheDocument();
    expect(opciones()).toEqual(['']);
  });

  it('F6: se sale siempre, también guardando', async () => {
    mockCampos.mockResolvedValue(ALDEAMAYOR);
    const { onClose } = abre({ guardando: true });
    fireEvent.click(screen.getByText('detail.tee.close'));
    expect(onClose).toHaveBeenCalled();
  });
});
