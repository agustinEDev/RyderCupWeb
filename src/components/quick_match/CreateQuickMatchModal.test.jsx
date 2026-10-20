import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import CreateQuickMatchModal from './CreateQuickMatchModal';
import ScorersStep from './ScorersStep';
import GolfCourse from '../../domain/entities/GolfCourse';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, params) => {
      if (params?.current !== undefined) return `${key}_${params.current}_${params.total}`;
      if (params?.count !== undefined) return `${key}_${params.count}_${params.max}`;
      return key;
    },
    i18n: { language: 'en' },
  }),
}));

vi.mock('../golf_course/GolfCourseSearchBox', () => ({
  default: ({ onCourseSelect }) => (
    <>
      <button
        type="button"
        data-testid="select-course-stub"
        onClick={() => onCourseSelect({ id: 'course-1', name: 'St Andrews' })}
      >
        Select course
      </button>
      <button
        type="button"
        data-testid="select-course-stub-2"
        onClick={() => onCourseSelect({ id: 'course-2', name: 'Valderrama' })}
      >
        Select other course
      </button>
    </>
  ),
}));

const mockIniciar = vi.fn();
const mockListFriends = vi.fn();
const mockGetGolfCourse = vi.fn();

vi.mock('../../composition', () => ({
  createAndStartQuickMatchUseCase: { execute: (...args) => mockIniciar(...args) },
  listFriendsUseCase: { execute: (...args) => mockListFriends(...args) },
  getGolfCourseUseCase: { execute: (...args) => mockGetGolfCourse(...args) },
}));

const currentUser = { id: 'user-1', country_code: 'ES', display_name: 'Me', handicap: 10 };

// Desde FE #848 nada llega al servidor hasta «Confirmar e iniciar»: lo que se
// eligió en cada paso se comprueba en la petición que sale al final
const peticion = () => mockIniciar.mock.calls.at(-1)[0];

const addGuest = (firstName = 'Jane', lastName = 'Doe') => {
  fireEvent.click(screen.getByTestId('quick-match-tab-guest'));
  fireEvent.change(screen.getByTestId('quick-match-guest-first-name'), { target: { value: firstName } });
  fireEvent.change(screen.getByTestId('quick-match-guest-last-name'), { target: { value: lastName } });
  fireEvent.click(screen.getByTestId('quick-match-add-guest'));
};

/** Del paso 2 al final: rellena con invitados lo que falte y confirma. */
const finishFromParticipants = async (huecos = 0) => {
  await screen.findByTestId('quick-match-participants-next');
  for (let i = 0; i < huecos; i += 1) addGuest(`Guest${i}`, 'Doe');
  await waitFor(() => expect(screen.getByTestId('quick-match-participants-next')).not.toBeDisabled());
  fireEvent.click(screen.getByTestId('quick-match-participants-next'));
  fireEvent.click(await screen.findByTestId('quick-match-scorers-next'));
  fireEvent.click(await screen.findByTestId('quick-match-start'));
  await waitFor(() => expect(mockIniciar).toHaveBeenCalled());
};

const renderModal = (props = {}) => {
  return render(
    <MemoryRouter>
      <CreateQuickMatchModal
        onClose={vi.fn()}
        onStarted={vi.fn()}
        currentUser={currentUser}
        {...props}
      />
    </MemoryRouter>
  );
};

// Elegir salida es ahora abrir el panel agrupado por género y tocar una opción,
// el mismo gesto que ya se usaba para los amigos. La fila plana de botones se
// retiró porque "Amarillas (M)" y "Amarillas (F)" iban pegadas y se confundían.
const pickCreatorTee = (key) => {
  fireEvent.click(screen.getByTestId('quick-match-creator-tee'));
  fireEvent.click(screen.getByTestId(`quick-match-tee-panel-option-${key}`));
};

const pickGuestTee = (key) => {
  fireEvent.click(screen.getByTestId('quick-match-guest-tee'));
  fireEvent.click(screen.getByTestId(`quick-match-tee-panel-option-${key}`));
};

