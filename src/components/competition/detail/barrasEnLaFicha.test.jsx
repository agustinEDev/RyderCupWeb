import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
  act,
} from '@testing-library/react';
import BarrasDelJugadorModal from './BarrasDelJugadorModal';
import MisBarras from './MisBarras';
import BarrasDeLosCamposModal from './BarrasDeLosCamposModal';
import FilaDeAprobado from './FilaDeAprobado';

// F13: en los modales de barras el aviso sale arriba, sin tapar sus botones
const ARRIBA = { position: 'top-center' };

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (clave, v) => (v ? `${clave} ${JSON.stringify(v)}` : clave),
  }),
}));
const m = vi.hoisted(() => ({
  leer: vi.fn(),
  general: vi.fn(),
  campo: vi.fn(),
  delCampo: vi.fn(),
  campos: vi.fn(),
  fijadas: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock('../../../composition/cargarBarras', () => ({
  cargarBarras: () =>
    Promise.resolve({
      getEnrollmentTeesUseCase: { execute: m.leer },
      changeEnrollmentTeeUseCase: { execute: m.general },
      changeEnrollmentCourseTeeUseCase: { execute: m.campo },
      setCompetitionCourseTeeUseCase: { execute: m.delCampo },
      getCompetitionCourseTeesUseCase: { execute: m.fijadas },
    }),
}));
vi.mock('../../../composition', () => ({
  getCompetitionGolfCoursesUseCase: { execute: m.campos },
}));
vi.mock('../../../utils/toast', () => ({ default: m.toast }));
vi.mock('../../../utils/registraElFallo', () => ({ registraElFallo: vi.fn() }));

const BARRAS = {
  generalTee: null,
  defaultTee: 'RED',
  courses: [
    {
      golfCourseId: 'g1',
      golfCourseName: 'Aldeamayor',
      tee: 'RED',
      source: 'DEFAULT',
      options: ['BLUE', 'RED'],
    },
    {
      golfCourseId: 'g2',
      golfCourseName: 'Altea',
      tee: null,
      source: 'NONE',
      options: ['YELLOW'],
    },
  ],
};
const fijada = (golfCourseId, gender, teeColor) => ({
  golfCourseId,
  gender,
  teeColor,
});
const fallo = (status, errorCode) =>
  Object.assign(new Error(String(status)), { status, errorCode });

beforeEach(() => {
  vi.clearAllMocks();
  m.leer.mockResolvedValue(BARRAS);
  m.general.mockResolvedValue({ id: 'e1', teeColor: 'BLUE' });
  m.campo.mockResolvedValue({ teeColor: 'YELLOW' });
  m.delCampo.mockResolvedValue({ gender: 'FEMALE', teeColor: 'RED' });
  m.fijadas.mockResolvedValue([]);
});

/**
 * F2/F3 · las barras de un inscrito: su general y, por campo, la que juega
 * y por qué; con permiso, se cambian, y tras guardar se vuelven a leer.
 */
describe('BarrasDelJugadorModal', () => {
  const abre = (props = {}) => {
    const fns = { onClose: vi.fn(), onCambio: vi.fn() };
    render(
      <BarrasDelJugadorModal
        inscripcion={{ id: 'e1', userName: 'Ana' }}
        puedeCambiar
        {...fns}
        {...props}
      />,
    );
    return fns;
  };

  it('lee sus barras al abrir y dice la que juega en cada campo y por qué', async () => {
    abre();
    await screen.findByTestId('fila-barra-g1');
    expect(m.leer).toHaveBeenCalledWith('e1');
    expect(
      screen.getByText('competitions:tees.playerTitle {"name":"Ana"}'),
    ).toBeInTheDocument();
    // De otro jugador, en tercera persona
    expect(screen.getByTestId('fila-barra-g1')).toHaveTextContent(
      'competitions:tees.sourceOther.DEFAULT',
    );
    expect(screen.getByTestId('fila-barra-g2')).toHaveTextContent(
      'competitions:tees.noTee',
    );
  });

  it('sin nombre, un título genérico', async () => {
    abre({ inscripcion: { id: 'e1' } });
    expect(
      await screen.findByText('competitions:tees.playerTitleNoName'),
    ).toBeInTheDocument();
  });

  it('cambia la general, vuelve a leer y avisa con lo que quedó', async () => {
    const { onCambio } = abre();
    const general = await screen.findByLabelText('competitions:tees.general');
    expect(screen.getByTestId('guardar-general')).toBeDisabled();
    fireEvent.change(general, { target: { value: 'BLUE' } });
    fireEvent.click(screen.getByTestId('guardar-general'));

    await waitFor(() => expect(onCambio).toHaveBeenCalledWith(BARRAS));
    expect(m.general).toHaveBeenCalledWith('e1', 'BLUE');
    expect(m.leer).toHaveBeenCalledTimes(2);
    expect(m.toast.success).toHaveBeenCalledWith(
      'competitions:tees.saved',
      ARRIBA,
    );
  });

  it('cambia la de un campo con sus opciones', async () => {
    abre();
    await screen.findByTestId('fila-barra-g2');
    const select = within(screen.getByTestId('fila-barra-g2')).getByRole(
      'combobox',
    );
    expect(
      within(select)
        .getAllByRole('option')
        .map((o) => o.value),
    ).toEqual(['', 'YELLOW']);
    fireEvent.change(select, { target: { value: 'YELLOW' } });
    fireEvent.click(screen.getByTestId('guardar-g2'));
    await waitFor(() =>
      expect(m.campo).toHaveBeenCalledWith('e1', 'g2', 'YELLOW'),
    );
  });

  it('F4: un rechazo se dice con su texto y el modal sigue', async () => {
    m.general.mockRejectedValue(fallo(409, 'TEE_CHANGE_CLOSED'));
    const { onClose } = abre();
    fireEvent.change(
      await screen.findByLabelText('competitions:tees.general'),
      { target: { value: 'BLUE' } },
    );
    fireEvent.click(screen.getByTestId('guardar-general'));
    await waitFor(() =>
      expect(m.toast.error).toHaveBeenCalledWith(
        'competitions:tees.errors.TEE_CHANGE_CLOSED',
        ARRIBA,
      ),
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByTestId('fila-barra-general')).toBeInTheDocument();
  });

  it('7: la general es obligatoria: sin opción vacía; sin general, hay que elegirla', async () => {
    abre();
    const general = await screen.findByLabelText('competitions:tees.general');
    const opciones = within(general).getAllByRole('option');
    expect(opciones[0].value).toBe('');
    expect(opciones[0]).toBeDisabled();
    expect(screen.getByTestId('guardar-general')).toBeDisabled();
  });

  it('7: con general, ninguna opción vacía', async () => {
    m.leer.mockResolvedValue({ ...BARRAS, generalTee: 'YELLOW' });
    abre();
    const general = await screen.findByLabelText('competitions:tees.general');
    expect(
      within(general)
        .getAllByRole('option')
        .map((o) => o.value),
    ).not.toContain('');
  });

  it('7: en un campo sin barra, quitar el cambio propio se puede guardar', async () => {
    abre();
    await screen.findByTestId('fila-barra-g2');
    expect(screen.getByTestId('guardar-g2')).not.toBeDisabled();
    fireEvent.click(screen.getByTestId('guardar-g2'));
    await waitFor(() => expect(m.campo).toHaveBeenCalledWith('e1', 'g2', null));
  });

  it('7: en un campo con barra, sin cambiar nada no se guarda', async () => {
    abre();
    await screen.findByTestId('fila-barra-g1');
    expect(screen.getByTestId('guardar-g1')).toBeDisabled();
  });

  it('4: las mías, en segunda persona', async () => {
    abre({ propia: true });
    await screen.findByTestId('fila-barra-g1');
    expect(screen.getByTestId('fila-barra-g1')).toHaveTextContent(
      'competitions:tees.source.DEFAULT',
    );
    expect(screen.getByTestId('fila-barra-general')).toHaveTextContent(
      'competitions:tees.usualMine',
    );
  });

  it('TEE_NOT_AVAILABLE al quitar la de un campo: no se puede quitar', async () => {
    m.campo.mockRejectedValue(fallo(422, 'TEE_NOT_AVAILABLE'));
    abre();
    await screen.findByTestId('fila-barra-g2');
    fireEvent.click(screen.getByTestId('guardar-g2'));
    await waitFor(() =>
      expect(m.toast.error).toHaveBeenCalledWith(
        'competitions:tees.errors.cantRemove',
        ARRIBA,
      ),
    );
  });

  it('TEE_NOT_AVAILABLE al fijar la de un campo: el campo no la tiene', async () => {
    m.campo.mockRejectedValue(fallo(422, 'TEE_NOT_AVAILABLE'));
    abre();
    await screen.findByTestId('fila-barra-g2');
    fireEvent.change(
      within(screen.getByTestId('fila-barra-g2')).getByRole('combobox'),
      { target: { value: 'YELLOW' } },
    );
    fireEvent.click(screen.getByTestId('guardar-g2'));
    await waitFor(() =>
      expect(m.toast.error).toHaveBeenCalledWith(
        'competitions:tees.errors.TEE_NOT_AVAILABLE',
        ARRIBA,
      ),
    );
  });

  it('7: su barra propia que el campo ya no tiene sale marcada como no disponible', async () => {
    m.leer.mockResolvedValue({
      ...BARRAS,
      courses: [
        {
          golfCourseId: 'g1',
          golfCourseName: 'Aldeamayor',
          tee: 'GOLD',
          source: 'OWN',
          options: ['BLUE', 'RED'],
        },
      ],
    });
    abre();
    await screen.findByTestId('fila-barra-g1');
    const select = within(screen.getByTestId('fila-barra-g1')).getByRole(
      'combobox',
    );
    expect(select.value).toBe('GOLD');
    expect(
      within(select).getByRole('option', {
        name: /competitions:tees.notAvailableHere/,
      }).value,
    ).toBe('GOLD');
  });

  it('CR1: un cambio propio en un campo ya sin opciones se puede quitar, y se sigue avisando', async () => {
    m.leer.mockResolvedValue({
      ...BARRAS,
      courses: [
        {
          golfCourseId: 'g1',
          golfCourseName: 'Aldeamayor',
          tee: 'GOLD',
          source: 'OWN',
          options: [],
        },
      ],
    });
    abre();
    const fila = await screen.findByTestId('fila-barra-g1');
    expect(fila).toHaveTextContent('competitions:tees.noOptions');
    fireEvent.change(within(fila).getByRole('combobox'), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByTestId('guardar-g1'));
    await waitFor(() => expect(m.campo).toHaveBeenCalledWith('e1', 'g1', null));
  });

  it('E12: las opciones de un campo, en el orden de los selectores', async () => {
    m.leer.mockResolvedValue({
      ...BARRAS,
      courses: [
        {
          golfCourseId: 'g1',
          golfCourseName: 'Aldeamayor',
          tee: null,
          source: 'GENERAL',
          options: ['PINK', 'RED', 'BLACK', 'YELLOW'],
        },
      ],
    });
    abre();
    const fila = await screen.findByTestId('fila-barra-g1');
    expect(
      within(within(fila).getByRole('combobox'))
        .getAllByRole('option')
        .map((o) => o.value),
    ).toEqual(['', 'BLACK', 'YELLOW', 'RED', 'PINK']);
  });

  it('sin permiso, solo se ven', async () => {
    abre({ puedeCambiar: false });
    await screen.findByTestId('fila-barra-g1');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('sin poder leerlas, se dice y se puede reintentar', async () => {
    m.leer.mockRejectedValueOnce(new Error('red'));
    abre();
    expect(await screen.findByTestId('barras-sin-cargar')).toBeInTheDocument();
    fireEvent.click(screen.getByText('competitions:tees.retry'));
    await screen.findByTestId('fila-barra-g1');
  });

  it('F4: se sale siempre', async () => {
    const { onClose } = abre();
    fireEvent.click(screen.getByText('competitions:tees.close'));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('MisBarras', () => {
  it('F2: mi general, lo que juego en cada campo y el aviso del campo sin barra', async () => {
    render(
      <MisBarras
        inscripcion={{ id: 'e1' }}
        puedeCambiar={false}
        conEquipos={false}
      />,
    );
    await screen.findByTestId('mis-barras');
    expect(screen.getByTestId('mis-barras')).toHaveTextContent(
      'competitions:tees.usualMine',
    );
    expect(screen.getByTestId('mi-barra-g1')).toHaveTextContent(
      'competitions:tees.source.DEFAULT',
    );
    expect(screen.getByTestId('pide-barra-g2')).toHaveTextContent(
      'competitions:tees.askOrganiser {"course":"Altea"}',
    );
    expect(
      screen.queryByText('competitions:tees.change'),
    ).not.toBeInTheDocument();
  });

  it('con permiso, «Cambiar» abre mis barras', async () => {
    render(<MisBarras inscripcion={{ id: 'e1' }} puedeCambiar />);
    await screen.findByTestId('mis-barras');
    fireEvent.click(screen.getAllByText('competitions:tees.change')[0]);
    expect(
      await screen.findByText('competitions:tees.mine', {
        selector: 'h2#barras-del-jugador-titulo',
      }),
    ).toBeInTheDocument();
  });
});

/**
 * Pasada del Kind del 21 nov: con la competición terminada o cancelada no se
 * invita a elegir nada, y «Sin barra» no se repite como valor y motivo.
 */
describe('MisBarras y el modal · competición cerrada y sin barra', () => {
  it('cerrada: «Mis barras» no avisa de elegir barra en ningún campo', async () => {
    render(
      <MisBarras inscripcion={{ id: 'e1' }} puedeCambiar={false} cerrada />,
    );
    await screen.findByTestId('mis-barras');
    expect(screen.queryByTestId('elige-barra-g2')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('C9: antes de empezar (puede cambiarla), «Elige tu barra en {campo}»', async () => {
    render(<MisBarras inscripcion={{ id: 'e1' }} puedeCambiar />);
    expect(await screen.findByTestId('elige-barra-g2')).toHaveTextContent(
      'competitions:tees.chooseOnCourse {"course":"Altea"}',
    );
    expect(screen.queryByTestId('pide-barra-g2')).not.toBeInTheDocument();
  });

  it('C8: en juego, en una Ryder, que se la pida a su capitán o al organizador', async () => {
    render(
      <MisBarras inscripcion={{ id: 'e1' }} puedeCambiar={false} conEquipos />,
    );
    expect(await screen.findByTestId('pide-barra-g2')).toHaveTextContent(
      'competitions:tees.askCaptainOrOrganiser {"course":"Altea"}',
    );
    expect(screen.queryByTestId('elige-barra-g2')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toBe(screen.getByTestId('pide-barra-g2'));
  });

  it('C8: sin decir la modalidad, la de los modales: una Ryder', async () => {
    render(<MisBarras inscripcion={{ id: 'e1' }} puedeCambiar={false} />);
    expect(await screen.findByTestId('pide-barra-g2')).toHaveTextContent(
      'competitions:tees.askCaptainOrOrganiser {"course":"Altea"}',
    );
  });

  it('C8: en juego, en stroke play, que se la pida al organizador', async () => {
    render(
      <MisBarras
        inscripcion={{ id: 'e1' }}
        puedeCambiar={false}
        conEquipos={false}
      />,
    );
    expect(await screen.findByTestId('pide-barra-g2')).toHaveTextContent(
      'competitions:tees.askOrganiser {"course":"Altea"}',
    );
    expect(screen.queryByTestId('elige-barra-g2')).not.toBeInTheDocument();
  });

  it('C9: cerrada, tampoco se pide', async () => {
    render(
      <MisBarras
        inscripcion={{ id: 'e1' }}
        puedeCambiar={false}
        conEquipos
        cerrada
      />,
    );
    await screen.findByTestId('mis-barras');
    expect(screen.queryByTestId('pide-barra-g2')).not.toBeInTheDocument();
  });

  it('cerrada: en el modal, el campo sin barra no se resalta como aviso', async () => {
    render(
      <BarrasDelJugadorModal
        inscripcion={{ id: 'e1', userName: 'Ana' }}
        puedeCambiar={false}
        cerrada
        onClose={vi.fn()}
      />,
    );
    const fila = await screen.findByTestId('fila-barra-g2');
    expect(within(fila).getByText(/competitions:tees.noTee/)).not.toHaveClass(
      'text-amber-800',
    );
  });

  it('abierta: en el modal, el campo sin barra sigue resaltado como aviso', async () => {
    render(
      <BarrasDelJugadorModal
        inscripcion={{ id: 'e1', userName: 'Ana' }}
        puedeCambiar={false}
        onClose={vi.fn()}
      />,
    );
    const fila = await screen.findByTestId('fila-barra-g2');
    expect(within(fila).getByText(/competitions:tees.noTee/)).toHaveClass(
      'text-amber-800',
    );
  });

  it('sin barra: «Mis barras» dice «Sin barra» una vez, sin repetirlo como motivo', async () => {
    render(<MisBarras inscripcion={{ id: 'e1' }} puedeCambiar={false} />);
    const fila = await screen.findByTestId('mi-barra-g2');
    expect(fila).toHaveTextContent('competitions:tees.noTee');
    expect(fila).not.toHaveTextContent('competitions:tees.source.NONE');
  });

  it('sin barra: en el modal, igual', async () => {
    render(
      <BarrasDelJugadorModal
        inscripcion={{ id: 'e1', userName: 'Ana' }}
        puedeCambiar={false}
        onClose={vi.fn()}
      />,
    );
    const fila = await screen.findByTestId('fila-barra-g2');
    expect(fila).toHaveTextContent('competitions:tees.noTee');
    expect(fila).not.toHaveTextContent('competitions:tees.sourceOther.NONE');
  });

  it('con barra, el motivo sigue', async () => {
    render(<MisBarras inscripcion={{ id: 'e1' }} puedeCambiar={false} />);
    expect(await screen.findByTestId('mi-barra-g1')).toHaveTextContent(
      'competitions:tees.source.DEFAULT',
    );
  });
});

/**
 * B6/B7: con la competición terminada o cancelada, la barra que jugó en un
 * campo sale como «{Barra} · Jugada» (RyderCupAm #919, source PLAYED).
 */
describe('La barra jugada', () => {
  const JUGADA = {
    generalTee: 'YELLOW',
    defaultTee: 'YELLOW',
    courses: [
      {
        golfCourseId: 'g1',
        golfCourseName: 'Aldeamayor',
        tee: 'BLUE',
        source: 'PLAYED',
        options: [],
      },
    ],
  };

  it('B6: «Mis barras»: «Azules · Jugada»', async () => {
    m.leer.mockResolvedValue(JUGADA);
    render(
      <MisBarras inscripcion={{ id: 'e1' }} puedeCambiar={false} cerrada />,
    );
    const fila = await screen.findByTestId('mi-barra-g1');
    expect(fila).toHaveTextContent('golfCourses:form.teeColors.BLUE');
    expect(fila).toHaveTextContent('competitions:tees.source.PLAYED');
  });

  it('B6: el modal de un jugador, igual', async () => {
    m.leer.mockResolvedValue(JUGADA);
    render(
      <BarrasDelJugadorModal
        inscripcion={{ id: 'e1', userName: 'Ana' }}
        puedeCambiar={false}
        cerrada
        onClose={vi.fn()}
      />,
    );
    const fila = await screen.findByTestId('fila-barra-g1');
    expect(fila).toHaveTextContent('golfCourses:form.teeColors.BLUE');
    expect(fila).toHaveTextContent('competitions:tees.sourceOther.PLAYED');
  });
});

describe('MisBarras · relectura y fallos', () => {
  it('6: sin poder leerlas, se dice y se reintenta', async () => {
    m.leer.mockRejectedValueOnce(new Error('red'));
    render(<MisBarras inscripcion={{ id: 'e1' }} puedeCambiar={false} />);
    expect(
      await screen.findByTestId('mis-barras-sin-cargar'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByText('competitions:tees.retry'));
    expect(await screen.findByTestId('mis-barras')).toBeInTheDocument();
  });

  it('3: al subir la versión (cambió cualquier barra), se vuelven a leer', async () => {
    const { rerender } = render(
      <MisBarras inscripcion={{ id: 'e1' }} puedeCambiar version={0} />,
    );
    await screen.findByTestId('mis-barras');
    expect(m.leer).toHaveBeenCalledTimes(1);
    rerender(<MisBarras inscripcion={{ id: 'e1' }} puedeCambiar version={1} />);
    await waitFor(() => expect(m.leer).toHaveBeenCalledTimes(2));
  });

  it('5: guardar y cerrar mis barras: UNA sola relectura de «Mis barras»', async () => {
    const onCambio = vi.fn();
    render(
      <MisBarras inscripcion={{ id: 'e1' }} puedeCambiar onCambio={onCambio} />,
    );
    await screen.findByTestId('mis-barras');
    fireEvent.click(
      screen.getByRole('button', { name: 'competitions:tees.changeGeneral' }),
    );
    // «Mis barras» (1) y el modal (2)
    const general = await screen.findByLabelText('competitions:tees.general');
    expect(m.leer).toHaveBeenCalledTimes(2);
    fireEvent.change(general, { target: { value: 'BLUE' } });
    fireEvent.click(screen.getByTestId('guardar-general'));
    // El modal relee tras guardar (3); «Mis barras», todavía no
    await waitFor(() => expect(onCambio).toHaveBeenCalledWith(BARRAS));
    expect(m.leer).toHaveBeenCalledTimes(3);
    fireEvent.click(screen.getByText('competitions:tees.close'));
    // Al cerrar, una (4)
    await waitFor(() => expect(m.leer).toHaveBeenCalledTimes(4));
    await new Promise((r) => setTimeout(r, 20));
    expect(m.leer).toHaveBeenCalledTimes(4);
  });

  it('9: cada «Cambiar» con su nombre accesible, con el campo', async () => {
    render(<MisBarras inscripcion={{ id: 'e1' }} puedeCambiar />);
    await screen.findByTestId('mis-barras');
    expect(
      screen.getByRole('button', {
        name: 'competitions:tees.changeOn {"course":"Aldeamayor"}',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'competitions:tees.changeOn {"course":"Altea"}',
      }),
    ).toBeInTheDocument();
  });

  it('4: mi general sin elegir, «Tu habitual»', async () => {
    render(<MisBarras inscripcion={{ id: 'e1' }} puedeCambiar={false} />);
    expect(await screen.findByTestId('mis-barras')).toHaveTextContent(
      'competitions:tees.usualMine',
    );
  });
});

describe('BarrasDeLosCamposModal', () => {
  beforeEach(() => {
    m.campos.mockResolvedValue({
      golf_courses: [
        {
          golf_course: {
            id: 'g1',
            name: 'Aldeamayor',
            tees: [
              { color: 'YELLOW', gender: 'MALE' },
              { color: 'RED', gender: 'FEMALE' },
            ],
          },
        },
      ],
    });
  });

  it('F3: fija la de un campo para las mujeres con las de su género', async () => {
    render(<BarrasDeLosCamposModal competitionId="c1" onClose={vi.fn()} />);
    const select = await screen.findByLabelText(
      'competitions:tees.courses.forWomen',
    );
    expect(
      within(select)
        .getAllByRole('option')
        .map((o) => o.value),
    ).toEqual(['', 'RED']);
    fireEvent.change(select, { target: { value: 'RED' } });
    fireEvent.click(screen.getByTestId('fijar-g1:FEMALE'));
    await waitFor(() =>
      expect(m.delCampo).toHaveBeenCalledWith('c1', 'g1', 'FEMALE', 'RED'),
    );
    expect(m.toast.success).toHaveBeenCalledWith(
      'competitions:tees.courses.saved',
      ARRIBA,
    );
  });

  it('5: TEE_NOT_AVAILABLE al fijarla, con su texto de campo', async () => {
    m.delCampo.mockRejectedValue(fallo(422, 'TEE_NOT_AVAILABLE'));
    render(<BarrasDeLosCamposModal competitionId="c1" onClose={vi.fn()} />);
    fireEvent.change(
      await screen.findByLabelText('competitions:tees.courses.forWomen'),
      { target: { value: 'RED' } },
    );
    fireEvent.click(screen.getByTestId('fijar-g1:FEMALE'));
    await waitFor(() =>
      expect(m.toast.error).toHaveBeenCalledWith(
        'competitions:tees.courses.errors.TEE_NOT_AVAILABLE',
        ARRIBA,
      ),
    );
  });

  it('TEE_NOT_AVAILABLE al quitarla: no se puede quitar', async () => {
    m.fijadas.mockResolvedValue([fijada('g1', 'MALE', 'YELLOW')]);
    m.delCampo.mockRejectedValue(fallo(422, 'TEE_NOT_AVAILABLE'));
    render(<BarrasDeLosCamposModal competitionId="c1" onClose={vi.fn()} />);
    const quitar = await screen.findByTestId('quitar-g1:MALE');
    await waitFor(() => expect(quitar).toBeEnabled());
    fireEvent.click(quitar);
    await waitFor(() =>
      expect(m.toast.error).toHaveBeenCalledWith(
        'competitions:tees.errors.cantRemove',
        ARRIBA,
      ),
    );
  });

  it('CR2: un campo sin barras: avisa y deja quitar para los dos géneros', async () => {
    m.campos.mockResolvedValue({
      golf_courses: [
        { golf_course: { id: 'g9', name: 'Sin barras', tees: [] } },
      ],
    });
    m.fijadas.mockResolvedValue([
      fijada('g9', 'FEMALE', 'RED'),
      fijada('g9', 'MALE', 'YELLOW'),
    ]);
    render(<BarrasDeLosCamposModal competitionId="c1" onClose={vi.fn()} />);
    const quitar = await screen.findByTestId('quitar-g9:FEMALE');
    await waitFor(() => expect(quitar).toBeEnabled());
    fireEvent.click(quitar);
    await waitFor(() =>
      expect(m.delCampo).toHaveBeenCalledWith('c1', 'g9', 'FEMALE', null),
    );
    expect(
      screen.getAllByText('competitions:tees.courses.noTees'),
    ).toHaveLength(2);
    expect(screen.getByTestId('quitar-g9:MALE')).toBeEnabled();
  });

  it('F3: quitarla manda null', async () => {
    m.fijadas.mockResolvedValue([fijada('g1', 'MALE', 'YELLOW')]);
    render(<BarrasDeLosCamposModal competitionId="c1" onClose={vi.fn()} />);
    const quitar = await screen.findByTestId('quitar-g1:MALE');
    await waitFor(() => expect(quitar).toBeEnabled());
    fireEvent.click(quitar);
    await waitFor(() =>
      expect(m.delCampo).toHaveBeenCalledWith('c1', 'g1', 'MALE', null),
    );
    expect(m.toast.success).toHaveBeenCalledWith(
      'competitions:tees.courses.removed',
      ARRIBA,
    );
  });
});

/**
 * A · «Barras de los campos» enseña lo fijado (tabla del 21 nov 2026), leído
 * de GET /competitions/{id}/course-tees.
 */
describe('BarrasDeLosCamposModal · lo fijado', () => {
  beforeEach(() => {
    m.campos.mockResolvedValue({
      golf_courses: [
        {
          golf_course: {
            id: 'g1',
            name: 'Aldeamayor',
            tees: [
              { color: 'YELLOW', gender: 'MALE' },
              { color: 'WHITE', gender: 'MALE' },
              { color: 'RED', gender: 'FEMALE' },
              { color: 'BLUE', gender: 'FEMALE' },
            ],
          },
        },
      ],
    });
  });
  const abre = () =>
    render(<BarrasDeLosCamposModal competitionId="c1" onClose={vi.fn()} />);
  const selector = (texto) =>
    screen.findByLabelText(`competitions:tees.courses.${texto}`);

  it('A1: al abrir, cada campo y género enseña la suya', async () => {
    m.fijadas.mockResolvedValue([
      fijada('g1', 'FEMALE', 'BLUE'),
      fijada('g1', 'MALE', 'WHITE'),
    ]);
    abre();
    await waitFor(async () =>
      expect(await selector('forWomen')).toHaveValue('BLUE'),
    );
    expect(await selector('forMen')).toHaveValue('WHITE');
    expect(m.fijadas).toHaveBeenCalledWith('c1');
    // La fijada que sigue entre las opciones no se repite ni se marca
    expect(
      within(await selector('forWomen'))
        .getAllByRole('option')
        .map((o) => o.value),
    ).toEqual(['', 'BLUE', 'RED']);
    expect(screen.getByTestId('quitar-g1:FEMALE')).toBeEnabled();
    expect(screen.getByTestId('quitar-g1:MALE')).toBeEnabled();
  });

  // La lectura de lo fijado, retenida hasta soltarla con lo que diga: así
  // se comprueba el estado DESPUÉS de recibirla, o con ella aún en camino
  const lecturaRetenida = () => {
    let soltar;
    m.fijadas.mockReturnValue(
      new Promise((resolver) => {
        soltar = resolver;
      }),
    );
    return (filas) =>
      act(async () => {
        soltar(filas);
        await new Promise((r) => setTimeout(r, 0));
      });
  };

  it('A2: sin nada fijado, «Elige una barra» y «Quitar» desactivado', async () => {
    const soltar = lecturaRetenida();
    abre();
    await selector('forWomen');
    await soltar([]);
    expect(await selector('forWomen')).toHaveValue('');
    expect(screen.getByTestId('quitar-g1:FEMALE')).toBeDisabled();
    expect(screen.getByTestId('quitar-g1:MALE')).toBeDisabled();
  });

  it('carrera: la lectura que llega tras «Fijar» no pisa lo fijado', async () => {
    const soltar = lecturaRetenida();
    abre();
    fireEvent.change(await selector('forWomen'), {
      target: { value: 'BLUE' },
    });
    fireEvent.click(screen.getByTestId('fijar-g1:FEMALE'));
    await waitFor(() =>
      expect(m.toast.success).toHaveBeenCalledWith(
        'competitions:tees.courses.saved',
        ARRIBA,
      ),
    );
    await soltar([fijada('g1', 'MALE', 'WHITE')]);
    expect(await selector('forWomen')).toHaveValue('BLUE');
    expect(screen.getByTestId('quitar-g1:FEMALE')).toBeEnabled();
    // Lo que no se tocó, lo que dice la lectura
    expect(await selector('forMen')).toHaveValue('WHITE');
    expect(screen.getByTestId('quitar-g1:MALE')).toBeEnabled();
  });

  it('carrera: lo quitado tampoco vuelve con una lectura vieja', async () => {
    const soltar = lecturaRetenida();
    abre();
    fireEvent.change(await selector('forMen'), {
      target: { value: 'WHITE' },
    });
    fireEvent.click(screen.getByTestId('fijar-g1:MALE'));
    await waitFor(() =>
      expect(screen.getByTestId('quitar-g1:MALE')).toBeEnabled(),
    );
    fireEvent.click(screen.getByTestId('quitar-g1:MALE'));
    await waitFor(() =>
      expect(m.toast.success).toHaveBeenCalledWith(
        'competitions:tees.courses.removed',
        ARRIBA,
      ),
    );
    await soltar([fijada('g1', 'MALE', 'WHITE')]);
    expect(await selector('forMen')).toHaveValue('');
    expect(screen.getByTestId('quitar-g1:MALE')).toBeDisabled();
  });

  it('la fijada que ya no está entre las opciones se ve marcada, y «Fijar» no la manda', async () => {
    m.fijadas.mockResolvedValue([fijada('g1', 'FEMALE', 'GOLD')]);
    abre();
    await waitFor(async () =>
      expect(await selector('forWomen')).toHaveValue('GOLD'),
    );
    const select = await selector('forWomen');
    expect(
      within(select).getByRole('option', {
        name: 'competitions:tees.notAvailableHere {"color":"golfCourses:form.teeColors.GOLD"}',
      }),
    ).toHaveValue('GOLD');
    expect(
      within(select)
        .getAllByRole('option')
        .map((o) => o.value),
    ).toEqual(['', 'GOLD', 'BLUE', 'RED']);
    expect(screen.getByTestId('fijar-g1:FEMALE')).toBeDisabled();
    expect(screen.getByTestId('quitar-g1:FEMALE')).toBeEnabled();
    // Elegida otra, ya se puede fijar
    fireEvent.change(select, { target: { value: 'RED' } });
    expect(screen.getByTestId('fijar-g1:FEMALE')).toBeEnabled();
  });

  it('sin opciones para un género, la fijada se sigue viendo, marcada', async () => {
    m.campos.mockResolvedValue({
      golf_courses: [
        {
          golf_course: {
            id: 'g1',
            name: 'Aldeamayor',
            tees: [{ color: 'YELLOW', gender: 'MALE' }],
          },
        },
      ],
    });
    m.fijadas.mockResolvedValue([fijada('g1', 'FEMALE', 'RED')]);
    abre();
    await waitFor(async () =>
      expect(await selector('forWomen')).toHaveValue('RED'),
    );
    expect(screen.getByTestId('fijar-g1:FEMALE')).toBeDisabled();
    expect(screen.getByTestId('quitar-g1:FEMALE')).toBeEnabled();
  });

  it('A3: tras «Fijar», se queda en la elegida y «Quitar» se activa', async () => {
    const soltar = lecturaRetenida();
    abre();
    await selector('forWomen');
    await soltar([]);
    fireEvent.change(await selector('forWomen'), {
      target: { value: 'BLUE' },
    });
    fireEvent.click(screen.getByTestId('fijar-g1:FEMALE'));
    await waitFor(() =>
      expect(screen.getByTestId('quitar-g1:FEMALE')).toBeEnabled(),
    );
    expect(await selector('forWomen')).toHaveValue('BLUE');
    expect(screen.getByTestId('quitar-g1:MALE')).toBeDisabled();
  });

  it('A4: tras «Quitar», vuelve a «Elige una barra» y «Quitar» se desactiva', async () => {
    m.fijadas.mockResolvedValue([fijada('g1', 'MALE', 'WHITE')]);
    abre();
    await waitFor(async () =>
      expect(await selector('forMen')).toHaveValue('WHITE'),
    );
    fireEvent.click(screen.getByTestId('quitar-g1:MALE'));
    await waitFor(() =>
      expect(m.toast.success).toHaveBeenCalledWith(
        'competitions:tees.courses.removed',
        ARRIBA,
      ),
    );
    await waitFor(() =>
      expect(screen.getByTestId('fijar-g1:MALE')).toBeDisabled(),
    );
    expect(screen.getByTestId('quitar-g1:MALE')).toBeDisabled();
    expect(await selector('forMen')).toHaveValue('');
    expect(m.delCampo).toHaveBeenCalledWith('c1', 'g1', 'MALE', null);
  });

  it('A4: un fallo al quitar deja lo fijado como estaba', async () => {
    m.fijadas.mockResolvedValue([fijada('g1', 'MALE', 'WHITE')]);
    m.delCampo.mockRejectedValue(fallo(500));
    abre();
    await waitFor(async () =>
      expect(await selector('forMen')).toHaveValue('WHITE'),
    );
    fireEvent.click(screen.getByTestId('quitar-g1:MALE'));
    await waitFor(() => expect(m.toast.error).toHaveBeenCalled());
    expect(await selector('forMen')).toHaveValue('WHITE');
    expect(screen.getByTestId('quitar-g1:MALE')).toBeEnabled();
  });

  it('A5: si la lectura falla, el modal se abre, avisa y se puede fijar', async () => {
    m.fijadas.mockRejectedValue(fallo(500));
    abre();
    await waitFor(() =>
      expect(m.toast.error).toHaveBeenCalledWith(
        'competitions:tees.errors.generic',
        ARRIBA,
      ),
    );
    fireEvent.change(await selector('forWomen'), {
      target: { value: 'RED' },
    });
    fireEvent.click(screen.getByTestId('fijar-g1:FEMALE'));
    await waitFor(() =>
      expect(m.delCampo).toHaveBeenCalledWith('c1', 'g1', 'FEMALE', 'RED'),
    );
  });

  it('A5: sin saber lo fijado, «Quitar» sigue a mano', async () => {
    m.fijadas.mockRejectedValue(fallo(500));
    abre();
    await waitFor(() => expect(m.toast.error).toHaveBeenCalled());
    expect(screen.getByTestId('quitar-g1:MALE')).toBeEnabled();
  });
});

/**
 * D10: en los modales de la ficha, lo pendiente con su palabra: «partida» en
 * stroke play, «partido» en una Ryder.
 */
describe('Los fallos de lo pendiente según la modalidad', () => {
  const guardaLaGeneral = async () => {
    fireEvent.change(
      await screen.findByLabelText('competitions:tees.general'),
      { target: { value: 'BLUE' } },
    );
    fireEvent.click(screen.getByTestId('guardar-general'));
  };

  it.each([
    [false, 'competitions:tees.errorsStrokePlay.TEE_NOT_ON_PENDING_COURSE'],
    [true, 'competitions:tees.errors.TEE_NOT_ON_PENDING_COURSE'],
  ])('el modal de un jugador (conEquipos %s)', async (conEquipos, clave) => {
    m.general.mockRejectedValue(fallo(422, 'TEE_NOT_ON_PENDING_COURSE'));
    render(
      <BarrasDelJugadorModal
        inscripcion={{ id: 'e1', userName: 'Ana' }}
        puedeCambiar
        conEquipos={conEquipos}
        onClose={vi.fn()}
      />,
    );
    await guardaLaGeneral();
    await waitFor(() =>
      expect(m.toast.error).toHaveBeenCalledWith(clave, ARRIBA),
    );
  });

  it('«Mis barras» pasa la modalidad a su modal', async () => {
    m.general.mockRejectedValue(fallo(422, 'PENDING_GAME_NOT_RECALCULABLE'));
    render(
      <MisBarras inscripcion={{ id: 'e1' }} puedeCambiar conEquipos={false} />,
    );
    await screen.findByTestId('mis-barras');
    fireEvent.click(screen.getAllByText('competitions:tees.change')[0]);
    await guardaLaGeneral();
    await waitFor(() =>
      expect(m.toast.error).toHaveBeenCalledWith(
        'competitions:tees.errorsStrokePlay.PENDING_GAME_NOT_RECALCULABLE',
        ARRIBA,
      ),
    );
  });

  it.each([
    [false, 'competitions:tees.errorsStrokePlay.cantRemove'],
    [true, 'competitions:tees.errors.cantRemove'],
  ])(
    'el modal de los campos, al no poder quitarla (conEquipos %s)',
    async (conEquipos, clave) => {
      m.campos.mockResolvedValue({
        golf_courses: [
          {
            golf_course: {
              id: 'g1',
              name: 'Aldeamayor',
              tees: [{ color: 'YELLOW', gender: 'MALE' }],
            },
          },
        ],
      });
      m.fijadas.mockResolvedValue([fijada('g1', 'MALE', 'YELLOW')]);
      m.delCampo.mockRejectedValue(fallo(422, 'TEE_NOT_AVAILABLE'));
      render(
        <BarrasDeLosCamposModal
          competitionId="c1"
          conEquipos={conEquipos}
          onClose={vi.fn()}
        />,
      );
      await waitFor(() =>
        expect(screen.getByTestId('quitar-g1:MALE')).toBeEnabled(),
      );
      fireEvent.click(screen.getByTestId('quitar-g1:MALE'));
      await waitFor(() =>
        expect(m.toast.error).toHaveBeenCalledWith(clave, ARRIBA),
      );
    },
  );
});

describe('FilaDeAprobado · sus barras', () => {
  const pinta = (puede) => {
    const onAbrirBarras = vi.fn();
    render(
      <FilaDeAprobado
        enrollment={{ id: 'e1', userId: 'ana', userName: 'Ana' }}
        competition={{ captains: {}, team1Name: 'A', team2Name: 'B' }}
        t={(c) => c}
        i18n={{ language: 'es' }}
        canManage
        esStrokePlay={false}
        sinHandicap={new Set()}
        puedeVerSusBarras={() => puede}
        onAbrirBarras={onAbrirBarras}
      />,
    );
    return onAbrirBarras;
  };

  it('con permiso, «Barras» abre las suyas', () => {
    const onAbrirBarras = pinta(true);
    fireEvent.click(screen.getByTestId('barras-de-ana'));
    expect(onAbrirBarras).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'e1' }),
    );
  });

  it('sin permiso, no hay botón', () => {
    pinta(false);
    expect(screen.queryByTestId('barras-de-ana')).not.toBeInTheDocument();
  });
});
