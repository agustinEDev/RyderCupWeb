import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import CreateQuickMatchModal from './CreateQuickMatchModal';

/**
 * Las barras y la cita de la RFEG al cambiar de campo (lote T3):
 *
 *   #      caso                                                 | qué pasa
 *   -------|------------------------------------------------------|---------------------------
 *   T3-12  campo A con barras y federado; se quita el campo      | sin barras ni cita
 *   T3-12b de A a B, con las de B en camino                      | se ven las de A, sin cita
 *          |                                                      | ni barra elegida; luego las de B
 *   T3-12c de A a B y la de A llega después                      | se quedan las de B
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key, i18n: { language: 'es' } }),
}));

vi.mock('../golf_course/GolfCourseSearchBox', () => ({
  default: ({ onCourseSelect }) => (
    <>
      <button type="button" onClick={() => onCourseSelect({ id: 'gc-a', name: 'Campo A' })}>elegir A</button>
      <button type="button" onClick={() => onCourseSelect({ id: 'gc-b', name: 'Campo B' })}>elegir B</button>
      <button type="button" onClick={() => onCourseSelect(null)}>quitar campo</button>
    </>
  ),
}));

const mockGetGolfCourse = vi.fn();
vi.mock('../../utils/toast', () => ({ default: { info: vi.fn(), error: vi.fn(), success: vi.fn() } }));
vi.mock('../../composition', () => ({
  createAndStartQuickMatchUseCase: { execute: vi.fn() },
  listFriendsUseCase: { execute: vi.fn().mockResolvedValue({ friendships: [], totalCount: 0 }) },
  getGolfCourseUseCase: { execute: (...a) => mockGetGolfCourse(...a) },
  listMyQuickMatchesUseCase: { execute: vi.fn().mockResolvedValue({ quickMatches: [] }) },
}));

const tee = (color, gender) => ({ color, gender });
const DE_A = { tees: [tee('YELLOW', 'MALE'), tee('RED', 'FEMALE')], isFromRfeg: () => true };
const DE_B = { tees: [tee('BLUE', 'MALE'), tee('ORANGE', 'FEMALE')], isFromRfeg: () => false };

const abre = () =>
  render(
    <MemoryRouter>
      <CreateQuickMatchModal
        onClose={vi.fn()}
        onStarted={vi.fn()}
        currentUser={{ id: 'yo', display_name: 'Yo', handicap: 12, gender: 'MALE' }}
      />
    </MemoryRouter>
  );

const barras = () =>
  screen.queryAllByTestId(/^quick-match-creator-tee-option-/).map((b) => b.dataset.testid.replace('quick-match-creator-tee-option-', ''));

const eligeA = async () => {
  fireEvent.click(screen.getByText('elegir A'));
  await waitFor(() => expect(barras()).toEqual(['YELLOW|MALE']));
  expect(screen.getByText('source.federatedData')).toBeInTheDocument();
  await waitFor(() => expect(screen.getByTestId('quick-match-creator-tee-option-YELLOW|MALE')).toHaveAttribute('aria-pressed', 'true'));
};

describe('CreateQuickMatchModal · barras al cambiar de campo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('T3-12: quitar el campo quita sus barras y la cita de la RFEG', async () => {
    mockGetGolfCourse.mockImplementation((id) => Promise.resolve(id === 'gc-a' ? DE_A : DE_B));
    abre();
    await eligeA();

    fireEvent.click(screen.getByText('quitar campo'));

    expect(barras()).toEqual([]);
    expect(screen.queryByText('source.federatedData')).toBeNull();
    expect(mockGetGolfCourse).toHaveBeenCalledTimes(1);
  });

  it('T3-12b: con las de B en camino se ven las de A, sin cita ni barra elegida; luego las de B', async () => {
    let responderB;
    mockGetGolfCourse.mockImplementation((id) =>
      id === 'gc-a' ? Promise.resolve(DE_A) : new Promise((r) => { responderB = r; })
    );
    abre();
    await eligeA();

    fireEvent.click(screen.getByText('elegir B'));
    await act(async () => {});

    expect(barras()).toEqual(['YELLOW|MALE']);
    expect(screen.getByTestId('quick-match-creator-tee-option-YELLOW|MALE')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByText('source.federatedData')).toBeNull();

    await act(async () => {
      responderB(DE_B);
    });
    await waitFor(() => expect(barras()).toEqual(['BLUE|MALE']));
  });

  it('T3-12c: de A a B, si la de A llega después se quedan las de B', async () => {
    let responderA;
    mockGetGolfCourse.mockImplementation((id) =>
      id === 'gc-a' ? new Promise((r) => { responderA = r; }) : Promise.resolve(DE_B)
    );
    abre();
    fireEvent.click(screen.getByText('elegir A'));
    fireEvent.click(screen.getByText('elegir B'));
    await waitFor(() => expect(barras()).toEqual(['BLUE|MALE']));

    await act(async () => {
      responderA(DE_A);
    });

    expect(barras()).toEqual(['BLUE|MALE']);
    expect(screen.queryByText('source.federatedData')).toBeNull();
  });
});