describe('CreateQuickMatchModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListFriends.mockResolvedValue({ friendships: [], totalCount: 0 });
    mockGetGolfCourse.mockResolvedValue({ tees: [] });
    mockIniciar.mockResolvedValue({ id: 'qm-1' });
  });

  it('should send the entered name, trimmed, only when confirming', async () => {
    renderModal();

    fireEvent.change(screen.getByTestId('quick-match-name-input'), {
      target: { value: '  Viernes con Rafa  ' },
    });
    fireEvent.click(screen.getByTestId('select-course-stub'));
    await waitFor(() => {
      expect(screen.getByTestId('quick-match-course-next')).not.toBeDisabled();
    });
    fireEvent.click(screen.getByTestId('quick-match-course-next'));
    expect(mockIniciar).not.toHaveBeenCalled();
    await finishFromParticipants(1);

    expect(peticion()).toMatchObject({
      golfCourseId: 'course-1',
      matchFormat: 'SINGLES',
      scoringFormat: null,
      name: 'Viernes con Rafa',
      allowancePercentage: 100,
      playMode: 'HANDICAP',
      creatorTeeColor: null,
      creatorTeeGender: null,
    });
  });

  it('should send null when no name is entered', async () => {
    renderModal();

    fireEvent.click(screen.getByTestId('select-course-stub'));
    await waitFor(() => {
      expect(screen.getByTestId('quick-match-course-next')).not.toBeDisabled();
    });
    fireEvent.click(screen.getByTestId('quick-match-course-next'));
    await finishFromParticipants(1);

    expect(peticion().name).toBeNull();
  });

  it('should create a free-play quick match with the selected scoring format', async () => {
    renderModal();

    fireEvent.click(screen.getByTestId('mode-option-FREE_PLAY'));
    fireEvent.click(screen.getByTestId('scoring-format-option-MEDAL'));
    fireEvent.click(screen.getByTestId('select-course-stub'));
    await waitFor(() => {
      expect(screen.getByTestId('quick-match-course-next')).not.toBeDisabled();
    });
    fireEvent.click(screen.getByTestId('quick-match-course-next'));
    await finishFromParticipants();

    expect(peticion()).toMatchObject({
      matchFormat: null,
      scoringFormat: 'MEDAL',
      allowancePercentage: 95,
    });
  });

  it('should allow moving past the participants step with only the creator in free play', async () => {

    renderModal();

    fireEvent.click(screen.getByTestId('mode-option-FREE_PLAY'));
    fireEvent.click(screen.getByTestId('select-course-stub'));
    await waitFor(() => {
      expect(screen.getByTestId('quick-match-course-next')).not.toBeDisabled();
    });
    fireEvent.click(screen.getByTestId('quick-match-course-next'));

    await waitFor(() => {
      expect(screen.getByTestId('quick-match-participants-next')).not.toBeDisabled();
    });
  });

  it('should default the allowance to the WHS value for the selected format and let it be overridden', async () => {
    renderModal();

    fireEvent.click(screen.getByTestId('format-option-FOURBALL'));
    expect(screen.getByTestId('quick-match-allowance-option-90')).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByTestId('quick-match-allowance-option-50'));
    fireEvent.click(screen.getByTestId('select-course-stub'));
    await waitFor(() => {
      expect(screen.getByTestId('quick-match-course-next')).not.toBeDisabled();
    });
    fireEvent.click(screen.getByTestId('quick-match-course-next'));
    await screen.findByTestId('quick-match-participants-next');
    addGuest('Ana', 'A');
    fireEvent.click(screen.getByTestId('quick-match-team-B'));
    await finishFromParticipants(2);

    expect(peticion()).toMatchObject({ matchFormat: 'FOURBALL', allowancePercentage: 50 });
  });

  it('should only offer 90/95/100 allowance options in free play', async () => {
    renderModal();

    fireEvent.click(screen.getByTestId('mode-option-FREE_PLAY'));

    expect(screen.getByTestId('quick-match-allowance-option-90')).toBeInTheDocument();
    expect(screen.getByTestId('quick-match-allowance-option-95')).toBeInTheDocument();
    expect(screen.getByTestId('quick-match-allowance-option-100')).toBeInTheDocument();
    expect(screen.queryByTestId('quick-match-allowance-option-50')).not.toBeInTheDocument();
  });

  it('should let the creator pick a tee once the course tees are loaded', async () => {
    mockGetGolfCourse.mockResolvedValue({
      tees: [
        { color: 'YELLOW', gender: 'MALE', identifier: 'White', courseRating: 71, slopeRating: 128 },
      ],
    });

    renderModal();

    fireEvent.click(screen.getByTestId('mode-option-FREE_PLAY'));
    fireEvent.click(screen.getByTestId('select-course-stub'));

    await waitFor(() => {
      expect(screen.getByTestId('quick-match-creator-tee')).toBeInTheDocument();
    });
    pickCreatorTee('YELLOW|MALE');
    fireEvent.click(screen.getByTestId('quick-match-course-next'));
    await finishFromParticipants();

    expect(peticion()).toMatchObject({ creatorTeeColor: 'YELLOW', creatorTeeGender: 'MALE' });
  });

  it('should let a guest tee be selected and sent when adding them', async () => {
    mockGetGolfCourse.mockResolvedValue({
      tees: [
        { color: 'RED', gender: 'FEMALE', identifier: 'Red', courseRating: 68, slopeRating: 118 },
      ],
    });

    renderModal();

    fireEvent.click(screen.getByTestId('select-course-stub'));
    await waitFor(() => {
      expect(screen.getByTestId('quick-match-creator-tee')).toBeInTheDocument();
    });
    pickCreatorTee('RED|FEMALE');
    fireEvent.click(screen.getByTestId('quick-match-course-next'));

    await waitFor(() => {
      expect(screen.getByText('create.participants.tabGuest')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('create.participants.tabGuest'));

    pickGuestTee('RED|FEMALE');
    fireEvent.change(screen.getByPlaceholderText('create.participants.guestFirstName'), {
      target: { value: 'Jane' },
    });
    fireEvent.change(screen.getByPlaceholderText('create.participants.guestLastName'), {
      target: { value: 'Doe' },
    });
    fireEvent.click(screen.getByText('create.participants.addGuest'));
    await finishFromParticipants();

    expect(peticion().participants).toEqual([
      {
        kind: 'GUEST',
        firstName: 'Jane',
        lastName: 'Doe',
        handicap: null,
        team: null,
        teeColor: 'RED',
        teeGender: 'FEMALE',
      },
    ]);
  });

  it('should ignore a stale course-tees response from a previously selected course', async () => {
    const deferred = {};
    ['course-1', 'course-2'].forEach((id) => {
      deferred[id] = {};
      deferred[id].promise = new Promise((resolve) => {
        deferred[id].resolve = resolve;
      });
    });
    mockGetGolfCourse.mockImplementation((id) => deferred[id].promise);

    renderModal();

    // Select course-1, then quickly re-select course-2 before course-1's request resolves
    fireEvent.click(screen.getByTestId('select-course-stub'));
    fireEvent.click(screen.getByTestId('select-course-stub-2'));

    // course-2's response arrives first (its own request), then the stale course-1 one arrives after
    deferred['course-2'].resolve({
      tees: [{ color: 'RED', gender: 'FEMALE', identifier: 'Red', courseRating: 68, slopeRating: 118 }],
    });
    deferred['course-1'].resolve({
      tees: [{ color: 'YELLOW', gender: 'MALE', identifier: 'White', courseRating: 71, slopeRating: 128 }],
    });

    await waitFor(() => {
      expect(screen.getByTestId('quick-match-creator-tee')).toBeInTheDocument();
    });

    // Only course-2's tee ("Red") must be present — the stale course-1 response ("White") must not overwrite it
    fireEvent.click(screen.getByTestId('quick-match-creator-tee'));
    expect(screen.getByTestId('quick-match-tee-panel-option-RED|FEMALE')).toBeInTheDocument();
    expect(screen.queryByTestId('quick-match-tee-panel-option-YELLOW|MALE')).not.toBeInTheDocument();
  });

  it('should reset the creator tee selection when switching to a different course', async () => {
    mockGetGolfCourse.mockImplementation((id) =>
      id === 'course-1'
        ? Promise.resolve({ tees: [{ color: 'YELLOW', gender: 'MALE', identifier: 'White', courseRating: 71, slopeRating: 128 }] })
        : Promise.resolve({ tees: [{ color: 'RED', gender: 'FEMALE', identifier: 'Red', courseRating: 68, slopeRating: 118 }] })
    );

    renderModal();

    fireEvent.click(screen.getByTestId('select-course-stub'));
    await waitFor(() => {
      expect(screen.getByTestId('quick-match-creator-tee')).toBeInTheDocument();
    });
    pickCreatorTee('YELLOW|MALE');

    fireEvent.click(screen.getByTestId('select-course-stub-2'));
    await waitFor(() => {
      expect(screen.getByTestId('quick-match-creator-tee')).toBeInTheDocument();
    });

    // The tee picked for course-1 must not silently carry over to course-2
    expect(screen.getByTestId('quick-match-creator-tee')).toHaveTextContent(
      'create.course.yourTeePlaceholder'
    );

    fireEvent.click(screen.getByTestId('quick-match-course-next'));
    expect(screen.getByTestId('quick-match-modal-error')).toHaveTextContent('create.course.errorTeeRequired');
    expect(mockIniciar).not.toHaveBeenCalled();
  });

  it('should let each friend be added with their own, independently selected tee', async () => {
    mockGetGolfCourse.mockResolvedValue({
      tees: [
        { color: 'YELLOW', gender: 'MALE', identifier: 'White', courseRating: 71, slopeRating: 128 },
        { color: 'RED', gender: 'FEMALE', identifier: 'Red', courseRating: 68, slopeRating: 118 },
      ],
    });
    mockListFriends.mockResolvedValue({
      friendships: [
        { id: 'f-1', otherUserId: 'user-2', otherUserName: 'Alice' },
        { id: 'f-2', otherUserId: 'user-3', otherUserName: 'Bob' },
      ],
      totalCount: 2,
    });

    renderModal();

    // Free play (capacity 4) so the roster isn't already full after adding just Alice
    fireEvent.click(screen.getByTestId('mode-option-FREE_PLAY'));
    fireEvent.click(screen.getByTestId('select-course-stub'));
    await waitFor(() => {
      expect(screen.getByTestId('quick-match-creator-tee')).toBeInTheDocument();
    });
    pickCreatorTee('YELLOW|MALE');
    fireEvent.click(screen.getByTestId('quick-match-course-next'));

    await waitFor(() => {
      expect(screen.getByTestId('quick-match-add-friend-f-1')).toBeInTheDocument();
    });

    // La salida se elige en el panel que abre el + de cada amigo, no en su fila
    fireEvent.click(screen.getByTestId('quick-match-add-friend-f-1'));
    fireEvent.click(screen.getByTestId('quick-match-tee-panel-option-YELLOW|MALE'));

    // El panel del siguiente amigo empieza limpio: la salida de Alice no arrastra
    fireEvent.click(await screen.findByTestId('quick-match-add-friend-f-2'));
    fireEvent.click(screen.getByTestId('quick-match-tee-panel-option-RED|FEMALE'));
    await finishFromParticipants();

    expect(peticion().participants.map((p) => [p.friendUserId, p.teeColor, p.teeGender])).toEqual([
      ['user-2', 'YELLOW', 'MALE'],
      ['user-3', 'RED', 'FEMALE'],
    ]);
  });

  it('should not pre-select any tee option', async () => {
    mockGetGolfCourse.mockResolvedValue({
      tees: [{ color: 'YELLOW', gender: 'MALE', identifier: 'White', courseRating: 71, slopeRating: 128 }],
    });

    renderModal();

    fireEvent.click(screen.getByTestId('select-course-stub'));

    await waitFor(() => {
      expect(screen.getByTestId('quick-match-creator-tee')).toBeInTheDocument();
    });
    // Sin elegir nada, el campo enseña el marcador de posición
    expect(screen.getByTestId('quick-match-creator-tee')).toHaveTextContent(
      'create.course.yourTeePlaceholder'
    );

    // Y dentro del panel ninguna salida sale marcada
    fireEvent.click(screen.getByTestId('quick-match-creator-tee'));
    expect(screen.getByTestId('quick-match-tee-panel-option-YELLOW|MALE')).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.queryByText('create.course.noTeeOption')).not.toBeInTheDocument();
  });

  it('should require a tee selection before continuing when the course has tees', async () => {
    mockGetGolfCourse.mockResolvedValue({
      tees: [{ color: 'YELLOW', gender: 'MALE', identifier: 'White', courseRating: 71, slopeRating: 128 }],
    });

    renderModal();

    fireEvent.click(screen.getByTestId('select-course-stub'));
    await waitFor(() => {
      expect(screen.getByTestId('quick-match-creator-tee')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('quick-match-course-next'));

    expect(screen.getByTestId('quick-match-modal-error')).toHaveTextContent('create.course.errorTeeRequired');
    expect(mockIniciar).not.toHaveBeenCalled();
  });

  it('should require a tee selection before adding a friend when the course has tees', async () => {
    mockGetGolfCourse.mockResolvedValue({
      tees: [{ color: 'YELLOW', gender: 'MALE', identifier: 'White', courseRating: 71, slopeRating: 128 }],
    });
    mockListFriends.mockResolvedValue({
      friendships: [{ id: 'f-1', otherUserId: 'user-2', otherUserName: 'Alice' }],
      totalCount: 1,
    });

    renderModal();

    fireEvent.click(screen.getByTestId('select-course-stub'));
    await waitFor(() => {
      expect(screen.getByTestId('quick-match-creator-tee')).toBeInTheDocument();
    });
    pickCreatorTee('YELLOW|MALE');
    fireEvent.click(screen.getByTestId('quick-match-course-next'));

    await waitFor(() => {
      expect(screen.getByTestId('quick-match-add-friend-f-1')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('quick-match-add-friend-f-1'));

    // El + ya no añade: abre el panel de salidas. Así no hay forma de añadir a
    // nadie sin salida en un campo que las tiene, y no hace falta el error
    expect(screen.getByTestId('quick-match-tee-panel')).toBeInTheDocument();
    expect(mockIniciar).not.toHaveBeenCalled();
  });

  it('should require a tee selection before adding a guest when the course has tees', async () => {
    mockGetGolfCourse.mockResolvedValue({
      tees: [{ color: 'YELLOW', gender: 'MALE', identifier: 'White', courseRating: 71, slopeRating: 128 }],
    });

    renderModal();

    fireEvent.click(screen.getByTestId('select-course-stub'));
    await waitFor(() => {
      expect(screen.getByTestId('quick-match-creator-tee')).toBeInTheDocument();
    });
    pickCreatorTee('YELLOW|MALE');
    fireEvent.click(screen.getByTestId('quick-match-course-next'));

    await waitFor(() => {
      expect(screen.getByText('create.participants.tabGuest')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('create.participants.tabGuest'));

    fireEvent.change(screen.getByPlaceholderText('create.participants.guestFirstName'), {
      target: { value: 'Jane' },
    });
    fireEvent.change(screen.getByPlaceholderText('create.participants.guestLastName'), {
      target: { value: 'Doe' },
    });
    fireEvent.click(screen.getByText('create.participants.addGuest'));

    expect(screen.getByTestId('quick-match-modal-error')).toHaveTextContent('create.participants.errorTeeRequired');
    expect(mockIniciar).not.toHaveBeenCalled();
  });

  it('should return to step 1 when going back from participants, with nothing to cancel', async () => {
    renderModal();

    fireEvent.click(screen.getByTestId('select-course-stub'));
    await waitFor(() => {
      expect(screen.getByTestId('quick-match-course-next')).not.toBeDisabled();
    });
    fireEvent.click(screen.getByTestId('quick-match-course-next'));

    await waitFor(() => {
      expect(screen.getByTestId('quick-match-participants-back')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('quick-match-participants-back'));

    expect(await screen.findByTestId('quick-match-course-next')).toBeInTheDocument();
    expect(mockIniciar).not.toHaveBeenCalled();
  });

  it('should return to the participants step without cancelling when going back from scorers', async () => {

    renderModal();

    fireEvent.click(screen.getByTestId('mode-option-FREE_PLAY'));
    fireEvent.click(screen.getByTestId('select-course-stub'));
    await waitFor(() => {
      expect(screen.getByTestId('quick-match-course-next')).not.toBeDisabled();
    });
    fireEvent.click(screen.getByTestId('quick-match-course-next'));

    await waitFor(() => {
      expect(screen.getByTestId('quick-match-participants-next')).not.toBeDisabled();
    });
    fireEvent.click(screen.getByTestId('quick-match-participants-next'));

    await waitFor(() => {
      expect(screen.getByTestId('quick-match-scorers-back')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('quick-match-scorers-back'));

    expect(mockIniciar).not.toHaveBeenCalled();
    expect(screen.getByTestId('quick-match-participants-next')).toBeInTheDocument();
  });

  it('should move to the summary step after choosing scorers', async () => {

    renderModal();

    fireEvent.click(screen.getByTestId('mode-option-FREE_PLAY'));
    fireEvent.click(screen.getByTestId('select-course-stub'));
    await waitFor(() => {
      expect(screen.getByTestId('quick-match-course-next')).not.toBeDisabled();
    });
    fireEvent.click(screen.getByTestId('quick-match-course-next'));

    await waitFor(() => {
      expect(screen.getByTestId('quick-match-participants-next')).not.toBeDisabled();
    });
    fireEvent.click(screen.getByTestId('quick-match-participants-next'));

    await waitFor(() => {
      expect(screen.getByTestId('quick-match-scorers-next')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('quick-match-scorers-next'));

    await waitFor(() => {
      expect(screen.getByTestId('quick-match-start')).toBeInTheDocument();
      expect(screen.getByTestId('quick-match-handicap-button-user-1')).toBeInTheDocument();
    });
    expect(mockIniciar).not.toHaveBeenCalled();
  });

  it('should set a participant handicap via the keypad panel in the summary step', async () => {
    renderModal({ currentUser: { ...currentUser, handicap: null } });

    fireEvent.click(screen.getByTestId('mode-option-FREE_PLAY'));
    fireEvent.click(screen.getByTestId('select-course-stub'));
    await waitFor(() => expect(screen.getByTestId('quick-match-course-next')).not.toBeDisabled());
    fireEvent.click(screen.getByTestId('quick-match-course-next'));
    await waitFor(() => expect(screen.getByTestId('quick-match-participants-next')).not.toBeDisabled());
    fireEvent.click(screen.getByTestId('quick-match-participants-next'));
    await waitFor(() => expect(screen.getByTestId('quick-match-scorers-next')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('quick-match-scorers-next'));

    fireEvent.click(await screen.findByTestId('quick-match-handicap-button-user-1'));
    const panel = await screen.findByRole('dialog', { name: 'Me' });
    fireEvent.click(within(panel).getByText('1'));
    fireEvent.click(within(panel).getByText('6'));
    fireEvent.click(within(panel).getByText('.'));
    fireEvent.click(within(panel).getByText('4'));
    fireEvent.click(within(panel).getByTestId('handicap-panel-confirm'));

    expect(screen.getByTestId('quick-match-handicap-button-user-1')).toHaveTextContent('16.4');
    fireEvent.click(screen.getByTestId('quick-match-start'));
    await waitFor(() => expect(mockIniciar).toHaveBeenCalled());
    expect(peticion().creatorHandicap).toBe(16.4);
  });

  // Un hándicap plus se guarda negativo y se lee con «+» (FE #797)
  it('shows a plus handicap with its plus sign in the summary step', async () => {
    renderModal({ currentUser: { ...currentUser, handicap: -2 } });

    fireEvent.click(screen.getByTestId('mode-option-FREE_PLAY'));
    fireEvent.click(screen.getByTestId('select-course-stub'));
    await waitFor(() => expect(screen.getByTestId('quick-match-course-next')).not.toBeDisabled());
    fireEvent.click(screen.getByTestId('quick-match-course-next'));
    await waitFor(() => expect(screen.getByTestId('quick-match-participants-next')).not.toBeDisabled());
    fireEvent.click(screen.getByTestId('quick-match-participants-next'));
    await waitFor(() => expect(screen.getByTestId('quick-match-scorers-next')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('quick-match-scorers-next'));

    expect(await screen.findByTestId('quick-match-handicap-button-user-1')).toHaveTextContent('+2.0');
  });

  it('should not send an override when confirming without changing the value', async () => {
    renderModal();

    fireEvent.click(screen.getByTestId('mode-option-FREE_PLAY'));
    fireEvent.click(screen.getByTestId('select-course-stub'));
    await waitFor(() => expect(screen.getByTestId('quick-match-course-next')).not.toBeDisabled());
    fireEvent.click(screen.getByTestId('quick-match-course-next'));
    await waitFor(() => expect(screen.getByTestId('quick-match-participants-next')).not.toBeDisabled());
    fireEvent.click(screen.getByTestId('quick-match-participants-next'));
    await waitFor(() => expect(screen.getByTestId('quick-match-scorers-next')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('quick-match-scorers-next'));

    fireEvent.click(await screen.findByTestId('quick-match-handicap-button-user-1'));
    const panel = await screen.findByRole('dialog', { name: 'Me' });
    fireEvent.click(within(panel).getByTestId('handicap-panel-confirm'));
    fireEvent.click(screen.getByTestId('quick-match-start'));

    await waitFor(() => expect(mockIniciar).toHaveBeenCalled());
    expect(peticion().creatorHandicap).toBeNull();
  });

  it('should start the match when confirming from the summary step', async () => {
    const onStarted = vi.fn();

    renderModal({ onStarted });

    fireEvent.click(screen.getByTestId('mode-option-FREE_PLAY'));
    fireEvent.click(screen.getByTestId('select-course-stub'));
    await waitFor(() => expect(screen.getByTestId('quick-match-course-next')).not.toBeDisabled());
    fireEvent.click(screen.getByTestId('quick-match-course-next'));
    await finishFromParticipants();

    await waitFor(() => expect(onStarted).toHaveBeenCalledWith('qm-1'));
    expect(peticion().scorerUserIds).toEqual(['user-1']);
  });

  it('should return to the scorers step when going back from the summary', async () => {

    renderModal();

    fireEvent.click(screen.getByTestId('mode-option-FREE_PLAY'));
    fireEvent.click(screen.getByTestId('select-course-stub'));
    await waitFor(() => expect(screen.getByTestId('quick-match-course-next')).not.toBeDisabled());
    fireEvent.click(screen.getByTestId('quick-match-course-next'));
    await waitFor(() => expect(screen.getByTestId('quick-match-participants-next')).not.toBeDisabled());
    fireEvent.click(screen.getByTestId('quick-match-participants-next'));
    await waitFor(() => expect(screen.getByTestId('quick-match-scorers-next')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('quick-match-scorers-next'));

    await screen.findByTestId('quick-match-summary-back');
    fireEvent.click(screen.getByTestId('quick-match-summary-back'));

    expect(screen.getByTestId('quick-match-scorers-next')).toBeInTheDocument();
    expect(mockIniciar).not.toHaveBeenCalled();
  });

  /**
   * The summary is the last screen before the round starts, and it used to read
   * "Allowance 100%" on a scratch match — the one setting that guarantees the
   * allowance is not applied at all. Step 1 already greys it out for that
   * reason; the recap contradicted it.
   */
  const goToSummary = async () => {
    await waitFor(() => expect(screen.getByTestId('quick-match-course-next')).not.toBeDisabled());
    fireEvent.click(screen.getByTestId('quick-match-course-next'));
    await waitFor(() =>
      expect(screen.getByTestId('quick-match-participants-next')).not.toBeDisabled()
    );
    fireEvent.click(screen.getByTestId('quick-match-participants-next'));
    await waitFor(() => expect(screen.getByTestId('quick-match-scorers-next')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('quick-match-scorers-next'));
    await screen.findByTestId('quick-match-start');
  };

  it('should recap a scratch match without an allowance percentage', async () => {

    renderModal();

    fireEvent.click(screen.getByTestId('mode-option-FREE_PLAY'));
    fireEvent.click(screen.getByTestId('select-course-stub'));
    fireEvent.click(screen.getByTestId('quick-match-play-mode-option-SCRATCH'));
    await goToSummary();

    expect(screen.getByTestId('quick-match-summary-play-mode')).toHaveTextContent(
      'create.course.playModeScratch'
    );
    const allowance = screen.getByTestId('quick-match-summary-allowance');
    expect(allowance).toHaveTextContent('create.summary.allowanceNotApplied');
    expect(allowance).not.toHaveTextContent('%');
  });

  it('should recap the allowance and the handicap mode on a non-scratch match', async () => {

    renderModal();

    fireEvent.click(screen.getByTestId('mode-option-FREE_PLAY'));
    fireEvent.click(screen.getByTestId('select-course-stub'));
    await goToSummary();

    expect(screen.getByTestId('quick-match-summary-play-mode')).toHaveTextContent(
      'create.course.playModeHandicap'
    );
    expect(screen.getByTestId('quick-match-summary-allowance')).toHaveTextContent('95%');
  });

  it('should show each player tee in the summary, where a wrong one is still cheap to fix', async () => {
    mockGetGolfCourse.mockResolvedValue({
      tees: [{ color: 'YELLOW', gender: 'FEMALE', courseRating: 70, slopeRating: 120 }],
    });

    renderModal();

    fireEvent.click(screen.getByTestId('mode-option-FREE_PLAY'));
    fireEvent.click(screen.getByTestId('select-course-stub'));
    await waitFor(() => expect(screen.getByTestId('quick-match-creator-tee')).toBeInTheDocument());
    pickCreatorTee('YELLOW|FEMALE');
    await goToSummary();

    const summary = screen.getByTestId('quick-match-start').closest('div.p-4');
    expect(within(summary).getByText(/form\.teeColors\.YELLOW \(F\)/)).toBeInTheDocument();
  });

  /**
   * Sin salida el reparto cae al Handicap Index en vez de al hándicap de juego
   * —varios golpes— y ese es justo el caso que se quedaba en blanco: el resumen
   * que existe para cazar una salida equivocada no enseñaba ninguna línea.
   * Pasa de verdad: si la carga de salidas del campo falla, el modal la traga
   * (`setCourseTees([])`) y el guard de "elige salida" no salta con la lista
   * vacía, así que todos se crean con `color: null`.
   */
  it('avisa cuando un jugador se queda sin barras, en vez de no enseñar nada', async () => {

    renderModal();

    fireEvent.click(screen.getByTestId('mode-option-FREE_PLAY'));
    fireEvent.click(screen.getByTestId('select-course-stub'));
    await goToSummary();

    expect(screen.getByTestId('quick-match-summary-tee-user-1')).toHaveTextContent(
      'create.summary.noTee'
    );
  });

  /**
   * En scratch nadie recibe golpes, así que quedarse sin salida no cuesta nada:
   * avisar de que "jugará con el hándicap exacto" sería afirmar un efecto que
   * ese modo no tiene.
   */
  it('no avisa de la falta de barras en una partida scratch, donde no cambia nada', async () => {

    renderModal();

    fireEvent.click(screen.getByTestId('mode-option-FREE_PLAY'));
    fireEvent.click(screen.getByTestId('select-course-stub'));
    fireEvent.click(screen.getByTestId('quick-match-play-mode-option-SCRATCH'));
    await goToSummary();

    expect(screen.getByTestId('quick-match-summary-tee-user-1')).not.toHaveTextContent(
      'create.summary.noTee'
    );
  });

  it('nombra la barra igual que el paso 1 cuando el campo le da identificador', async () => {
    mockGetGolfCourse.mockResolvedValue({
      tees: [
        { color: 'YELLOW', gender: 'FEMALE', identifier: 'Amarillas Campeonato', courseRating: 72, slopeRating: 113 },
      ],
    });

    renderModal();

    fireEvent.click(screen.getByTestId('mode-option-FREE_PLAY'));
    fireEvent.click(screen.getByTestId('select-course-stub'));
    await waitFor(() => {
      expect(screen.getByTestId('quick-match-creator-tee')).toBeInTheDocument();
    });
    pickCreatorTee('YELLOW|FEMALE');
    await goToSummary();

    // el identificador, no el nombre del color: el paso 1 dice "Amarillas
    // Campeonato (F)" y el resumen decía "Amarillas (F)"
    expect(screen.getByTestId('quick-match-summary-tee-user-1')).toHaveTextContent(
      'Amarillas Campeonato (F)'
    );
  });
});

describe('CreateQuickMatchModal · el paso 3 en foursomes, con el asistente entero', () => {
  /**
   * Los tests de abajo montan `ScorersStep` con `rivalCanScore` puesto a mano,
   * así que no tocan `rivalCanScore()`, `chooseScoringSides()` ni la rama de
   * foursomes de `goToScorers()`: invertir su ternario no rompía ninguno.
   * Estos recorren el asistente de verdad.
   */
  beforeEach(() => {
    vi.clearAllMocks();
    mockListFriends.mockResolvedValue({ friendships: [], totalCount: 0 });
    mockGetGolfCourse.mockResolvedValue({ tees: [] });
  });

  // El roster se monta en el asistente, como lo haría quien juega: amigos
  // registrados (Socio, Rival Uno) e invitados, cada uno en su pareja
  const goToScorersStep = async (roster) => {
    mockListFriends.mockResolvedValue({
      friendships: [
        { id: 'f-2', otherUserId: 'user-2', otherUserName: 'Socio' },
        { id: 'f-3', otherUserId: 'user-3', otherUserName: 'Rival Uno' },
      ],
      totalCount: 2,
    });
    mockIniciar.mockResolvedValue({ id: 'qm-1' });

    renderModal({ currentUser: { ...currentUser, display_name: 'Yo' } });

    fireEvent.click(screen.getByTestId('format-option-FOURSOMES'));
    fireEvent.click(screen.getByTestId('select-course-stub'));
    await waitFor(() => {
      expect(screen.getByTestId('quick-match-course-next')).not.toBeDisabled();
    });
    fireEvent.click(screen.getByTestId('quick-match-course-next'));
    await screen.findByTestId('quick-match-participants-next');

    for (const jugador of roster) {
      fireEvent.click(screen.getByTestId(`quick-match-team-${jugador.team}`));
      if (jugador.friend) {
        fireEvent.click(screen.getByTestId('quick-match-tab-friends'));
        fireEvent.click(await screen.findByTestId(`quick-match-add-friend-${jugador.friend}`));
      } else {
        addGuest(jugador.guest, 'Doe');
      }
    }

    await waitFor(() => {
      expect(screen.getByTestId('quick-match-participants-next')).not.toBeDisabled();
    });
    fireEvent.click(screen.getByTestId('quick-match-participants-next'));

    await waitFor(() => {
      expect(screen.getByTestId('quick-match-scorers-my-pair')).toBeInTheDocument();
    });
  };

  const SOCIO = { friend: 'f-2', team: 'A' };
  const RIVAL_UNO = { friend: 'f-3', team: 'B' };
  const withRegisteredRival = [SOCIO, RIVAL_UNO, { guest: 'Rival Dos', team: 'B' }];

  it('llega al paso con las dos parejas ya elegidas', async () => {
    await goToScorersStep(withRegisteredRival);

    // Es la opción por defecto, y se ve cuál está elegida sin depender del color.
    expect(screen.getByTestId('quick-match-scorers-both-pairs')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByTestId('quick-match-scorers-my-pair')).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('cambia a que apunte solo mi pareja', async () => {
    await goToScorersStep(withRegisteredRival);

    fireEvent.click(screen.getByTestId('quick-match-scorers-my-pair'));

    expect(screen.getByTestId('quick-match-scorers-my-pair')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByTestId('quick-match-scorers-both-pairs')).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('con la pareja de enfrente toda invitada, ni la ofrece ni la deja elegida', async () => {
    await goToScorersStep([SOCIO, { guest: 'Rival Uno', team: 'B' }, { guest: 'Rival Dos', team: 'B' }]);

    expect(screen.queryByTestId('quick-match-scorers-both-pairs')).not.toBeInTheDocument();
    expect(screen.getByTestId('quick-match-scorers-my-pair')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  /**
   * Con «las dos parejas», anotan los registrados de las dos, y nadie más: un
   * invitado no tiene cuenta con la que anotar. Por su UserId (FE #848).
   */
  it('manda como anotadores a los registrados de las dos parejas', async () => {
    await goToScorersStep(withRegisteredRival);

    fireEvent.click(screen.getByTestId('quick-match-scorers-next'));
    await waitFor(() => expect(screen.getByTestId('quick-match-start')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('quick-match-start'));

    await waitFor(() => {
      expect(mockIniciar).toHaveBeenCalled();
    });
    expect(peticion().scorerUserIds).toEqual(['user-1', 'user-2', 'user-3']);
  });

  /**
   * «Puede apuntar cualquiera de los dos» y «Lleváis las dos tarjetas» son
   * ciertas con el compañero registrado. Con un invitado al lado, el único que
   * anota es quien crea la partida.
   */
  it('no promete que apunte el compañero cuando es un invitado', async () => {
    await goToScorersStep([{ guest: 'Socio', team: 'A' }, RIVAL_UNO, { guest: 'Rival Dos', team: 'B' }]);

    expect(screen.getByText('create.scorers.foursomesDescriptionAlone')).toBeInTheDocument();
    expect(screen.getByText('create.scorers.onlyMyPairHintAlone')).toBeInTheDocument();
    expect(screen.queryByText('create.scorers.onlyMyPairHint')).not.toBeInTheDocument();
  });
});

describe('CreateQuickMatchModal · quién lleva la tarjeta en foursomes', () => {
  /**
   * En foursomes la pareja juega una bola y lleva una tarjeta, así que el paso
   * no pregunta jugador a jugador: pregunta si apuntan las dos parejas —cada
   * una marca a la otra— o solo la de quien crea la partida.
   */
  const foursomesRoster = [
    { participantId: 'p-1', userId: 'user-1', name: 'Yo', team: 'A', isGuest: false },
    { participantId: 'p-2', userId: 'user-2', name: 'Socio', team: 'A', isGuest: false },
    { participantId: 'p-3', userId: 'user-3', name: 'Rival Uno', team: 'B', isGuest: false },
    { participantId: 'p-4', name: 'Rival Dos', team: 'B', isGuest: true },
  ];

  const guestOnlyRival = [
    foursomesRoster[0],
    foursomesRoster[1],
    { participantId: 'p-3', name: 'Rival Uno', team: 'B', isGuest: true },
    foursomesRoster[3],
  ];

  it('ofrece las dos parejas cuando enfrente hay con qué anotar', () => {
    render(
      <ScorersStep
        t={(key) => key}
        registeredParticipants={foursomesRoster.filter((p) => !p.isGuest)}
        currentUser={{ id: 'user-1' }}
        scorerIds={['p-1', 'p-2', 'p-3']}
        onToggleScorer={vi.fn()}
        isFoursomes
        rivalCanScore
        onChooseScoringSides={vi.fn()}
        isProcessing={false}
        onBack={vi.fn()}
        onClose={vi.fn()}
        onNext={vi.fn()}
      />
    );

    expect(screen.getByTestId('quick-match-scorers-both-pairs')).toBeInTheDocument();
    expect(screen.getByTestId('quick-match-scorers-my-pair')).toBeInTheDocument();
    // Y no la lista de casillas por jugador
    expect(screen.queryByText('Rival Uno')).not.toBeInTheDocument();
  });

  /** Dos invitados enfrente no tienen cuenta con la que anotar: no se ofrece. */
  it('esconde las dos parejas cuando la de enfrente no puede anotar', () => {
    render(
      <ScorersStep
        t={(key) => key}
        registeredParticipants={guestOnlyRival.filter((p) => !p.isGuest)}
        currentUser={{ id: 'user-1' }}
        scorerIds={['p-1', 'p-2']}
        onToggleScorer={vi.fn()}
        isFoursomes
        rivalCanScore={false}
        onChooseScoringSides={vi.fn()}
        isProcessing={false}
        onBack={vi.fn()}
        onClose={vi.fn()}
        onNext={vi.fn()}
      />
    );

    expect(screen.queryByTestId('quick-match-scorers-both-pairs')).not.toBeInTheDocument();
    expect(screen.getByTestId('quick-match-scorers-my-pair')).toBeInTheDocument();
  });

  it('elige que apunte solo mi pareja', () => {
    const onChooseScoringSides = vi.fn();
    render(
      <ScorersStep
        t={(key) => key}
        registeredParticipants={foursomesRoster.filter((p) => !p.isGuest)}
        currentUser={{ id: 'user-1' }}
        scorerIds={['p-1', 'p-2', 'p-3']}
        onToggleScorer={vi.fn()}
        isFoursomes
        rivalCanScore
        onChooseScoringSides={onChooseScoringSides}
        isProcessing={false}
        onBack={vi.fn()}
        onClose={vi.fn()}
        onNext={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('quick-match-scorers-my-pair'));

    expect(onChooseScoringSides).toHaveBeenCalledWith('MINE');
  });

  it('sigue preguntando jugador a jugador fuera de foursomes', () => {
    render(
      <ScorersStep
        t={(key) => key}
        registeredParticipants={foursomesRoster.filter((p) => !p.isGuest)}
        currentUser={{ id: 'user-1' }}
        scorerIds={['p-1']}
        onToggleScorer={vi.fn()}
        isProcessing={false}
        onBack={vi.fn()}
        onClose={vi.fn()}
        onNext={vi.fn()}
      />
    );

    expect(screen.queryByTestId('quick-match-scorers-both-pairs')).not.toBeInTheDocument();
    expect(screen.getByText('Rival Uno')).toBeInTheDocument();
  });

  // Auditoría del 20 oct 2026 (F3): al elegir un campo federado, una línea
  // discreta dice de dónde salen sus datos. Sin campo, o con uno manual, nada
  describe('fuente de los datos del campo', () => {
    const conProcedencia = (source) =>
      new GolfCourse({ id: 'course-1', name: 'St Andrews', tees: [], provenance: source ? { source } : null });

    it('F3: un campo de la RFEG la cita', async () => {
      mockGetGolfCourse.mockResolvedValue(conProcedencia('RFEG'));
      renderModal();

      expect(screen.queryByText('source.federatedData')).toBeNull();
      fireEvent.click(screen.getByTestId('select-course-stub'));

      expect(await screen.findByText('source.federatedData')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'source.rfegShort' })).toHaveAttribute('href', 'https://www.rfegolf.es');
    });

    it.each([['MANUAL'], [null]])('F3: con procedencia %s, sin cita', async (source) => {
      mockGetGolfCourse.mockResolvedValue(conProcedencia(source));
      renderModal();

      fireEvent.click(screen.getByTestId('select-course-stub'));
      await waitFor(() => expect(mockGetGolfCourse).toHaveBeenCalled());
      await act(async () => { await Promise.resolve(); });

      expect(screen.queryByText('source.federatedData')).toBeNull();
    });

    it('F3: al cambiar a un campo cuya ficha no llega, la cita del anterior no se queda', async () => {
      mockGetGolfCourse.mockImplementation((id) =>
        id === 'course-1' ? Promise.resolve(conProcedencia('RFEG')) : Promise.reject(new Error('sin red'))
      );
      renderModal();

      fireEvent.click(screen.getByTestId('select-course-stub'));
      await screen.findByText('source.federatedData');
      fireEvent.click(screen.getByTestId('select-course-stub-2'));

      await waitFor(() => expect(mockGetGolfCourse).toHaveBeenCalledWith('course-2'));
      await act(async () => { await Promise.resolve(); });
      expect(screen.queryByText('source.federatedData')).toBeNull();
    });

    it('F3: al cambiar a un campo manual, la cita se va', async () => {
      mockGetGolfCourse.mockImplementation((id) =>
        Promise.resolve(id === 'course-1' ? conProcedencia('RFEG') : conProcedencia('MANUAL'))
      );
      renderModal();

      fireEvent.click(screen.getByTestId('select-course-stub'));
      await screen.findByText('source.federatedData');
      fireEvent.click(screen.getByTestId('select-course-stub-2'));

      await waitFor(() => expect(screen.queryByText('source.federatedData')).toBeNull());
    });
  });
});
