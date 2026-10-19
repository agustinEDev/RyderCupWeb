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

  /**
   * Que no se pudiera leer no es que el campo no tenga zona (QA de la release,
   * 14 oct): se dice, se puede reintentar y no se programa a ciegas en la hora
   * del dispositivo.
   */
  it('15b: si los campos no se pudieron leer, se dice y no se programa', async () => {
    mockCampos.mockRejectedValue(new Error('sin red'));
    pinta();

    expect(await screen.findByTestId('handicaps-zona-ilegible')).toHaveTextContent('handicaps.zoneUnreadable');
    expect(screen.getByRole('button', { name: 'handicaps.schedule' })).toBeDisabled();
    expect(screen.queryByText(/scheduleAtDevice|scheduledDevice/)).not.toBeInTheDocument();
  });

  it('15b2: lo ya programado, en la hora del dispositivo sin decir que el campo no tiene zona', async () => {
    mockCampos.mockRejectedValue(new Error('sin red'));
    pinta({ handicapUpdateWindow: { ...ABIERTA, scheduledAt: '2030-10-12T01:00:00Z' } });

    expect(await screen.findByTestId('handicaps-programada')).toHaveTextContent(/^handicaps\.scheduledUnknownZone/);
  });

  it('15b4: mientras lee, lo programado tampoco dice que el campo no tiene zona', () => {
    mockCampos.mockReturnValue(new Promise(() => {}));
    pinta({ handicapUpdateWindow: { ...ABIERTA, scheduledAt: '2030-10-12T01:00:00Z' } });

    expect(screen.getByTestId('handicaps-programada')).toHaveTextContent(/^handicaps\.scheduledUnknownZone/);
  });

  it('15b5: reintentar que vuelve a fallar: el aviso sigue (y se anuncia) y no se programa', async () => {
    let falla;
    mockCampos.mockRejectedValueOnce(new Error('sin red')).mockReturnValueOnce(new Promise((_r, rej) => { falla = rej; }));
    pinta();
    const reintentar = await screen.findByRole('button', { name: 'handicaps.retryZone' });
    expect(screen.getByTestId('handicaps-zona-ilegible')).toHaveAttribute('role', 'status');

    fireEvent.click(reintentar);
    expect(reintentar).toBeDisabled();
    expect(screen.getByTestId('handicaps-zona-ilegible')).toBeInTheDocument();
    await act(async () => falla(new Error('otra vez')));

    expect(await screen.findByRole('button', { name: 'handicaps.retryZone' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'handicaps.schedule' })).toBeDisabled();
  });

  it('15b3: reintentar la vuelve a leer, y con ella se programa en la del campo', async () => {
    mockCampos.mockRejectedValueOnce(new Error('sin red'));
    pinta();
    fireEvent.click(await screen.findByRole('button', { name: 'handicaps.retryZone' }));

    await waitFor(() => expect(screen.queryByTestId('handicaps-zona-ilegible')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'handicaps.schedule' }));
    expect(screen.getByLabelText(/^handicaps\.scheduleAt\b/)).toBeInTheDocument();
    expect(mockCampos).toHaveBeenCalledTimes(2);
  });

  it('15c: hasta saber la zona no se puede abrir el programador (revisor)', async () => {
    mockCampos.mockReturnValue(new Promise(() => {}));
    pinta();

    expect(screen.getByRole('button', { name: 'handicaps.schedule' })).toBeDisabled();
  });

  it('15d: con la ventana cerrada ahora se puede programar para cuando se abra: lo decide el servidor (/code-review)', async () => {
    pinta({ handicapUpdateWindow: { open: false, closesAt: null, reason: 'Queda muy poco para la siguiente salida.', scheduledAt: null } });

    await waitFor(() => expect(screen.getByRole('button', { name: 'handicaps.schedule' })).toBeEnabled());
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
  /**
   * RyderCupAm#541 (FE de BE-B): el motivo llega también como código y se dice
   * en el idioma de la app. Un código que no se conoce, o ninguno, deja el
   * texto del servidor.
   *
   *   R1  ventana cerrada con código           | su texto
   *   R2  código desconocido                   | el del servidor
   *   R3  lanzar: 409 RUNNING                  | su texto
   *   R4  programar: la ventana a esa hora     | «A esa hora no se podría: …»
   *   R5  programar: en el pasado o justo      | su texto, sin «a esa hora»
   */
  const rechazo = (reasonCode, mensaje = 'texto del servidor') =>
    Object.assign(new Error(mensaje), { status: 400, data: { error_code: 'HANDICAP_UPDATE_NOT_ALLOWED', reason_code: reasonCode } });
  const programa = async () => {
    await waitFor(() => expect(screen.getByRole('button', { name: 'handicaps.schedule' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'handicaps.schedule' }));
    fireEvent.change(await screen.findByLabelText(/^handicaps\.scheduleAt/), { target: { value: '2030-10-12T03:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'handicaps.scheduleSave' }));
  };

  it('R1: cerrada con código, el motivo traducido', async () => {
    pinta({ handicapUpdateWindow: { open: false, closesAt: null, reason: 'Hay una jornada en marcha.', reasonCode: 'DAY_IN_PLAY', scheduledAt: null } });

    expect(await screen.findByTestId('handicaps-ventana')).toHaveTextContent('handicaps.reasons.DAY_IN_PLAY');
  });

  it.each(['STATUS', 'NO_WINDOWS', 'RYDER', 'DAY_IN_PLAY', 'NO_DAYS_LEFT', 'TOO_CLOSE', 'NO_TIMEZONE', 'DISABLED', 'RUNNING'])(
    'R1b: %s, traducido',
    async (codigo) => {
      pinta({ handicapUpdateWindow: { open: false, closesAt: null, reason: 'x', reasonCode: codigo, scheduledAt: null } });

      expect(await screen.findByTestId('handicaps-ventana')).toHaveTextContent(`handicaps.reasons.${codigo}`);
    }
  );

  it('R2: un código que no se conoce, el texto del servidor', async () => {
    pinta({ handicapUpdateWindow: { open: false, closesAt: null, reason: 'Motivo nuevo del servidor.', reasonCode: 'SOMETHING_NEW', scheduledAt: null } });

    expect(await screen.findByTestId('handicaps-ventana')).toHaveTextContent('Motivo nuevo del servidor.');
  });

  it('R3: lanzar con otra en marcha (409 RUNNING), traducido', async () => {
    mockLanzar.mockRejectedValue(rechazo('RUNNING', 'Ya se están actualizando los hándicaps.'));
    pinta();

    fireEvent.click(screen.getByRole('button', { name: 'handicaps.update' }));

    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith('handicaps.reasons.RUNNING'));
  });

  it('R4: programar a una hora en que la ventana estaría cerrada: «a esa hora no se podría»', async () => {
    mockProgramar.mockRejectedValue(rechazo('DAY_IN_PLAY'));
    pinta();

    await programa();

    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith('handicaps.notAtThatTime {"motivo":"handicaps.reasons.DAY_IN_PLAY"}')
    );
  });

  it.each(['IN_THE_PAST', 'TOO_TIGHT', 'DISABLED'])('R5: programar, %s: su texto, sin «a esa hora»', async (codigo) => {
    mockProgramar.mockRejectedValue(rechazo(codigo));
    pinta();

    await programa();

    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith(`handicaps.reasons.${codigo}`));
  });

  it('R5b: programar con un código desconocido, el texto del servidor', async () => {
    mockProgramar.mockRejectedValue(rechazo('SOMETHING_NEW', 'A esa hora no se podría: algo nuevo.'));
    pinta();

    await programa();

    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith('A esa hora no se podría: algo nuevo.'));
  });
});
