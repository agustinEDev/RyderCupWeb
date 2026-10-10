import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';

/**
 * Las franjas de un Stableford o un Medal en la ficha (FE #824, PR 3). La
 * tabla aprobada el 10 oct 2026:
 *
 *   #    caso                                   | qué pasa
 *   -----|-----------------------------------------|----------------------------------
 *   1    con franjas                             | por jornada: horas, salidas, cupo, apuntados
 *   2    sin franjas                             | «aún no hay» y, al organizador, añadir
 *   3    quien no organiza                       | solo lectura
 *   4    añadir                                  | día con hueco, franja libre, campo y hoja propuesta
 *   5    hoja imposible                          | error en línea; no se envía
 *   6    guardar                                 | POST con la hoja y sin formato; se relee
 *   7    el servidor rechaza                     | su mensaje; el formulario sigue con lo escrito
 *   8    cambiar                                 | en línea: hoja y campo; PUT y se relee
 *   9    borrar                                  | confirmación en línea
 *   11   la suma de cupos no llega al máximo     | «caben 76 de 100»
 *   12   la ficha sabe si hay franjas            | `onAgenda` con lo leído
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (clave, params) => (params ? `${clave} ${JSON.stringify(params)}` : clave),
    i18n: { language: 'es' },
  }),
}));

const mockToast = { error: vi.fn(), success: vi.fn() };
vi.mock('../../utils/toast', () => ({ default: mockToast }));

const mockLeer = vi.fn();
const mockCampos = vi.fn();
const mockCrear = vi.fn();
const mockCambiar = vi.fn();
const mockBorrar = vi.fn();
vi.mock('../../composition', () => ({
  getScheduleUseCase: { execute: (...a) => mockLeer(...a) },
  getCompetitionGolfCoursesUseCase: { execute: (...a) => mockCampos(...a) },
  createRoundUseCase: { execute: (...a) => mockCrear(...a) },
  updateRoundUseCase: { execute: (...a) => mockCambiar(...a) },
  deleteRoundUseCase: { execute: (...a) => mockBorrar(...a) },
}));

const FranjasDeLaCompeticion = (await import('./FranjasDeLaCompeticion')).default;

const hoja = (extra = {}) => ({
  firstTeeTime: '08:00',
  lastTeeTime: '11:50',
  intervalMinutes: 10,
  groupSize: 4,
  teeTimes: [],
  capacity: 96,
  placesTaken: 12,
  playerIds: [],
  waitingIds: ['u-1', 'u-2', 'u-3'],
  ...extra,
});

const franja = (extra = {}) => ({
  id: 'r-1',
  golfCourseId: 'g-1',
  roundDate: '2030-10-12',
  sessionType: 'MORNING',
  status: 'PENDING_MATCHES',
  matches: [],
  teeSheet: hoja(),
  ...extra,
});

const CAMPOS = [
  { golf_course: { id: 'g-1', name: 'La Resina', country_code: 'ES', approval_status: 'APPROVED' } },
  { golf_course: { id: 'g-2', name: 'El Robledal', country_code: 'ES', approval_status: 'APPROVED' } },
];

const pinta = (props = {}) =>
  render(
    <FranjasDeLaCompeticion
      competitionId="c-1"
      startDate="2030-10-12"
      endDate="2030-10-13"
      canManage
      maxPlayers={100}
      {...props}
    />
  );

describe('FranjasDeLaCompeticion (FE #824)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLeer.mockResolvedValue({ rounds: [franja()], teeSheetCapacity: 96 });
    mockCampos.mockResolvedValue(CAMPOS);
    mockCrear.mockResolvedValue({ id: 'r-2' });
    mockCambiar.mockResolvedValue({ id: 'r-1' });
    mockBorrar.mockResolvedValue({ id: 'r-1', deleted: true });
  });

  it('1: cada franja dice sus horas, sus salidas y su cupo, y quién hay', async () => {
    pinta();

    const fila = await screen.findByTestId('franja-r-1');
    expect(within(fila).getByText('sessions.MORNING')).toBeInTheDocument();
    expect(fila).toHaveTextContent('franjas.hours {"primera":"08:00","ultima":"11:50","intervalo":10}');
    expect(fila).toHaveTextContent('franjas.capacity {"salidas":24,"tamano":4,"cupo":96}');
    expect(fila).toHaveTextContent('franjas.taken {"apuntados":12,"espera":3}');
    // Con más de un campo, el suyo
    expect(await within(fila).findByText('La Resina')).toBeInTheDocument();
  });

  it('1b: agrupadas por jornada', async () => {
    mockLeer.mockResolvedValue({
      rounds: [franja(), franja({ id: 'r-2', roundDate: '2030-10-13' })],
      teeSheetCapacity: 192,
    });
    pinta();

    expect(await screen.findByTestId('franjas-dia-2030-10-12')).toContainElement(screen.getByTestId('franja-r-1'));
    expect(screen.getByTestId('franjas-dia-2030-10-13')).toContainElement(screen.getByTestId('franja-r-2'));
  });

  it('2: sin franjas lo dice, y al organizador le ofrece añadir', async () => {
    mockLeer.mockResolvedValue({ rounds: [], teeSheetCapacity: 0 });
    pinta();

    expect(await screen.findByText('franjas.emptyManage')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'franjas.add' })).toBeInTheDocument();
  });

  it('3: quien no organiza solo mira', async () => {
    pinta({ canManage: false });

    await screen.findByTestId('franja-r-1');
    expect(screen.queryByRole('button', { name: 'franjas.add' })).toBeNull();
    expect(screen.queryByRole('button', { name: /^franjas\.change/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^franjas\.remove/ })).toBeNull();
  });

  it('4: al añadir propone un día con hueco, una franja libre y su hoja', async () => {
    pinta();
    fireEvent.click(await screen.findByRole('button', { name: 'franjas.add' }));

    // El 12 tiene la de mañana: la primera libre es la tarde
    expect(screen.getByLabelText('franjas.day')).toHaveValue('2030-10-12');
    expect(screen.getByLabelText('franjas.slot')).toHaveValue('AFTERNOON');
    expect(screen.getByLabelText('franjas.firstTee')).toHaveValue('12:00');
    expect(screen.getByLabelText('franjas.lastTee')).toHaveValue('17:50');
    expect(screen.getByLabelText('franjas.interval')).toHaveValue(10);
    expect(screen.getByLabelText('franjas.groupSize')).toHaveValue('4');
    expect(screen.getByTestId('franjas-resumen-nueva')).toHaveTextContent(
      'franjas.capacity {"salidas":36,"tamano":4,"cupo":144}'
    );
  });

  it('4b: cambiar de franja repone las horas propuestas…', async () => {
    pinta();
    fireEvent.click(await screen.findByRole('button', { name: 'franjas.add' }));

    fireEvent.change(screen.getByLabelText('franjas.slot'), { target: { value: 'EVENING' } });

    expect(screen.getByLabelText('franjas.firstTee')).toHaveValue('18:00');
    expect(screen.getByLabelText('franjas.lastTee')).toHaveValue('23:50');
  });

  it('4c: …salvo que el organizador ya las haya tocado', async () => {
    pinta();
    fireEvent.click(await screen.findByRole('button', { name: 'franjas.add' }));
    fireEvent.change(screen.getByLabelText('franjas.firstTee'), { target: { value: '13:00' } });

    fireEvent.change(screen.getByLabelText('franjas.slot'), { target: { value: 'EVENING' } });

    expect(screen.getByLabelText('franjas.firstTee')).toHaveValue('13:00');
  });

  it('4e: cambiar el intervalo o el tamaño no impide reponer las horas (revisor)', async () => {
    pinta();
    fireEvent.click(await screen.findByRole('button', { name: 'franjas.add' }));
    fireEvent.change(screen.getByLabelText('franjas.groupSize'), { target: { value: '3' } });

    fireEvent.change(screen.getByLabelText('franjas.slot'), { target: { value: 'EVENING' } });

    expect(screen.getByLabelText('franjas.firstTee')).toHaveValue('18:00');
    expect(screen.getByLabelText('franjas.lastTee')).toHaveValue('23:50');
    // Y lo que sí eligió se queda
    expect(screen.getByLabelText('franjas.groupSize')).toHaveValue('3');
  });

  it('4f: si al releer la franja elegida ya no está libre, se propone la siguiente (revisor)', async () => {
    const { rerender } = pinta();
    fireEvent.click(await screen.findByRole('button', { name: 'franjas.add' }));
    expect(screen.getByLabelText('franjas.slot')).toHaveValue('AFTERNOON');
    mockLeer.mockResolvedValue({
      rounds: [franja(), franja({ id: 'r-2', sessionType: 'AFTERNOON' })],
      teeSheetCapacity: 192,
    });

    rerender(
      <FranjasDeLaCompeticion competitionId="c-1" startDate="2030-10-12" endDate="2030-10-13" canManage maxPlayers={100} version="2" />
    );

    await waitFor(() => expect(screen.getByLabelText('franjas.slot')).toHaveValue('EVENING'));
    expect(screen.getByLabelText('franjas.firstTee')).toHaveValue('18:00');
  });

  it('4g: sin campos, «Añadir» dice por qué no se puede', async () => {
    mockCampos.mockResolvedValue([]);
    pinta();

    expect(await screen.findByText('franjas.noCourses')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'franjas.add' })).toBeDisabled();
  });

  it('4h: con todas las jornadas llenas, también', async () => {
    mockLeer.mockResolvedValue({
      rounds: ['2030-10-12', '2030-10-13'].flatMap((dia) =>
        ['MORNING', 'AFTERNOON', 'EVENING'].map((s) => franja({ id: `${dia}-${s}`, roundDate: dia, sessionType: s }))
      ),
      teeSheetCapacity: 576,
    });
    pinta();

    expect(await screen.findByText('franjas.allFull')).toBeInTheDocument();
  });

  it('4d: el día que ya tiene las tres no se ofrece', async () => {
    mockLeer.mockResolvedValue({
      rounds: ['MORNING', 'AFTERNOON', 'EVENING'].map((s, i) => franja({ id: `r-${i}`, sessionType: s })),
      teeSheetCapacity: 288,
    });
    pinta();
    fireEvent.click(await screen.findByRole('button', { name: 'franjas.add' }));

    const dias = [...screen.getByLabelText('franjas.day').options].map((o) => o.value);
    expect(dias).toEqual(['2030-10-13']);
  });

  it('5: una hoja imposible dice por qué y no se envía', async () => {
    pinta();
    fireEvent.click(await screen.findByRole('button', { name: 'franjas.add' }));

    fireEvent.change(screen.getByLabelText('franjas.interval'), { target: { value: '25' } });

    expect(screen.getByRole('alert')).toHaveTextContent('franjas.errors.intervalRange');
    expect(screen.getByRole('button', { name: 'franjas.save' })).toBeDisabled();
  });

  it('6: guardar crea la franja con su hoja, sin formato, y vuelve a leer', async () => {
    pinta();
    fireEvent.click(await screen.findByRole('button', { name: 'franjas.add' }));
    fireEvent.change(screen.getByLabelText('franjas.course'), { target: { value: 'g-2' } });

    fireEvent.click(screen.getByRole('button', { name: 'franjas.save' }));

    await waitFor(() =>
      expect(mockCrear).toHaveBeenCalledWith('c-1', {
        golf_course_id: 'g-2',
        round_date: '2030-10-12',
        session_type: 'AFTERNOON',
        tee_sheet: { first_tee_time: '12:00', last_tee_time: '17:50', interval_minutes: 10, group_size: 4 },
      })
    );
    await waitFor(() => expect(mockLeer).toHaveBeenCalledTimes(2));
    expect(screen.queryByLabelText('franjas.day')).toBeNull();
  });

  it('7: si el servidor la rechaza, su motivo, y lo escrito sigue ahí', async () => {
    mockCrear.mockRejectedValue(new Error('Se solapa con la franja MORNING de ese día en el mismo campo'));
    pinta();
    fireEvent.click(await screen.findByRole('button', { name: 'franjas.add' }));
    fireEvent.change(screen.getByLabelText('franjas.firstTee'), { target: { value: '11:00' } });

    fireEvent.click(screen.getByRole('button', { name: 'franjas.save' }));

    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith('Se solapa con la franja MORNING de ese día en el mismo campo')
    );
    expect(screen.getByLabelText('franjas.firstTee')).toHaveValue('11:00');
  });

  it('8: cambiar abre la franja con sus valores y manda la hoja nueva', async () => {
    pinta();
    fireEvent.click(await screen.findByRole('button', { name: /^franjas\.change/ }));

    expect(screen.getByLabelText('franjas.firstTee')).toHaveValue('08:00');
    fireEvent.change(screen.getByLabelText('franjas.lastTee'), { target: { value: '10:50' } });
    fireEvent.click(screen.getByRole('button', { name: 'franjas.save' }));

    await waitFor(() =>
      expect(mockCambiar).toHaveBeenCalledWith('r-1', {
        tee_sheet: { first_tee_time: '08:00', last_tee_time: '10:50', interval_minutes: 10, group_size: 4 },
      })
    );
    await waitFor(() => expect(mockLeer).toHaveBeenCalledTimes(2));
  });

  it('8b: solo el campo, si solo cambia el campo (revisor)', async () => {
    pinta();
    fireEvent.click(await screen.findByRole('button', { name: /^franjas\.change/ }));

    fireEvent.change(screen.getByLabelText('franjas.course'), { target: { value: 'g-2' } });
    fireEvent.click(screen.getByRole('button', { name: 'franjas.save' }));

    await waitFor(() => expect(mockCambiar).toHaveBeenCalled());
    expect(mockCambiar.mock.calls[0][1]).toEqual({ golf_course_id: 'g-2' });
  });

  it('8d: los botones dicen de qué franja son (revisor)', async () => {
    pinta();

    await screen.findByTestId('franja-r-1');
    expect(screen.getByRole('button', { name: /^franjas\.change.*"franja":"sessions\.MORNING"/ })).toBeInTheDocument();
  });

  it('8e: una franja sin hoja (de antes) no se ofrece a cambiar', async () => {
    mockLeer.mockResolvedValue({ rounds: [franja({ teeSheet: null })], teeSheetCapacity: 0 });
    pinta();

    await screen.findByTestId('franja-r-1');
    expect(screen.queryByRole('button', { name: /^franjas\.change/ })).toBeNull();
  });

  it('8c: si el servidor no deja (alguien perdería su plaza), su motivo', async () => {
    mockCambiar.mockRejectedValue(new Error('La franja quedaría con 40 plazas y tiene 48 jugadores dentro'));
    pinta();
    fireEvent.click(await screen.findByRole('button', { name: /^franjas\.change/ }));
    fireEvent.change(screen.getByLabelText('franjas.lastTee'), { target: { value: '09:30' } });

    fireEvent.click(screen.getByRole('button', { name: 'franjas.save' }));

    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith('La franja quedaría con 40 plazas y tiene 48 jugadores dentro')
    );
    expect(screen.getByLabelText('franjas.lastTee')).toHaveValue('09:30');
  });

  it('9: borrar pide confirmación en línea', async () => {
    pinta();
    fireEvent.click(await screen.findByRole('button', { name: /^franjas\.remove/ }));

    expect(mockBorrar).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'franjas.yes' }));

    await waitFor(() => expect(mockBorrar).toHaveBeenCalledWith('r-1'));
  });

  it('9c: un doble toque en «Sí» no borra dos veces (revisor)', async () => {
    mockBorrar.mockReturnValue(new Promise(() => {}));
    pinta();
    fireEvent.click(await screen.findByRole('button', { name: /^franjas\.remove/ }));

    fireEvent.click(screen.getByRole('button', { name: 'franjas.yes' }));
    fireEvent.click(screen.getByRole('button', { name: 'franjas.yes' }));

    expect(mockBorrar).toHaveBeenCalledTimes(1);
  });

  it('9b: con gente dentro, el motivo del servidor', async () => {
    mockBorrar.mockRejectedValue(new Error('La franja tiene 12 jugadores con plaza'));
    pinta();
    fireEvent.click(await screen.findByRole('button', { name: /^franjas\.remove/ }));
    fireEvent.click(screen.getByRole('button', { name: 'franjas.yes' }));

    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith('La franja tiene 12 jugadores con plaza'));
  });

  it('11: si con las franjas no caben todos, lo dice', async () => {
    pinta({ maxPlayers: 100 });

    expect(await screen.findByTestId('franjas-cupo-corto')).toHaveTextContent(
      'franjas.capacityShort {"caben":96,"maximo":100}'
    );
  });

  it('1c: las salidas son las que dice el servidor', async () => {
    mockLeer.mockResolvedValue({
      rounds: [franja({ teeSheet: hoja({ teeTimes: ['08:00', '08:10', '08:20'], capacity: 12 }) })],
      teeSheetCapacity: 12,
    });
    pinta();

    expect(await screen.findByTestId('franja-r-1')).toHaveTextContent('franjas.capacity {"salidas":3,"tamano":4,"cupo":12}');
  });

  it('5b: el campo que falla se marca', async () => {
    pinta();
    fireEvent.click(await screen.findByRole('button', { name: 'franjas.add' }));

    fireEvent.change(screen.getByLabelText('franjas.interval'), { target: { value: '25' } });

    expect(screen.getByLabelText('franjas.interval')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('franjas.firstTee')).not.toHaveAttribute('aria-invalid');
  });

  it('11c: sin máximo de jugadores no pinta un «0» suelto', async () => {
    pinta({ maxPlayers: 0 });

    await screen.findByTestId('franja-r-1');
    const sueltos = [...screen.getByTestId('franjas').childNodes].filter((n) => n.nodeType === 3);
    expect(sueltos.map((n) => n.textContent)).not.toContain('0');
    expect(screen.queryByTestId('franjas-cupo-corto')).toBeNull();
  });

  it('11b: si caben, nada', async () => {
    pinta({ maxPlayers: 80 });

    await screen.findByTestId('franja-r-1');
    expect(screen.queryByTestId('franjas-cupo-corto')).toBeNull();
  });

  it('12: la ficha recibe lo leído (para ofrecer iniciar)', async () => {
    const onAgenda = vi.fn();
    pinta({ onAgenda });

    await waitFor(() => expect(onAgenda).toHaveBeenLastCalledWith(expect.objectContaining({ rounds: [expect.anything()] })));
  });
});
