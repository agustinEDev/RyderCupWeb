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
 *   D2   el icono en una tarjeta                    | el toque no abre la tarjeta
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
vi.mock('../../composition', () => ({
  getGolfCourseUseCase: { execute: (...a) => mockGetGolfCourse(...a) },
  listFriendsUseCase: { execute: (...a) => mockListFriends(...a) },
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

const pinta = (como) => {
  const abreLaTarjeta = vi.fn();
  render(
    <MemoryRouter initialEntries={['/quick-matches']}>
      <Routes>
        <Route
          path="/quick-matches"
          element={
            <div onClick={abreLaTarjeta}>
              <RepetirPartida partida={PARTIDA} usuario={yo} como={como} />
            </div>
          }
        />
        <Route path="/quick-matches/:id/scoring" element={<p>anotando</p>} />
      </Routes>
    </MemoryRouter>
  );
  return { abreLaTarjeta };
};

const boton = () => screen.getByRole('button', { name: 'create.repetir.boton' });

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
    expect(JSON.parse(asistente.dataset.avisos)).toEqual([{ tipo: 'campo' }]);
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

  it('D2: el icono de la tarjeta no la abre al pulsarlo', async () => {
    const { abreLaTarjeta } = pinta('icono');
    fireEvent.click(boton());

    await screen.findByTestId('asistente');
    expect(abreLaTarjeta).not.toHaveBeenCalled();
  });
});
