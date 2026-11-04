/**
 * El aviso del asistente se guarda por su clave, no por su texto (4 nov
 * 2026): cambiar de idioma con un aviso a la vista lo traduce, y quitar un
 * aviso concreto no depende de comparar textos traducidos.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import CreateQuickMatchModal from './CreateQuickMatchModal';

let idioma = 'es';
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => `${idioma}:${key}`,
    i18n: { language: idioma },
  }),
}));

vi.mock('../golf_course/GolfCourseSearchBox', () => ({ default: () => null }));

const mockIniciar = vi.fn();
vi.mock('../../composition', () => ({
  createAndStartQuickMatchUseCase: { execute: (...a) => mockIniciar(...a) },
  listFriendsUseCase: { execute: () => Promise.resolve({ friendships: [], totalCount: 0 }) },
  getGolfCourseUseCase: { execute: () => Promise.resolve({ tees: [{ color: 'YELLOW', gender: 'MALE' }], isFromRfeg: () => false }) },
  listMyQuickMatchesUseCase: { execute: () => Promise.resolve({ quickMatches: [] }) },
  cancelQuickMatchUseCase: { execute: vi.fn() },
}));

const yo = { id: 'user-1', country_code: 'ES', display_name: 'Yo', handicap: 12.4 };

const CAMPO = { id: 'course-1', name: 'St Andrews', tees: [{ color: 'YELLOW', gender: 'MALE' }] };
// Repetir abre en el Resumen, con todo listo para confirmar
const BORRADOR = {
  paso: 4,
  avisos: [],
  inicial: {
    matchName: 'Domingo',
    mode: 'FREE_PLAY',
    matchFormat: 'SINGLES',
    scoringFormat: 'STABLEFORD',
    allowanceOverride: null,
    playMode: 'HANDICAP',
    selectedCourse: CAMPO,
    creatorTeeKey: 'YELLOW|MALE',
    participants: [
      { participantId: 'user-1', userId: 'user-1', name: 'Yo', handicap: 12.4, profileHandicap: 12.4, team: null, isGuest: false, color: 'YELLOW', teeGender: 'MALE' },
    ],
    scorerIds: ['user-1'],
  },
};

const pinta = (props = {}) => (
  <MemoryRouter>
    <CreateQuickMatchModal onClose={vi.fn()} onStarted={vi.fn()} currentUser={yo} {...props} />
  </MemoryRouter>
);

describe('CreateQuickMatchModal · el aviso, por su clave', () => {
  beforeEach(() => {
    idioma = 'es';
    mockIniciar.mockReset();
  });

  it('cambiar de idioma con un aviso a la vista lo traduce', () => {
    const { rerender } = render(pinta());
    fireEvent.click(screen.getByTestId('quick-match-course-next'));
    expect(screen.getByTestId('quick-match-modal-error')).toHaveTextContent('es:create.course.errorCourseRequired');

    idioma = 'en';
    rerender(pinta());

    expect(screen.getByTestId('quick-match-modal-error')).toHaveTextContent('en:create.course.errorCourseRequired');
  });

  it('elegir la barra del invitado no quita otro aviso (el del nombre)', async () => {
    render(pinta({ borrador: BORRADOR }));
    fireEvent.click(await screen.findByTestId('quick-match-summary-back'));
    fireEvent.click(await screen.findByTestId('quick-match-scorers-back'));
    fireEvent.click(await screen.findByTestId('quick-match-tab-guest'));
    // Solo espacios: pasan el `required` del navegador, y se avisa
    fireEvent.change(screen.getByTestId('quick-match-guest-first-name'), { target: { value: '  ' } });
    fireEvent.change(screen.getByTestId('quick-match-guest-last-name'), { target: { value: '  ' } });
    fireEvent.click(screen.getByTestId('quick-match-add-guest'));
    expect(screen.getByTestId('quick-match-modal-error')).toHaveTextContent('es:create.participants.errorGuestName');

    fireEvent.click(screen.getByTestId('quick-match-guest-tee'));
    fireEvent.click(await screen.findByTestId('quick-match-tee-panel-option-YELLOW|MALE'));

    expect(screen.getByTestId('quick-match-modal-error')).toHaveTextContent('es:create.participants.errorGuestName');
  });

  it('el rechazo del servidor sale con su motivo traducido', async () => {
    mockIniciar.mockRejectedValue({ status: 403 });
    render(pinta({ borrador: BORRADOR }));

    fireEvent.click(await screen.findByTestId('quick-match-start'));

    expect(await screen.findByTestId('quick-match-modal-error')).toHaveTextContent('es:create.errors.notFriends');
  });

  it('«sin conexión» también cambia de idioma (es nuestro, no del servidor; revisor)', async () => {
    mockIniciar.mockRejectedValue(new TypeError('Failed to fetch'));
    const { rerender } = render(pinta({ borrador: BORRADOR }));
    fireEvent.click(await screen.findByTestId('quick-match-start'));
    expect(await screen.findByTestId('quick-match-modal-error')).toHaveTextContent('es:sinConexion.mensaje');

    idioma = 'en';
    rerender(pinta({ borrador: BORRADOR }));

    expect(screen.getByTestId('quick-match-modal-error')).toHaveTextContent('en:sinConexion.mensaje');
  });

  it('el motivo que manda el servidor sale tal cual', async () => {
    mockIniciar.mockRejectedValue({ status: 400, message: 'Motivo del servidor' });
    render(pinta({ borrador: BORRADOR }));

    fireEvent.click(await screen.findByTestId('quick-match-start'));

    expect(await screen.findByTestId('quick-match-modal-error')).toHaveTextContent(/^Motivo del servidor$/);
  });

  it('repetir el mismo aviso no vuelve a hacer scroll (revisor)', () => {
    const scroll = vi.fn();
    globalThis.Element.prototype.scrollIntoView = scroll;
    render(pinta());

    fireEvent.click(screen.getByTestId('quick-match-course-next'));
    fireEvent.click(screen.getByTestId('quick-match-course-next'));

    expect(scroll).toHaveBeenCalledTimes(1);
    delete globalThis.Element.prototype.scrollIntoView;
  });
});
