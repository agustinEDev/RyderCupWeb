/**
 * «Repetir partida» (FE #1021): el botón, la preparación del borrador y el
 * asistente. Tabla aprobada el 3 nov 2026 (R4, R8, R12, R14 y lo que añade
 * la pantalla):
 *
 *   #    caso                                       | qué pasa
 *   -----|-------------------------------------------|----------------------------------
 *   R4   pulsar                                     | se abre el asistente con el borrador
 *   R8   el campo ya no se puede leer (404)         | se abre en el paso 1, con su aviso
 *   R12  empieza la nueva                           | se va a anotarla
 *   R14  sin red (campo o amigos)                   | el aviso de sin conexión; no se abre
 *   D1   dos toques seguidos                        | se prepara una sola vez
 *
 * Lo que añadió el revisor (3 nov 2026):
 *
 *   D3   el asistente                               | se pinta en `body`, fuera de la
 *        |                                           | tarjeta (si no, la tapaban las
 *        |                                           | siguientes y la barra inferior)
 *   D4   el icono                                   | dice qué partida repite
 *   D5   desde Inicio llega solo el id              | se pide la partida antes
 *   D5b  llega con la lista de jugadores vacía       | también se pide (CodeRabbit)
 *   D6   el servidor falla al leer el campo (500)   | el aviso genérico; no se abre ni
 *        |                                           | se da el campo por perdido
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import RepetirPartida from './RepetirPartida';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: 'es' } }),
}));

const mockGetGolfCourse = vi.fn();
const mockListFriends = vi.fn();
const mockGetQuickMatch = vi.fn();
vi.mock('../../composition', () => ({
  getGolfCourseUseCase: { execute: (...a) => mockGetGolfCourse(...a) },
  listFriendsUseCase: { execute: (...a) => mockListFriends(...a) },
  getQuickMatchUseCase: { execute: (...a) => mockGetQuickMatch(...a) },
}));

const mockToastError = vi.fn();
vi.mock('../../utils/toast', () => ({ default: { error: (...a) => mockToastError(...a) } }));

// El asistente, de mentira: enseña con qué borrador se abrió
vi.mock('./CreateQuickMatchModal', () => ({
  default: ({ borrador, onStarted, onClose }) => (
    <div data-testid="asistente" data-paso={borrador.paso} data-avisos={JSON.stringify(borrador.avisos)}>
      <button type="button" onClick={() => onStarted('qm-nueva')}>empezar</button>
      <button type="button" onClick={onClose}>cerrar</button>
    </div>
  ),
}));

const yo = { id: 'u-yo', display_name: 'Yo', handicap: 10 };
const PARTIDA = {
  id: 'qm-1',
  name: 'Domingo',
  golfCourseId: 'gc-1',
  matchFormat: 'SINGLES',
  scoringFormat: null,
  allowancePercentage: 100,
  playMode: 'HANDICAP',
  participants: [
    { participantId: 'u-yo', userId: 'u-yo', name: 'Yo', isGuest: false, color: 'YELLOW', teeGender: 'MALE' },
    { participantId: 'u-ana', userId: 'u-ana', name: 'Ana', isGuest: false, color: 'YELLOW', teeGender: 'MALE' },
  ],
  scorerIds: ['u-yo'],
};
const CAMPO = { id: 'gc-1', tees: [{ color: 'YELLOW', gender: 'MALE' }], isApproved: () => true };
const sinRed = () => new TypeError('Failed to fetch');

const pinta = (partida = PARTIDA) =>
  render(
    <MemoryRouter initialEntries={['/quick-matches']}>
      <Routes>
        <Route
          path="/quick-matches"
          element={
            <div data-testid="tarjeta">
              <RepetirPartida partida={partida} usuario={yo} />
            </div>
          }
        />
        <Route path="/quick-matches/:id/scoring" element={<p>anotando</p>} />
      </Routes>
    </MemoryRouter>
  );

const boton = () => screen.getByRole('button', { name: 'create.repetir.botonDe' });

describe('RepetirPartida', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetGolfCourse.mockResolvedValue(CAMPO);
    mockListFriends.mockResolvedValue({
      friendships: [{ otherUserId: 'u-ana', otherUserName: 'Ana', otherUserHandicap: 18 }],
      totalCount: 1,
    });
  });

  it('R4: pulsar abre el asistente con el borrador (al Resumen)', async () => {
    pinta();
    fireEvent.click(boton());

    const asistente = await screen.findByTestId('asistente');
    expect(asistente.dataset.paso).toBe('4');
    expect(mockGetGolfCourse).toHaveBeenCalledWith('gc-1');
  });

  it('R8: un campo que ya no se puede leer abre el paso 1 con su aviso', async () => {
    mockGetGolfCourse.mockRejectedValue(Object.assign(new Error('Not found'), { status: 404 }));
    pinta();
    fireEvent.click(boton());

    const asistente = await screen.findByTestId('asistente');
    expect(asistente.dataset.paso).toBe('1');
    expect(JSON.parse(asistente.dataset.avisos)).toEqual([{ tipo: 'campo', paso: 1 }]);
  });

  it('R12: al empezar la nueva, se va a anotarla', async () => {
    pinta();
    fireEvent.click(boton());
    fireEvent.click(await screen.findByText('empezar'));

    expect(await screen.findByText('anotando')).toBeInTheDocument();
  });

  it.each([
    ['el campo', () => mockGetGolfCourse.mockRejectedValue(sinRed())],
    ['los amigos', () => mockListFriends.mockRejectedValue(sinRed())],
  ])('R14: sin red al pedir %s, el aviso de siempre y no se abre nada', async (_, falla) => {
    falla();
    pinta();
    fireEvent.click(boton());

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('sinConexion.mensaje'));
    expect(screen.queryByTestId('asistente')).not.toBeInTheDocument();
    expect(boton()).not.toBeDisabled();
  });

  it('D1: dos toques seguidos preparan una sola vez', async () => {
    pinta();
    fireEvent.click(boton());
    fireEvent.click(boton());

    await screen.findByTestId('asistente');
    expect(mockGetGolfCourse).toHaveBeenCalledTimes(1);
  });

  it('D3: el asistente se pinta en body, fuera de la tarjeta', async () => {
    pinta();
    fireEvent.click(boton());

    const asistente = await screen.findByTestId('asistente');
    expect(screen.getByTestId('tarjeta').contains(asistente)).toBe(false);
    expect(asistente.parentElement).toBe(document.body);
  });

  it('D4: el icono dice qué partida repite (y sin nombre, solo «Repetir partida»)', () => {
    pinta();
    expect(boton()).toBeInTheDocument();
  });

  it('D4: sin nombre, solo «Repetir partida»', () => {
    pinta({ ...PARTIDA, name: null });
    expect(screen.getByRole('button', { name: 'create.repetir.boton' })).toBeInTheDocument();
  });

  it('D5: con solo el id (desde Inicio), pide la partida antes', async () => {
    mockGetQuickMatch.mockResolvedValue(PARTIDA);
    pinta({ id: 'qm-1', name: 'Domingo' });
    fireEvent.click(boton());

    expect((await screen.findByTestId('asistente')).dataset.paso).toBe('4');
    expect(mockGetQuickMatch).toHaveBeenCalledWith('qm-1');
  });

  it('D5b: con la lista de jugadores vacía (lo guardado en el móvil), también la pide', async () => {
    mockGetQuickMatch.mockResolvedValue(PARTIDA);
    pinta({ ...PARTIDA, participants: [] });
    fireEvent.click(boton());

    expect((await screen.findByTestId('asistente')).dataset.paso).toBe('4');
    expect(mockGetQuickMatch).toHaveBeenCalledWith('qm-1');
  });

  it('D6: un 500 al leer el campo es el aviso genérico, sin abrir nada', async () => {
    mockGetGolfCourse.mockRejectedValue(Object.assign(new Error('boom'), { status: 500 }));
    pinta();
    fireEvent.click(boton());

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('create.errors.generic'));
    expect(screen.queryByTestId('asistente')).not.toBeInTheDocument();
  });
});
