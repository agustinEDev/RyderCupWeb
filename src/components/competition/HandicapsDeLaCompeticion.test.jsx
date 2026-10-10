import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

/**
 * La tarjeta «Hándicaps» del organizador (FE #824, PR 5). Tabla aprobada el
 * 11 oct 2026:
 *
 *   #    caso                          | qué pasa
 *   -----|---------------------------------|-----------------------------------------
 *   6    en marcha                      | «actualizando, faltan N»; se relee cada 15 s
 *   7    completa                       | cuándo terminó
 *   8    incompleta                     | quién quedó sin actualizar; el botón la termina
 *   9    cortada                        | se dice
 *   10   ventana abierta                | botón activo y «hasta …» (o «hasta iniciar»)
 *   11   ventana cerrada                | botón desactivado y el motivo del servidor
 *   12   lanzar                         | se lanza y se relee; un 409, su motivo
 *   13   programada                     | cuándo (hora del campo) y «Anular»
 *   14   programar                      | fecha y hora del campo, con su huso; el servidor manda
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (clave, p) => (p ? `${clave} ${JSON.stringify(p)}` : clave),
    i18n: { language: 'es' },
  }),
}));

const mockToast = { error: vi.fn(), success: vi.fn() };
vi.mock('../../utils/toast', () => ({ default: mockToast }));

const mockLanzar = vi.fn();
const mockProgramar = vi.fn();
const mockAnular = vi.fn();
const mockCampos = vi.fn();
vi.mock('../../composition', () => ({
  launchHandicapUpdateUseCase: { execute: (...a) => mockLanzar(...a) },
  scheduleHandicapUpdateUseCase: { execute: (...a) => mockProgramar(...a) },
  cancelScheduledHandicapUpdateUseCase: { execute: (...a) => mockAnular(...a) },
  getCompetitionGolfCoursesUseCase: { execute: (...a) => mockCampos(...a) },
}));

const HandicapsDeLaCompeticion = (await import('./HandicapsDeLaCompeticion')).default;

const ABIERTA = { open: true, closesAt: '2030-10-12T05:40:00Z', reason: null, scheduledAt: null };
const pinta = (props = {}) => {
  const releer = vi.fn();
  render(
    <HandicapsDeLaCompeticion
      competitionId="c-1"
      handicapUpdate={null}
      handicapUpdateWindow={ABIERTA}
      onReleer={releer}
      {...props}
    />
  );
  return releer;
};

describe('HandicapsDeLaCompeticion (FE #824, PR 5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCampos.mockResolvedValue([{ golf_course: { id: 'g-1', name: 'La Resina', timezone: 'Europe/Madrid' } }]);
    mockLanzar.mockResolvedValue({ status: 'IN_PROGRESS', resumed: false });
    mockProgramar.mockResolvedValue({});
    mockAnular.mockResolvedValue();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('6: en marcha dice cuántos faltan y se relee cada 15 s, hasta que acaba', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const actualizacion = { status: 'IN_PROGRESS', origin: 'ORGANIZER', startedAt: '2030-10-10T20:05:00Z', finishedAt: null, pendingPlayers: [{ userId: 'a', name: 'Ana' }, { userId: 'b', name: 'Bea' }] };
    const releer = vi.fn();
    const { rerender } = render(
      <HandicapsDeLaCompeticion competitionId="c-1" handicapUpdate={actualizacion} handicapUpdateWindow={ABIERTA} onReleer={releer} />
    );

    expect(screen.getByTestId('handicaps-estado')).toHaveTextContent('handicaps.inProgress {"count":2}');
    await act(async () => vi.advanceTimersByTime(15000));
    expect(releer).toHaveBeenCalledTimes(1);

    rerender(
      <HandicapsDeLaCompeticion competitionId="c-1" handicapUpdate={{ ...actualizacion, status: 'COMPLETED', finishedAt: '2030-10-10T20:09:00Z' }} handicapUpdateWindow={ABIERTA} onReleer={releer} />
    );
    await act(async () => vi.advanceTimersByTime(30000));
    expect(releer).toHaveBeenCalledTimes(1);
  });

  it('7: completa dice cuándo', async () => {
    pinta({ handicapUpdate: { status: 'COMPLETED', origin: 'ENROLLMENTS_CLOSED', startedAt: 'x', finishedAt: '2030-10-10T20:09:00Z', pendingPlayers: [] } });

    expect(await screen.findByTestId('handicaps-estado')).toHaveTextContent(/^handicaps\.completed/);
  });

  it('8: incompleta nombra a quién falta', async () => {
    pinta({ handicapUpdate: { status: 'INCOMPLETE', origin: 'ORGANIZER', startedAt: 'x', finishedAt: '2030-10-10T20:09:00Z', pendingPlayers: [{ userId: 'a', name: 'Ana Alba' }] } });

    expect(await screen.findByTestId('handicaps-estado')).toHaveTextContent(/^handicaps\.incomplete/);
    expect(screen.getByTestId('handicaps-pendientes')).toHaveTextContent('Ana Alba');
  });

  it('9: cortada se dice', async () => {
    pinta({ handicapUpdate: { status: 'STOPPED', origin: 'SCHEDULED', startedAt: 'x', finishedAt: null, pendingPlayers: [] } });

    expect(await screen.findByTestId('handicaps-estado')).toHaveTextContent('handicaps.stopped');
  });

  it('10: abierta, el botón activo y hasta cuándo (hora del campo)', async () => {
    pinta();

    expect(screen.getByRole('button', { name: 'handicaps.update' })).toBeEnabled();
    expect(await screen.findByTestId('handicaps-ventana')).toHaveTextContent(/^handicaps\.openUntil .*7:40/);
  });

  it('10b: sin cierre de ventana, hasta iniciar', async () => {
    pinta({ handicapUpdateWindow: { ...ABIERTA, closesAt: null } });

    expect(await screen.findByTestId('handicaps-ventana')).toHaveTextContent('handicaps.openUntilStart');
  });

  it('11: cerrada, el botón desactivado y el motivo del servidor', async () => {
    pinta({ handicapUpdateWindow: { open: false, closesAt: null, reason: 'Hay una jornada en marcha: se podrá al acabar el día.', scheduledAt: null } });

    expect(screen.getByRole('button', { name: 'handicaps.update' })).toBeDisabled();
    expect(await screen.findByTestId('handicaps-ventana')).toHaveTextContent('Hay una jornada en marcha');
  });

  it('11b: con una en marcha el botón no se ofrece activo (sería un 409)', async () => {
    pinta({ handicapUpdate: { status: 'IN_PROGRESS', origin: 'ORGANIZER', startedAt: 'x', finishedAt: null, pendingPlayers: [] } });

    expect(screen.getByRole('button', { name: 'handicaps.update' })).toBeDisabled();
  });

  it('12: lanzar la lanza y relee', async () => {
    const releer = pinta();

    fireEvent.click(screen.getByRole('button', { name: 'handicaps.update' }));

    await waitFor(() => expect(mockLanzar).toHaveBeenCalledWith('c-1'));
    expect(mockToast.success).toHaveBeenCalledWith('handicaps.launched');
    expect(releer).toHaveBeenCalled();
  });

  it('12b: si reanuda una incompleta, lo dice', async () => {
    mockLanzar.mockResolvedValue({ status: 'IN_PROGRESS', resumed: true });
    pinta();

    fireEvent.click(screen.getByRole('button', { name: 'handicaps.update' }));

    await waitFor(() => expect(mockToast.success).toHaveBeenCalledWith('handicaps.resumed'));
  });

  it('12c: un 409, su motivo', async () => {
    mockLanzar.mockRejectedValue(new Error('Ya se están actualizando los hándicaps.'));
    pinta();

    fireEvent.click(screen.getByRole('button', { name: 'handicaps.update' }));

    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith('Ya se están actualizando los hándicaps.'));
  });

  it('13: programada, cuándo en la hora del campo y anular', async () => {
    const releer = pinta({ handicapUpdateWindow: { ...ABIERTA, scheduledAt: '2030-10-12T01:00:00Z' } });

    expect(await screen.findByTestId('handicaps-programada')).toHaveTextContent(/^handicaps\.scheduled .*3:00.*Europe\/Madrid/);
    fireEvent.click(screen.getByRole('button', { name: 'handicaps.cancelSchedule' }));

    await waitFor(() => expect(mockAnular).toHaveBeenCalledWith('c-1'));
    expect(releer).toHaveBeenCalled();
  });

  it('14: programar, en la hora del campo y con su huso', async () => {
    const releer = pinta();
    await waitFor(() => expect(screen.getByRole('button', { name: 'handicaps.schedule' })).toBeEnabled());

    fireEvent.click(screen.getByRole('button', { name: 'handicaps.schedule' }));
    fireEvent.change(await screen.findByLabelText(/^handicaps\.scheduleAt/), { target: { value: '2030-10-12T03:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'handicaps.scheduleSave' }));

    await waitFor(() => expect(mockProgramar).toHaveBeenCalledWith('c-1', '2030-10-12T03:00:00+02:00'));
    expect(releer).toHaveBeenCalled();
  });

  it('14b: si el servidor no lo acepta, su motivo y el formulario sigue', async () => {
    mockProgramar.mockRejectedValue(new Error('Demasiado justo: prográmala con al menos 2 minutos de margen.'));
    pinta();
    await waitFor(() => expect(screen.getByRole('button', { name: 'handicaps.schedule' })).toBeEnabled());

    fireEvent.click(screen.getByRole('button', { name: 'handicaps.schedule' }));
    fireEvent.change(await screen.findByLabelText(/^handicaps\.scheduleAt/), { target: { value: '2030-10-12T03:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'handicaps.scheduleSave' }));

    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith('Demasiado justo: prográmala con al menos 2 minutos de margen.'));
    expect(screen.getByLabelText(/^handicaps\.scheduleAt/)).toHaveValue('2030-10-12T03:00');
  });

  it('15: sin zona del campo, se dice que es la hora del dispositivo (revisor)', async () => {
    mockCampos.mockResolvedValue([{ golf_course: { id: 'g-1', name: 'Sin coordenadas', timezone: null } }]);
    pinta({ handicapUpdateWindow: { ...ABIERTA, scheduledAt: '2030-10-12T01:00:00Z' } });

    expect(await screen.findByTestId('handicaps-programada')).toHaveTextContent(/^handicaps\.scheduledDevice/);
    fireEvent.click(screen.getByRole('button', { name: 'handicaps.schedule' }));
    expect(screen.getByLabelText(/^handicaps\.scheduleAtDevice/)).toBeInTheDocument();
  });

  it('15b: si los campos no se pudieron leer, también', async () => {
    mockCampos.mockRejectedValue(new Error('sin red'));
    pinta();

    fireEvent.click(await screen.findByRole('button', { name: 'handicaps.schedule' }));

    expect(await screen.findByLabelText(/^handicaps\.scheduleAtDevice/)).toBeInTheDocument();
  });

  it('15c: hasta saber la zona no se puede abrir el programador (revisor)', async () => {
    mockCampos.mockReturnValue(new Promise(() => {}));
    pinta();

    expect(screen.getByRole('button', { name: 'handicaps.schedule' })).toBeDisabled();
  });

  it('15d: con la ventana cerrada tampoco se programa', async () => {
    pinta({ handicapUpdateWindow: { open: false, closesAt: null, reason: 'Ya no quedan jornadas por jugar.', scheduledAt: null } });
    await waitFor(() => expect(mockCampos).toHaveBeenCalled());

    expect(screen.getByRole('button', { name: 'handicaps.schedule' })).toBeDisabled();
  });

  it('15e: una hora que no existe en el campo (cambio de hora) no se puede guardar', async () => {
    pinta();
    await waitFor(() => expect(mockCampos).toHaveBeenCalled());
    fireEvent.click(await screen.findByRole('button', { name: 'handicaps.schedule' }));

    fireEvent.change(await screen.findByLabelText(/^handicaps\.scheduleAt/), { target: { value: '2030-03-31T02:30' } });

    expect(screen.getByRole('button', { name: 'handicaps.scheduleSave' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('handicaps.timeDoesNotExist');
  });

  it('12d: si lanzar falla (otra en marcha), se relee igual', async () => {
    mockLanzar.mockRejectedValue(new Error('Ya se están actualizando los hándicaps.'));
    const releer = pinta();

    fireEvent.click(screen.getByRole('button', { name: 'handicaps.update' }));

    await waitFor(() => expect(releer).toHaveBeenCalled());
  });

  it('el estado se anuncia al cambiar (lectores de pantalla)', async () => {
    pinta({ handicapUpdate: { status: 'STOPPED', origin: 'x', startedAt: 'x', finishedAt: null, pendingPlayers: [] } });

    expect(await screen.findByTestId('handicaps-estado')).toHaveAttribute('aria-live', 'polite');
  });

  it('14c: sin fecha no se puede guardar', async () => {
    pinta();
    await waitFor(() => expect(screen.getByRole('button', { name: 'handicaps.schedule' })).toBeEnabled());

    fireEvent.click(screen.getByRole('button', { name: 'handicaps.schedule' }));

    expect(screen.getByRole('button', { name: 'handicaps.scheduleSave' })).toBeDisabled();
  });
});
