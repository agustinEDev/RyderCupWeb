import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import CreateQuickMatchModal from './CreateQuickMatchModal';

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

const mockCreate = vi.fn();
const mockListFriends = vi.fn();
const mockAddFriend = vi.fn();
const mockAddGuest = vi.fn();
const mockRemoveParticipant = vi.fn();
const mockSetHandicap = vi.fn();
const mockStart = vi.fn();
const mockCancel = vi.fn();
const mockGetGolfCourse = vi.fn();

vi.mock('../../composition', () => ({
  createQuickMatchUseCase: { execute: (...args) => mockCreate(...args) },
  addFriendParticipantUseCase: { execute: (...args) => mockAddFriend(...args) },
  addGuestParticipantUseCase: { execute: (...args) => mockAddGuest(...args) },
  removeQuickMatchParticipantUseCase: { execute: (...args) => mockRemoveParticipant(...args) },
  setQuickMatchParticipantHandicapUseCase: { execute: (...args) => mockSetHandicap(...args) },
  startQuickMatchUseCase: { execute: (...args) => mockStart(...args) },
  cancelQuickMatchUseCase: { execute: (...args) => mockCancel(...args) },
  listFriendsUseCase: { execute: (...args) => mockListFriends(...args) },
  getGolfCourseUseCase: { execute: (...args) => mockGetGolfCourse(...args) },
}));

const currentUser = { id: 'user-1', country_code: 'ES' };

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

