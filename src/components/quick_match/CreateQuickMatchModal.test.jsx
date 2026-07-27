import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
    <button
      type="button"
      data-testid="select-course-stub"
      onClick={() => onCourseSelect({ id: 'course-1', name: 'St Andrews' })}
    >
      Select course
    </button>
  ),
}));

const mockCreate = vi.fn();
const mockListFriends = vi.fn();
const mockAddFriend = vi.fn();
const mockAddGuest = vi.fn();
const mockRemoveParticipant = vi.fn();
const mockStart = vi.fn();
const mockCancel = vi.fn();

vi.mock('../../composition', () => ({
  createQuickMatchUseCase: { execute: (...args) => mockCreate(...args) },
  addFriendParticipantUseCase: { execute: (...args) => mockAddFriend(...args) },
  addGuestParticipantUseCase: { execute: (...args) => mockAddGuest(...args) },
  removeQuickMatchParticipantUseCase: { execute: (...args) => mockRemoveParticipant(...args) },
  startQuickMatchUseCase: { execute: (...args) => mockStart(...args) },
  cancelQuickMatchUseCase: { execute: (...args) => mockCancel(...args) },
  listFriendsUseCase: { execute: (...args) => mockListFriends(...args) },
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
    fireEvent.click(screen.getByTestId('quick-match-course-next'));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith('course-1', 'SINGLES', null, 'Viernes con Rafa');
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
    fireEvent.click(screen.getByTestId('quick-match-course-next'));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith('course-1', 'SINGLES', null, null);
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
    fireEvent.click(screen.getByTestId('quick-match-course-next'));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith('course-1', null, 'MEDAL', null);
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
    fireEvent.click(screen.getByTestId('quick-match-course-next'));

    await waitFor(() => {
      expect(screen.getByTestId('quick-match-participants-next')).not.toBeDisabled();
    });
  });
});
