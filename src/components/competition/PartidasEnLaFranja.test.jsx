import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor, act } from '@testing-library/react';

/**
 * Las partidas de una franja en la ficha (FE #824, PR 6). La tabla aprobada
 * el 11 oct 2026 (el 1, que no salgan con las inscripciones abiertas ni en una
 * Ryder, y el 5 arriba, «Tu partida», van en la ficha y en `MisPartidas`):
 *
 *   #    caso                                         | qué pasa
 *   -----|-----------------------------------------------|---------------------------
 *   2    desplegar «Partidas»                         | se leen: nº, hora, jugadores, fijado, de juego, a quién marca
 *   3    partida de 1                                 | «Incompleta · sin marcador»
 *   4    sin partidas                                 | jugador: «Aún no hay»; organizador: generar
 *   5    la de quien mira                             | destacada
 *   6    no se pudieron leer                          | aviso y «Reintentar», sin acciones
 *   7    generar                                      | elige el orden (altos primero) y pinta lo devuelto
 *   8    volver a generar / borrar                    | con confirmación: «se sustituyen las N»
 *   9    errores                                      | traducidos, con nombres
 *   10   «Mover a…»                                   | con sitio, intercambio en las llenas, nueva al final
 *   11   se vacía una y suben las de detrás           | toast «salen N min antes»
 *   12   con plaza y sin partida                      | «Colocar en…»
 *   13   ↑ ↓                                          | cambian el orden; la 1.ª sin ↑, la última sin ↓
 *   14   «Marcadores»                                 | selector por jugador; avisa antes de enviar
 *   15   ya salió la 1.ª                              | sin botones, con el motivo; si el servidor lo dice, relee
 *   16   doble toque                                  | una petición
 *   17   cambian las plazas                           | desplegadas, se releen
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (clave, params) => (params ? `${clave} ${JSON.stringify(params)}` : clave),
    i18n: { language: 'es' },
  }),
}));

const mockToast = { error: vi.fn(), success: vi.fn(), info: vi.fn() };
vi.mock('../../utils/toast', () => ({ default: mockToast }));

const mockLeer = vi.fn();
const mockGenerar = vi.fn();
const mockMover = vi.fn();
const mockReordenar = vi.fn();
const mockMarcadores = vi.fn();
const mockBorrar = vi.fn();
vi.mock('../../composition', () => ({
  getTeeGroupsUseCase: { execute: (...a) => mockLeer(...a) },
  generateTeeGroupsUseCase: { execute: (...a) => mockGenerar(...a) },
  moveTeeGroupPlayerUseCase: { execute: (...a) => mockMover(...a) },
  reorderTeeGroupsUseCase: { execute: (...a) => mockReordenar(...a) },
  setTeeGroupMarkersUseCase: { execute: (...a) => mockMarcadores(...a) },
  deleteTeeGroupsUseCase: { execute: (...a) => mockBorrar(...a) },
}));

const PartidasEnLaFranja = (await import('./PartidasEnLaFranja')).default;

const YO = 'ana';
const jugador = (userId, marks, extra = {}) => ({
  userId,
  name: userId.toUpperCase(),
  handicap: 12.3,
  playingHandicap: 11,
  teeColor: 'YELLOW',
  teeGender: 'FEMALE',
  strokesByHole: [],
  marksUserId: marks,
  ...extra,
});
const partida = (id, number, teeTime, players, extra = {}) => ({
  id,
  number,
  teeTime,
  status: 'SCHEDULED',
  incomplete: players.length === 1,
  players,
  ...extra,
});
const G1 = partida('g1', 1, '08:00', [jugador('ana', 'bea'), jugador('bea', 'cris'), jugador('cris', 'ana')]);
const G2 = partida('g2', 2, '08:10', [jugador('dani', 'eva'), jugador('eva', 'fede'), jugador('fede', 'gema'), jugador('gema', 'dani')]);
const G3 = partida('g3', 3, '08:20', [jugador('hugo', null)]);
const vista = (extra = {}) => ({ roundId: 'r1', editable: true, unassignedPlayers: [], groups: [G1, G2, G3], ...extra });

const FRANJA = { id: 'r1', sessionType: 'MORNING', roundDate: '2030-10-12', teeSheet: { groupSize: 4, teeTimes: ['08:00', '08:10', '08:20', '08:30'] } };

const pintar = (props = {}) =>
  render(<PartidasEnLaFranja franja={FRANJA} nombre="Mañana · sáb 12 oct" userId={YO} organiza={false} version={0} {...props} />);
const desplegar = async () => {
  fireEvent.click(screen.getByRole('button', { name: /partidas.showFor/ }));
  await waitFor(() => expect(mockLeer).toHaveBeenCalled());
};

describe('PartidasEnLaFranja (FE #824, PR 6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLeer.mockReset();
    mockLeer.mockResolvedValue(vista());
  });

  it('2: plegadas no se piden; al desplegar, cada partida con su hora, jugadores y a quién marca', async () => {
    pintar();
    expect(mockLeer).not.toHaveBeenCalled();
    // Cada franja tiene el suyo: el nombre dice de cuál es (revisor)
    expect(screen.getByRole('button', { name: 'partidas.showFor {"franja":"Mañana · sáb 12 oct"}' })).toHaveAttribute('aria-expanded', 'false');

    await desplegar();

    expect(mockLeer).toHaveBeenCalledWith('r1');
    const g1 = await screen.findByTestId('partida-g1');
    expect(g1).toHaveTextContent('partidas.number {"numero":1,"hora":"08:00"}');
    const ana = within(g1).getByTestId('partida-jugador-ana');
    expect(ana).toHaveTextContent('ANA');
    expect(ana).toHaveTextContent('12,3');
    expect(ana).toHaveTextContent('partidas.playing {"juego":11}');
    expect(ana).toHaveTextContent('partidas.marks {"jugador":"BEA"}');
  });

  // Como el resto de la app: un plus, en negativo (si se quiere «+1,2», en todas partes)
  it('2b: el de un plus, con su signo, como en el resto de la app', async () => {
    mockLeer.mockResolvedValue(vista({ groups: [partida('g1', 1, '08:00', [jugador('ana', 'bea', { handicap: -1.2, playingHandicap: -2 }), jugador('bea', 'ana')])] }));
    pintar();
    await desplegar();

    const ana = await screen.findByTestId('partida-jugador-ana');
    expect(ana).toHaveTextContent('-1,2');
    expect(ana).toHaveTextContent('partidas.playing {"juego":-2}');
  });

  it('3: una de un jugador: incompleta y sin marcador', async () => {
    pintar();
    await desplegar();

    const g3 = await screen.findByTestId('partida-g3');
    expect(g3).toHaveTextContent('partidas.incomplete');
    expect(within(g3).queryByText(/partidas.marks/)).toBeNull();
  });

  it('4: sin partidas, el jugador lo lee y no ve botones', async () => {
    mockLeer.mockResolvedValue(vista({ groups: [] }));
    pintar();
    await desplegar();

    expect(await screen.findByText('partidas.empty')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'partidas.generate' })).toBeNull();
  });

  it('5: la de quien mira, destacada; las demás no', async () => {
    pintar();
    await desplegar();

    expect(await screen.findByTestId('partida-g1')).toHaveAttribute('data-mia', 'true');
    expect(screen.getByTestId('partida-g2')).toHaveAttribute('data-mia', 'false');
  });

  it('6: si no se pudieron leer, aviso y reintentar, y sin acciones', async () => {
    mockLeer.mockRejectedValueOnce(new Error('sin cobertura'));
    pintar({ organiza: true });
    await desplegar();

    expect(await screen.findByText('partidas.notLoaded')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'partidas.generate' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'partidas.retry' }));
    expect(await screen.findByTestId('partida-g1')).toBeInTheDocument();
  });

  it('7: generar, con «altos primero» propuesto, pinta lo devuelto', async () => {
    mockLeer.mockResolvedValue(vista({ groups: [] }));
    mockGenerar.mockResolvedValue(vista());
    pintar({ organiza: true });
    await desplegar();

    expect(await screen.findByRole('combobox', { name: 'partidas.order' })).toHaveValue('HIGH_FIRST');
    fireEvent.change(screen.getByRole('combobox', { name: 'partidas.order' }), { target: { value: 'LOW_FIRST' } });
    fireEvent.click(screen.getByRole('button', { name: 'partidas.generate' }));

    await waitFor(() => expect(mockGenerar).toHaveBeenCalledWith('r1', 'LOW_FIRST'));
    expect(await screen.findByTestId('partida-g1')).toBeInTheDocument();
    expect(mockToast.success).toHaveBeenCalledWith('partidas.generated');
  });

  it('8: volver a generar pide confirmación con cuántas se sustituyen', async () => {
    mockGenerar.mockResolvedValue(vista());
    pintar({ organiza: true });
    await desplegar();

    fireEvent.click(await screen.findByRole('button', { name: 'partidas.regenerate' }));
    expect(mockGenerar).not.toHaveBeenCalled();
    expect(screen.getByText('partidas.regenerateConfirm {"count":3}')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'partidas.regenerateYes' }));

    await waitFor(() => expect(mockGenerar).toHaveBeenCalledWith('r1', 'HIGH_FIRST'));
  });

  it('8b: borrar, con confirmación; «No» no borra', async () => {
    mockBorrar.mockResolvedValue();
    pintar({ organiza: true });
    await desplegar();

    fireEvent.click(await screen.findByRole('button', { name: 'partidas.remove' }));
    fireEvent.click(screen.getByRole('button', { name: 'partidas.no' }));
    expect(mockBorrar).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'partidas.remove' }));
    expect(screen.getByText('partidas.removeConfirm {"count":3}')).toBeInTheDocument();
    mockLeer.mockResolvedValue(vista({ groups: [] }));
    fireEvent.click(screen.getByRole('button', { name: 'partidas.removeYes' }));

    await waitFor(() => expect(mockBorrar).toHaveBeenCalledWith('r1'));
    expect(await screen.findByRole('button', { name: 'partidas.generate' })).toBeInTheDocument();
  });

  it.each([
    ['NOT_ENOUGH_PLAYERS', {}, 'partidas.errors.NOT_ENOUGH_PLAYERS'],
    ['COURSE_WITHOUT_TIMEZONE', {}, 'partidas.errors.COURSE_WITHOUT_TIMEZONE'],
    ['PLAYERS_WITHOUT_TEE', { players: [{ user_id: 'u', name: 'Ana' }, { user_id: 'v', name: 'Bea' }] }, 'partidas.errors.PLAYERS_WITHOUT_TEE {"count":2,"jugadores":"Ana, Bea"}'],
    ['PLAYERS_WITHOUT_HANDICAP', { players: [{ user_id: 'u', name: 'Ana' }] }, 'partidas.errors.PLAYERS_WITHOUT_HANDICAP {"count":1,"jugadores":"Ana"}'],
  ])('9: %s, traducido', async (codigo, data, texto) => {
    mockLeer.mockResolvedValue(vista({ groups: [] }));
    mockGenerar.mockRejectedValue(Object.assign(new Error('server text'), { errorCode: codigo, data }));
    pintar({ organiza: true });
    await desplegar();

    fireEvent.click(await screen.findByRole('button', { name: 'partidas.generate' }));

    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith(texto));
  });

  it('9c: sin los nombres de quién falta, el texto del servidor (no un hueco vacío)', async () => {
    mockLeer.mockResolvedValue(vista({ groups: [] }));
    mockGenerar.mockRejectedValue(Object.assign(new Error('server text'), { errorCode: 'PLAYERS_WITHOUT_TEE', data: { players: [] } }));
    pintar({ organiza: true });
    await desplegar();

    fireEvent.click(await screen.findByRole('button', { name: 'partidas.generate' }));

    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith('server text'));
  });

  it('9b: un error sin código conocido, el texto del servidor', async () => {
    mockLeer.mockResolvedValue(vista({ groups: [] }));
    mockGenerar.mockRejectedValue(Object.assign(new Error('server text'), { errorCode: 'OTRO' }));
    pintar({ organiza: true });
    await desplegar();

    fireEvent.click(await screen.findByRole('button', { name: 'partidas.generate' }));

    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith('server text'));
  });

  it('10: «Mover a…» ofrece con sitio, intercambios en las llenas y nueva al final', async () => {
    pintar({ organiza: true });
    await desplegar();

    const mover = await screen.findByRole('combobox', { name: 'partidas.moveTo {"jugador":"ANA"}' });
    const opciones = within(mover).getAllByRole('option').map((o) => o.textContent);
    expect(opciones).toEqual([
      'partidas.moveToPlaceholder',
      'partidas.toGroup {"numero":3,"hora":"08:20"}',
      'partidas.swapWith {"jugador":"DANI","numero":2}',
      'partidas.swapWith {"jugador":"EVA","numero":2}',
      'partidas.swapWith {"jugador":"FEDE","numero":2}',
      'partidas.swapWith {"jugador":"GEMA","numero":2}',
      'partidas.newGroup',
    ]);
  });

  it('10b: elegir un destino lo manda en un paso: con sitio, intercambio o nueva', async () => {
    mockMover.mockResolvedValue(vista());
    pintar({ organiza: true });
    await desplegar();
    const mover = () => screen.getByRole('combobox', { name: 'partidas.moveTo {"jugador":"ANA"}' });
    await screen.findByTestId('partida-g1');

    fireEvent.change(mover(), { target: { value: 'g3' } });
    await waitFor(() => expect(mockMover).toHaveBeenLastCalledWith('r1', { userId: 'ana', groupId: 'g3' }));
    fireEvent.change(mover(), { target: { value: 'g2|eva' } });
    await waitFor(() => expect(mockMover).toHaveBeenLastCalledWith('r1', { userId: 'ana', groupId: 'g2', swapWithUserId: 'eva' }));
    fireEvent.change(mover(), { target: { value: 'NUEVA' } });
    await waitFor(() => expect(mockMover).toHaveBeenLastCalledWith('r1', { userId: 'ana' }));
    expect(mockToast.success).toHaveBeenCalledWith('partidas.moved');
  });

  it('11: si al mover suben las de detrás, se avisa de cuánto se adelantan', async () => {
    mockLeer.mockResolvedValue(vista({ groups: [G1, partida('g2', 2, '08:10', [jugador('dani', null)]), partida('g3', 3, '08:20', [jugador('hugo', 'ivan'), jugador('ivan', 'hugo')])] }));
    mockMover.mockResolvedValue(vista({ groups: [G1, partida('g3', 2, '08:10', [jugador('hugo', 'ivan'), jugador('ivan', 'hugo'), jugador('dani', null)])] }));
    pintar({ organiza: true });
    await desplegar();

    fireEvent.change(await screen.findByRole('combobox', { name: 'partidas.moveTo {"jugador":"DANI"}' }), { target: { value: 'g3' } });

    await waitFor(() => expect(mockToast.info).toHaveBeenCalledWith('partidas.earlier {"desde":2,"hasta":2,"minutos":10,"count":1}'));
  });

  it('12: con plaza y sin partida, «Colocar en…» con sitio o en una nueva', async () => {
    mockLeer.mockResolvedValue(vista({ unassignedPlayers: [{ userId: 'zoe', name: 'Zoe Zamora' }] }));
    mockMover.mockResolvedValue(vista());
    pintar({ organiza: true });
    await desplegar();

    const bloque = await screen.findByTestId('partidas-sin-partida');
    expect(bloque).toHaveTextContent('Zoe Zamora');
    const colocar = within(bloque).getByRole('combobox', { name: 'partidas.placeIn {"jugador":"Zoe Zamora"}' });
    expect(within(colocar).getAllByRole('option').map((o) => o.value)).toEqual(['', 'g1', 'g3', 'NUEVA']);
    fireEvent.change(colocar, { target: { value: 'g1' } });

    await waitFor(() => expect(mockMover).toHaveBeenCalledWith('r1', { userId: 'zoe', groupId: 'g1' }));
  });

  it('12b: al jugador no se le enseña «sin partida» ni «Mover a…»', async () => {
    mockLeer.mockResolvedValue(vista({ unassignedPlayers: [{ userId: 'zoe', name: 'Zoe Zamora' }] }));
    pintar();
    await desplegar();

    await screen.findByTestId('partida-g1');
    expect(screen.queryByTestId('partidas-sin-partida')).toBeNull();
    expect(screen.queryByRole('combobox', { name: /partidas.moveTo/ })).toBeNull();
  });

  it('13: ↑ ↓ cambian el orden; la primera sin ↑ y la última sin ↓', async () => {
    mockReordenar.mockResolvedValue(vista());
    pintar({ organiza: true });
    await desplegar();

    const g1 = await screen.findByTestId('partida-g1');
    expect(within(g1).queryByRole('button', { name: /partidas.up/ })).toBeNull();
    expect(within(screen.getByTestId('partida-g3')).queryByRole('button', { name: /partidas.down/ })).toBeNull();

    mockReordenar.mockResolvedValueOnce(vista({ groups: [{ ...G2, number: 1, teeTime: '08:00' }, { ...G1, number: 2, teeTime: '08:10' }, G3] }));
    fireEvent.click(within(screen.getByTestId('partida-g2')).getByRole('button', { name: 'partidas.up {"numero":2}' }));
    await waitFor(() => expect(mockReordenar).toHaveBeenCalledWith('r1', ['g2', 'g1', 'g3']));
    // Cambiar el orden adelanta una a propósito: el aviso es solo al mover (revisor)
    await waitFor(() => expect(mockToast.success).toHaveBeenCalledWith('partidas.reordered'));
    expect(mockToast.info).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByTestId('partida-g1')).getByRole('button', { name: 'partidas.down {"numero":2}' }));
    await waitFor(() => expect(mockReordenar).toHaveBeenLastCalledWith('r1', ['g2', 'g3', 'g1']));
  });

  it('14: «Marcadores»: un selector por jugador; avisa antes de enviar y manda la partida entera', async () => {
    mockMarcadores.mockResolvedValue(vista());
    pintar({ organiza: true });
    await desplegar();

    const g1 = await screen.findByTestId('partida-g1');
    fireEvent.click(within(g1).getByRole('button', { name: 'partidas.markers {"numero":1}' }));
    const deAna = within(g1).getByRole('combobox', { name: 'partidas.whoMarks {"jugador":"ANA"}' });
    expect(deAna).toHaveValue('bea');
    expect(within(deAna).getAllByRole('option').map((o) => o.value)).toEqual(['', 'bea', 'cris']);

    // Bea y Cris marcan a Ana: Bea queda sin marcador
    fireEvent.change(within(g1).getByRole('combobox', { name: 'partidas.whoMarks {"jugador":"BEA"}' }), { target: { value: 'ana' } });
    expect(within(g1).getByRole('alert')).toHaveTextContent('partidas.markersErrors.UNMARKED');
    expect(within(g1).getByRole('button', { name: 'partidas.markersSave' })).toBeDisabled();

    // Ana a Cris, Bea a Ana, Cris a Bea: vale
    fireEvent.change(deAna, { target: { value: 'cris' } });
    fireEvent.change(within(g1).getByRole('combobox', { name: 'partidas.whoMarks {"jugador":"CRIS"}' }), { target: { value: 'bea' } });
    expect(within(g1).queryByRole('alert')).toBeNull();
    fireEvent.click(within(g1).getByRole('button', { name: 'partidas.markersSave' }));

    await waitFor(() =>
      expect(mockMarcadores).toHaveBeenCalledWith('g1', [
        { userId: 'ana', marksUserId: 'cris' },
        { userId: 'bea', marksUserId: 'ana' },
        { userId: 'cris', marksUserId: 'bea' },
      ])
    );
    expect(mockToast.success).toHaveBeenCalledWith('partidas.markersSaved');
  });

  it('14b: una incompleta no tiene «Marcadores»', async () => {
    pintar({ organiza: true });
    await desplegar();

    const g3 = await screen.findByTestId('partida-g3');
    expect(within(g3).queryByRole('button', { name: /partidas.markers/ })).toBeNull();
  });

  it('15: ya salió la primera: sin botones, con el motivo', async () => {
    mockLeer.mockResolvedValue(vista({ editable: false, unassignedPlayers: [{ userId: 'zoe', name: 'Zoe Zamora' }] }));
    pintar({ organiza: true });
    await desplegar();

    expect(await screen.findByText('partidas.notEditable')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /partidas.(regenerate|remove|up|down|markers)/ })).toBeNull();
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('15c: al jugador no se le dice que ya no se cambian (no las cambia él)', async () => {
    mockLeer.mockResolvedValue(vista({ editable: false }));
    pintar();
    await desplegar();

    await screen.findByTestId('partida-g1');
    expect(screen.queryByText('partidas.notEditable')).toBeNull();
  });

  it.each(['GROUPS_WINDOW_CLOSED', 'GROUP_ALREADY_STARTED'])('15b: si el servidor dice %s, se avisa y se relee', async (codigo) => {
    mockReordenar.mockRejectedValue(Object.assign(new Error('x'), { errorCode: codigo }));
    pintar({ organiza: true });
    await desplegar();
    const lecturas = mockLeer.mock.calls.length;

    fireEvent.click(within(await screen.findByTestId('partida-g2')).getByRole('button', { name: 'partidas.up {"numero":2}' }));

    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith(`partidas.errors.${codigo}`));
    await waitFor(() => expect(mockLeer.mock.calls.length).toBeGreaterThan(lecturas));
  });

  it('16: un doble toque manda una sola petición', async () => {
    let soltar;
    mockReordenar.mockReturnValue(new Promise((r) => (soltar = r)));
    pintar({ organiza: true });
    await desplegar();

    const subir = within(await screen.findByTestId('partida-g2')).getByRole('button', { name: 'partidas.up {"numero":2}' });
    fireEvent.click(subir);
    fireEvent.click(subir);
    await act(async () => soltar(vista()));

    expect(mockReordenar).toHaveBeenCalledTimes(1);
  });

  it('avisa al padre de cada cambio que sale bien (para releer «Tu partida»), no de los que fallan', async () => {
    const onCambio = vi.fn();
    mockReordenar.mockResolvedValueOnce(vista()).mockRejectedValueOnce(new Error('x'));
    pintar({ organiza: true, onCambio });
    await desplegar();
    const subir = () => within(screen.getByTestId('partida-g2')).getByRole('button', { name: 'partidas.up {"numero":2}' });
    await screen.findByTestId('partida-g2');

    fireEvent.click(subir());
    await waitFor(() => expect(onCambio).toHaveBeenCalledTimes(1));
    fireEvent.click(subir());
    await waitFor(() => expect(mockToast.error).toHaveBeenCalled());
    expect(onCambio).toHaveBeenCalledTimes(1);
  });

  it('si mientras se escribe llega una lectura más nueva, se vuelve a leer al acabar', async () => {
    let soltarElCambio;
    const { rerender } = pintar({ organiza: true });
    await desplegar();
    await screen.findByTestId('partida-g2');
    mockReordenar.mockReturnValueOnce(new Promise((r) => (soltarElCambio = r)));
    fireEvent.click(within(screen.getByTestId('partida-g2')).getByRole('button', { name: 'partidas.up {"numero":2}' }));
    // Cambian las plazas mientras tanto: esa lectura sale después y llega antes
    rerender(<PartidasEnLaFranja franja={FRANJA} userId={YO} organiza version={1} />);
    await waitFor(() => expect(mockLeer).toHaveBeenCalledTimes(2));
    await act(async () => {});

    await act(async () => soltarElCambio(vista()));

    await waitFor(() => expect(mockLeer).toHaveBeenCalledTimes(3));
  });

  it('17: si cambian las plazas, desplegadas se releen; plegadas, no', async () => {
    const { rerender } = pintar();
    rerender(<PartidasEnLaFranja franja={FRANJA} userId={YO} organiza={false} version={1} />);
    expect(mockLeer).not.toHaveBeenCalled();

    await desplegar();
    const lecturas = mockLeer.mock.calls.length;
    rerender(<PartidasEnLaFranja franja={FRANJA} userId={YO} organiza={false} version={2} />);

    await waitFor(() => expect(mockLeer.mock.calls.length).toBe(lecturas + 1));
  });

  it('una lectura vieja no pisa lo que devolvió un cambio', async () => {
    let soltarLaVieja;
    pintar({ organiza: true });
    await desplegar();
    await screen.findByTestId('partida-g1');

    mockLeer.mockReturnValueOnce(new Promise((r) => (soltarLaVieja = r)));
    fireEvent.click(screen.getByRole('button', { name: /partidas.show/ }));
    fireEvent.click(screen.getByRole('button', { name: /partidas.show/ }));
    await waitFor(() => expect(soltarLaVieja).toBeDefined());
    mockReordenar.mockResolvedValue(vista({ groups: [{ ...G2, number: 1, teeTime: '08:00' }, { ...G1, number: 2, teeTime: '08:10' }, G3] }));
    fireEvent.click(within(screen.getByTestId('partida-g2')).getByRole('button', { name: 'partidas.up {"numero":2}' }));
    await waitFor(() => expect(screen.getByTestId('partida-g2')).toHaveTextContent('partidas.number {"numero":1,"hora":"08:00"}'));

    await act(async () => soltarLaVieja(vista()));
    expect(screen.getByTestId('partida-g2')).toHaveTextContent('partidas.number {"numero":1,"hora":"08:00"}');
  });
});