describe('CreateQuickMatchModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListFriends.mockResolvedValue({ friendships: [], totalCount: 0 });
    mockGetGolfCourse.mockResolvedValue({ tees: [] });
  });

  it('should create the quick match with the entered name when moving past step 1', async () => {
    mockCreate.mockResolvedValue({
      id: 'qm-1',
      isPending: true,
      participants: [{ participantId: 'user-1', userId: 'user-1', name: 'Me', isGuest: false }],
    });

    renderModal();

    fireEvent.change(screen.getByTestId('quick-match-name-input'), {
      target: { value: '  Viernes con Rafa  ' },
    });
    fireEvent.click(screen.getByTestId('select-course-stub'));
    await waitFor(() => {
      expect(screen.getByTestId('quick-match-course-next')).not.toBeDisabled();
    });
    fireEvent.click(screen.getByTestId('quick-match-course-next'));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith('course-1', 'SINGLES', null, 'Viernes con Rafa', {
        allowancePercentage: 100,
        creatorTeeColor: null,
        creatorTeeGender: null,
      });
    });
  });

  it('should send null when no name is entered', async () => {
    mockCreate.mockResolvedValue({
      id: 'qm-1',
      isPending: true,
      participants: [{ participantId: 'user-1', userId: 'user-1', name: 'Me', isGuest: false }],
    });

    renderModal();

    fireEvent.click(screen.getByTestId('select-course-stub'));
    await waitFor(() => {
      expect(screen.getByTestId('quick-match-course-next')).not.toBeDisabled();
    });
    fireEvent.click(screen.getByTestId('quick-match-course-next'));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith('course-1', 'SINGLES', null, null, {
        allowancePercentage: 100,
        creatorTeeColor: null,
        creatorTeeGender: null,
      });
    });
  });

  it('should create a free-play quick match with the selected scoring format', async () => {
    mockCreate.mockResolvedValue({
      id: 'qm-1',
      isPending: true,
      participants: [{ participantId: 'user-1', userId: 'user-1', name: 'Me', isGuest: false }],
    });

    renderModal();

    fireEvent.click(screen.getByTestId('mode-option-FREE_PLAY'));
    fireEvent.click(screen.getByTestId('scoring-format-option-MEDAL'));
    fireEvent.click(screen.getByTestId('select-course-stub'));
    await waitFor(() => {
      expect(screen.getByTestId('quick-match-course-next')).not.toBeDisabled();
    });
    fireEvent.click(screen.getByTestId('quick-match-course-next'));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith('course-1', null, 'MEDAL', null, {
        allowancePercentage: 95,
        creatorTeeColor: null,
        creatorTeeGender: null,
      });
    });
  });

  it('should allow moving past the participants step with only the creator in free play', async () => {
    mockCreate.mockResolvedValue({
      id: 'qm-1',
      isPending: true,
      participants: [{ participantId: 'user-1', userId: 'user-1', name: 'Me', isGuest: false }],
    });

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
    mockCreate.mockResolvedValue({
      id: 'qm-1',
      isPending: true,
      participants: [{ participantId: 'user-1', userId: 'user-1', name: 'Me', isGuest: false }],
    });

    renderModal();

    fireEvent.click(screen.getByTestId('format-option-FOURBALL'));
    expect(screen.getByTestId('quick-match-allowance-option-90')).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByTestId('quick-match-allowance-option-50'));
    fireEvent.click(screen.getByTestId('select-course-stub'));
    await waitFor(() => {
      expect(screen.getByTestId('quick-match-course-next')).not.toBeDisabled();
    });
    fireEvent.click(screen.getByTestId('quick-match-course-next'));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith('course-1', 'FOURBALL', null, null, {
        allowancePercentage: 50,
        creatorTeeColor: null,
        creatorTeeGender: null,
      });
    });
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
    mockCreate.mockResolvedValue({
      id: 'qm-1',
      isPending: true,
      participants: [{ participantId: 'user-1', userId: 'user-1', name: 'Me', isGuest: false }],
    });

    renderModal();

    fireEvent.click(screen.getByTestId('select-course-stub'));

    await waitFor(() => {
      expect(screen.getByTestId('quick-match-creator-tee-option-YELLOW|MALE')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('quick-match-creator-tee-option-YELLOW|MALE'));
    fireEvent.click(screen.getByTestId('quick-match-course-next'));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith('course-1', 'SINGLES', null, null, {
        allowancePercentage: 100,
        creatorTeeColor: 'YELLOW',
        creatorTeeGender: 'MALE',
      });
    });
  });

  it('should let a guest tee be selected and sent when adding them', async () => {
    mockGetGolfCourse.mockResolvedValue({
      tees: [
        { color: 'RED', gender: 'FEMALE', identifier: 'Red', courseRating: 68, slopeRating: 118 },
      ],
    });
    mockCreate.mockResolvedValue({
      id: 'qm-1',
      isPending: true,
      participants: [{ participantId: 'user-1', userId: 'user-1', name: 'Me', isGuest: false }],
    });
    mockAddGuest.mockResolvedValue({
      id: 'qm-1',
      isPending: true,
      participants: [
        { participantId: 'user-1', userId: 'user-1', name: 'Me', isGuest: false },
        { participantId: 'guest-1', userId: null, name: 'Jane Doe', isGuest: true },
      ],
    });

    renderModal();

    fireEvent.click(screen.getByTestId('select-course-stub'));
    await waitFor(() => {
      expect(screen.getByTestId('quick-match-creator-tee-option-RED|FEMALE')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('quick-match-creator-tee-option-RED|FEMALE'));
    fireEvent.click(screen.getByTestId('quick-match-course-next'));

    await waitFor(() => {
      expect(screen.getByText('create.participants.tabGuest')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('create.participants.tabGuest'));

    fireEvent.click(screen.getByTestId('quick-match-guest-tee-option-RED|FEMALE'));
    fireEvent.change(screen.getByPlaceholderText('create.participants.guestFirstName'), {
      target: { value: 'Jane' },
    });
    fireEvent.change(screen.getByPlaceholderText('create.participants.guestLastName'), {
      target: { value: 'Doe' },
    });
    fireEvent.click(screen.getByText('create.participants.addGuest'));

    await waitFor(() => {
      expect(mockAddGuest).toHaveBeenCalledWith('qm-1', {
        firstName: 'Jane',
        lastName: 'Doe',
        handicap: null,
        team: null,
        color: 'RED',
        teeGender: 'FEMALE',
      });
    });
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
    mockCreate.mockResolvedValue({
      id: 'qm-1',
      isPending: true,
      participants: [{ participantId: 'user-1', userId: 'user-1', name: 'Me', isGuest: false }],
    });

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
      expect(screen.getByTestId('quick-match-creator-tee-option-RED|FEMALE')).toBeInTheDocument();
    });

    // Only course-2's tee ("Red") must be present — the stale course-1 response ("White") must not overwrite it
    // La etiqueta lleva el sufijo de género, que es lo que distingue dos
    // salidas del mismo color
    expect(screen.queryByText('Red (F)')).toBeInTheDocument();
    expect(screen.queryByText(/White/)).not.toBeInTheDocument();
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
      expect(screen.getByTestId('quick-match-creator-tee-option-YELLOW|MALE')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('quick-match-creator-tee-option-YELLOW|MALE'));

    fireEvent.click(screen.getByTestId('select-course-stub-2'));
    await waitFor(() => {
      expect(screen.getByTestId('quick-match-creator-tee-option-RED|FEMALE')).toBeInTheDocument();
    });

    // The tee picked for course-1 must not silently carry over to course-2
    expect(screen.getByTestId('quick-match-creator-tee-option-RED|FEMALE')).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(screen.getByTestId('quick-match-course-next'));
    expect(screen.getByTestId('quick-match-modal-error')).toHaveTextContent('create.course.errorTeeRequired');
    expect(mockCreate).not.toHaveBeenCalled();
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
    mockCreate.mockResolvedValue({
      id: 'qm-1',
      isPending: true,
      participants: [{ participantId: 'user-1', userId: 'user-1', name: 'Me', isGuest: false }],
    });
    mockAddFriend.mockResolvedValue({
      id: 'qm-1',
      isPending: true,
      participants: [
        { participantId: 'user-1', userId: 'user-1', name: 'Me', isGuest: false },
        { participantId: 'user-2', userId: 'user-2', name: 'Alice', isGuest: false },
      ],
    });

    renderModal();

    // Free play (capacity 4) so the roster isn't already full after adding just Alice
    fireEvent.click(screen.getByTestId('mode-option-FREE_PLAY'));
    fireEvent.click(screen.getByTestId('select-course-stub'));
    await waitFor(() => {
      expect(screen.getByTestId('quick-match-creator-tee-option-YELLOW|MALE')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('quick-match-creator-tee-option-YELLOW|MALE'));
    fireEvent.click(screen.getByTestId('quick-match-course-next'));

    await waitFor(() => {
      expect(screen.getByTestId('quick-match-friend-tee-select-f-1-YELLOW|MALE')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('quick-match-friend-tee-select-f-1-YELLOW|MALE'));
    fireEvent.click(screen.getByTestId('quick-match-friend-tee-select-f-2-RED|FEMALE'));

    fireEvent.click(screen.getByTestId('quick-match-add-friend-f-1'));

    await waitFor(() => {
      expect(mockAddFriend).toHaveBeenCalledWith('qm-1', 'user-2', null, {
        color: 'YELLOW',
        teeGender: 'MALE',
      });
    });

    // Bob's row keeps its own independent tee selection, unaffected by Alice's add
    expect(screen.getByTestId('quick-match-friend-tee-select-f-2-RED|FEMALE')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('should not pre-select any tee option', async () => {
    mockGetGolfCourse.mockResolvedValue({
      tees: [{ color: 'YELLOW', gender: 'MALE', identifier: 'White', courseRating: 71, slopeRating: 128 }],
    });

    renderModal();

    fireEvent.click(screen.getByTestId('select-course-stub'));

    await waitFor(() => {
      expect(screen.getByTestId('quick-match-creator-tee-option-YELLOW|MALE')).toBeInTheDocument();
    });
    expect(screen.getByTestId('quick-match-creator-tee-option-YELLOW|MALE')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByTestId('quick-match-creator-tee-option-none')).not.toBeInTheDocument();
    expect(screen.queryByText('create.course.noTeeOption')).not.toBeInTheDocument();
  });

  it('should require a tee selection before continuing when the course has tees', async () => {
    mockGetGolfCourse.mockResolvedValue({
      tees: [{ color: 'YELLOW', gender: 'MALE', identifier: 'White', courseRating: 71, slopeRating: 128 }],
    });

    renderModal();

    fireEvent.click(screen.getByTestId('select-course-stub'));
    await waitFor(() => {
      expect(screen.getByTestId('quick-match-creator-tee-option-YELLOW|MALE')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('quick-match-course-next'));

    expect(screen.getByTestId('quick-match-modal-error')).toHaveTextContent('create.course.errorTeeRequired');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('should require a tee selection before adding a friend when the course has tees', async () => {
    mockGetGolfCourse.mockResolvedValue({
      tees: [{ color: 'YELLOW', gender: 'MALE', identifier: 'White', courseRating: 71, slopeRating: 128 }],
    });
    mockListFriends.mockResolvedValue({
      friendships: [{ id: 'f-1', otherUserId: 'user-2', otherUserName: 'Alice' }],
      totalCount: 1,
    });
    mockCreate.mockResolvedValue({
      id: 'qm-1',
      isPending: true,
      participants: [{ participantId: 'user-1', userId: 'user-1', name: 'Me', isGuest: false }],
    });

    renderModal();

    fireEvent.click(screen.getByTestId('select-course-stub'));
    await waitFor(() => {
      expect(screen.getByTestId('quick-match-creator-tee-option-YELLOW|MALE')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('quick-match-creator-tee-option-YELLOW|MALE'));
    fireEvent.click(screen.getByTestId('quick-match-course-next'));

    await waitFor(() => {
      expect(screen.getByTestId('quick-match-add-friend-f-1')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('quick-match-add-friend-f-1'));

    expect(screen.getByTestId('quick-match-modal-error')).toHaveTextContent('create.participants.errorTeeRequired');
    expect(mockAddFriend).not.toHaveBeenCalled();
  });

  it('should require a tee selection before adding a guest when the course has tees', async () => {
    mockGetGolfCourse.mockResolvedValue({
      tees: [{ color: 'YELLOW', gender: 'MALE', identifier: 'White', courseRating: 71, slopeRating: 128 }],
    });
    mockCreate.mockResolvedValue({
      id: 'qm-1',
      isPending: true,
      participants: [{ participantId: 'user-1', userId: 'user-1', name: 'Me', isGuest: false }],
    });

    renderModal();

    fireEvent.click(screen.getByTestId('select-course-stub'));
    await waitFor(() => {
      expect(screen.getByTestId('quick-match-creator-tee-option-YELLOW|MALE')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('quick-match-creator-tee-option-YELLOW|MALE'));
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
    expect(mockAddGuest).not.toHaveBeenCalled();
  });

  it('should cancel the pending match and return to step 1 when going back from participants', async () => {
    mockCreate.mockResolvedValue({
      id: 'qm-1',
      isPending: true,
      participants: [{ participantId: 'user-1', userId: 'user-1', name: 'Me', isGuest: false }],
    });

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

    await waitFor(() => {
      expect(mockCancel).toHaveBeenCalledWith('qm-1');
      expect(screen.getByTestId('quick-match-course-next')).toBeInTheDocument();
    });
  });

  it('should return to the participants step without cancelling when going back from scorers', async () => {
    mockCreate.mockResolvedValue({
      id: 'qm-1',
      isPending: true,
      participants: [{ participantId: 'user-1', userId: 'user-1', name: 'Me', isGuest: false }],
    });

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

    expect(mockCancel).not.toHaveBeenCalled();
    expect(screen.getByTestId('quick-match-participants-next')).toBeInTheDocument();
  });

  it('should move to the summary step after choosing scorers', async () => {
    mockCreate.mockResolvedValue({
      id: 'qm-1',
      isPending: true,
      participants: [{ participantId: 'user-1', userId: 'user-1', name: 'Me', handicap: null, isGuest: false }],
    });

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
    expect(mockStart).not.toHaveBeenCalled();
  });

  it('should set a participant handicap via the keypad panel in the summary step', async () => {
    mockCreate.mockResolvedValue({
      id: 'qm-1',
      isPending: true,
      participants: [{ participantId: 'user-1', userId: 'user-1', name: 'Me', handicap: null, isGuest: false }],
    });
    mockSetHandicap.mockResolvedValue({
      id: 'qm-1',
      isPending: true,
      participants: [{ participantId: 'user-1', userId: 'user-1', name: 'Me', handicap: 16.4, isGuest: false }],
    });

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
    fireEvent.click(within(panel).getByText('1'));
    fireEvent.click(within(panel).getByText('6'));
    fireEvent.click(within(panel).getByText('.'));
    fireEvent.click(within(panel).getByText('4'));
    fireEvent.click(within(panel).getByTestId('handicap-panel-confirm'));

    await waitFor(() => {
      expect(mockSetHandicap).toHaveBeenCalledWith('qm-1', 'user-1', 16.4);
    });
  });

  it('should not call setHandicap when confirming without changing the value', async () => {
    mockCreate.mockResolvedValue({
      id: 'qm-1',
      isPending: true,
      participants: [{ participantId: 'user-1', userId: 'user-1', name: 'Me', handicap: 10, isGuest: false }],
    });

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

    expect(mockSetHandicap).not.toHaveBeenCalled();
  });

  it('should start the match when confirming from the summary step', async () => {
    const onStarted = vi.fn();
    mockCreate.mockResolvedValue({
      id: 'qm-1',
      isPending: true,
      participants: [{ participantId: 'user-1', userId: 'user-1', name: 'Me', handicap: 10, isGuest: false }],
    });
    mockStart.mockResolvedValue({ id: 'qm-1' });

    renderModal({ onStarted });

    fireEvent.click(screen.getByTestId('mode-option-FREE_PLAY'));
    fireEvent.click(screen.getByTestId('select-course-stub'));
    await waitFor(() => expect(screen.getByTestId('quick-match-course-next')).not.toBeDisabled());
    fireEvent.click(screen.getByTestId('quick-match-course-next'));
    await waitFor(() => expect(screen.getByTestId('quick-match-participants-next')).not.toBeDisabled());
    fireEvent.click(screen.getByTestId('quick-match-participants-next'));
    await waitFor(() => expect(screen.getByTestId('quick-match-scorers-next')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('quick-match-scorers-next'));

    await screen.findByTestId('quick-match-start');
    fireEvent.click(screen.getByTestId('quick-match-start'));

    await waitFor(() => {
      expect(mockStart).toHaveBeenCalledWith('qm-1', ['user-1']);
      expect(onStarted).toHaveBeenCalledWith('qm-1');
    });
  });

  it('should return to the scorers step when going back from the summary', async () => {
    mockCreate.mockResolvedValue({
      id: 'qm-1',
      isPending: true,
      participants: [{ participantId: 'user-1', userId: 'user-1', name: 'Me', handicap: 10, isGuest: false }],
    });

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
    expect(mockCancel).not.toHaveBeenCalled();
  });
});
