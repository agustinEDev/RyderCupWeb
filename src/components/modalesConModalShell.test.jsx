import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

/**
 * Los modales que pasaron a `ModalShell` el 4 oct 2026, de uno en uno.
 *
 * El armazón ya trae sus tests; lo que se prueba aquí es cómo se ENCHUFA cada
 * modal, que es distinto en cada uno: quién lo cierra (`onClose`, `onCancel`,
 * `handleDismiss`…), qué título lo nombra y qué estado lo marca ocupado. Para
 * cada uno: se anuncia con su título, Escape lo cierra, y mientras guarda no.
 * Pulsar fuera no cierra ninguno, igual que antes de pasar al armazón.
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (clave) => clave, i18n: { language: 'es' } }),
}));
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, initial, animate, exit, transition, ...resto }) => {
      void initial; void animate; void exit; void transition;
      return <div {...resto}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }) => children,
}));
vi.mock('../composition', () => ({
  getMatchDetailUseCase: { execute: vi.fn(() => new Promise(() => {})) },
  fetchCountriesUseCase: { execute: vi.fn().mockResolvedValue([]) },
  searchUsersUseCase: { execute: vi.fn().mockResolvedValue([]) },
  listFriendsUseCase: { execute: vi.fn().mockResolvedValue([]) },
  getFriendsUseCase: { execute: vi.fn().mockResolvedValue([]) },
  // Peticiones que no acaban nunca: el modal se queda ocupado
  updateRfegHandicapUseCase: { execute: vi.fn(() => new Promise(() => {})) },
  updateManualHandicapUseCase: { execute: vi.fn(() => new Promise(() => {})) },
}));
vi.mock('../utils/toast', () => ({ default: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const t = (clave) => clave;
const { default: WalkoverModal } = await import('./schedule/WalkoverModal');
const { default: ReassignPlayersModal } = await import('./schedule/ReassignPlayersModal');
const { default: AssignTeamsModal } = await import('./schedule/AssignTeamsModal');
const { default: GenerateMatchesModal } = await import('./schedule/GenerateMatchesModal');
const { default: MatchDetailModal } = await import('./schedule/MatchDetailModal');
const { default: EnrollmentRequestModal } = await import('./enrollment/EnrollmentRequestModal');
const { default: GeneroParaApuntarseModal } = await import('./profile/GeneroParaApuntarseModal');
const { default: SendInvitationModal } = await import('./invitation/SendInvitationModal');
const { default: HandicapRequestModal } = await import('./profile/HandicapRequestModal');
const { default: GolfCourseRequestModal } = await import('./golf_course/GolfCourseRequestModal');
const { default: AdminEditCompetitionModal } = await import('./admin/AdminEditCompetitionModal');
const { default: EditUserModal } = await import('./admin/EditUserModal');
const { default: ManageAccountModal } = await import('./admin/ManageAccountModal');
const { default: SessionBlockedModal } = await import('./scoring/SessionBlockedModal');

const nombres = { teamA: 'Norte', teamB: 'Sur' };
const inscritos = [
  { userId: 'p1', userName: 'Ana', userHandicap: 10, status: 'APPROVED' },
  { userId: 'p2', userName: 'Bea', userHandicap: 12, status: 'APPROVED' },
];
const usuario = { id: 'u-1', first_name: 'Ana', last_name: 'Pi', email: 'ana@club.es', is_active: true, country_code: 'ES' };
// Los modales de admin reciben el usuario ya mapeado, en camelCase
const usuarioAdmin = { id: 'u-1', firstName: 'Ana', lastName: 'Pi', email: 'ana@club.es', handicap: 12, isAdmin: false, isActive: true };
const competicionAdmin = { id: 'c-1', name: 'Ryder del club', startDate: '2030-06-01', endDate: '2030-06-02' };

// [nombre, cómo se monta (con su cierre), cómo se monta ocupado o null]
const MODALES = [
  ['WalkoverModal',
    (cerrar, ocupado = false) => <WalkoverModal isOpen onClose={cerrar} onConfirm={vi.fn()} matchNumber={1} isProcessing={ocupado} teamNames={nombres} t={t} />, true],
  ['ReassignPlayersModal',
    (cerrar, ocupado = false) => <ReassignPlayersModal isOpen onClose={cerrar} onConfirm={vi.fn()} match={{ teamAPlayers: [], teamBPlayers: [] }} enrollments={inscritos} isProcessing={ocupado} teamNames={nombres} t={t} />, true],
  ['AssignTeamsModal',
    (cerrar, ocupado = false) => <AssignTeamsModal isOpen onClose={cerrar} onConfirm={vi.fn()} enrollments={inscritos} isProcessing={ocupado} teamNames={nombres} t={t} />, true],
  ['GenerateMatchesModal',
    (cerrar, ocupado = false) => <GenerateMatchesModal isOpen onClose={cerrar} onConfirm={vi.fn()} round={{ id: 'r-1', matchFormat: 'SINGLES' }} enrollments={inscritos} teamAssignment={{ teamAPlayerIds: ['p1'], teamBPlayerIds: ['p2'] }} isProcessing={ocupado} teamNames={nombres} playerNameMap={new Map()} t={t} />, true],
  ['MatchDetailModal',
    (cerrar) => <MatchDetailModal isOpen onClose={cerrar} matchId="m-1" playerNameMap={new Map()} playerHandicapMap={new Map()} teamNames={nombres} t={t} />, false],
  ['EnrollmentRequestModal',
    (cerrar, ocupado = false) => <EnrollmentRequestModal isOpen onClose={cerrar} onConfirm={vi.fn()} isProcessing={ocupado} />, true],
  ['GeneroParaApuntarseModal',
    (cerrar, ocupado = false) => <GeneroParaApuntarseModal isOpen onClose={cerrar} onConfirm={vi.fn()} isProcessing={ocupado} />, true],
  ['SendInvitationModal',
    (cerrar, ocupado = false) => <SendInvitationModal isOpen onClose={cerrar} onSend={vi.fn()} onSendByUserId={vi.fn()} isProcessing={ocupado} t={t} />, true],
  ['HandicapRequestModal',
    (cerrar) => <HandicapRequestModal isOpen user={usuario} onClose={cerrar} onSaved={vi.fn()} />, false],
  ['GolfCourseRequestModal',
    (cerrar) => <GolfCourseRequestModal isOpen onClose={cerrar} onSuccess={vi.fn()} countryCode="ES" createGolfCourseRequestUseCase={{ execute: vi.fn() }} />, false],
  ['AdminEditCompetitionModal',
    (cerrar) => <AdminEditCompetitionModal competition={competicionAdmin} onSubmit={vi.fn()} onCancel={cerrar} />, false],
  ['EditUserModal',
    (cerrar) => <EditUserModal user={usuarioAdmin} onSubmit={vi.fn()} onCancel={cerrar} />, false],
  ['ManageAccountModal',
    (cerrar) => <ManageAccountModal user={usuarioAdmin} onToggleActive={vi.fn()} onDelete={vi.fn()} onCancel={cerrar} />, false],
];

const montar = (elemento) => render(<MemoryRouter>{elemento}</MemoryRouter>);
const escape = () => fireEvent.keyDown(document, { key: 'Escape' });

describe('Modales sobre ModalShell', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it.each(MODALES)('%s se anuncia como diálogo, con su título de nombre', (_, pintar) => {
    montar(pintar(vi.fn()));

    const dialogo = screen.getByRole('dialog');
    const titulo = dialogo.querySelector('h2').textContent.trim();
    expect(titulo).not.toBe('');
    expect(dialogo).toHaveAccessibleName(titulo);
    expect(dialogo).toHaveAttribute('aria-modal', 'true');
  });

  it.each(MODALES)('%s se cierra con Escape', (_, pintar) => {
    const cerrar = vi.fn();
    montar(pintar(cerrar));

    escape();

    expect(cerrar).toHaveBeenCalled();
  });

  it.each(MODALES)('%s no se cierra al pulsar fuera, como antes', (_, pintar) => {
    const cerrar = vi.fn();
    montar(pintar(cerrar));

    const fondo = screen.getByRole('dialog');
    fireEvent.mouseDown(fondo);
    fireEvent.click(fondo);

    expect(cerrar).not.toHaveBeenCalled();
  });

  it.each(MODALES.filter(([, , conOcupado]) => conOcupado))(
    '%s no se cierra con Escape mientras guarda',
    (_, pintar) => {
      const cerrar = vi.fn();
      montar(pintar(cerrar, true));

      escape();

      expect(cerrar).not.toHaveBeenCalled();
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-busy', 'true');
    }
  );

  it('SessionBlockedModal se anuncia, y Escape no lo cierra: hay que elegir', () => {
    const volver = vi.fn();
    const tomar = vi.fn();
    montar(<SessionBlockedModal isOpen onGoBack={volver} onTakeOver={tomar} />);

    expect(screen.getByRole('dialog')).toHaveAccessibleName('session.blocked');
    escape();
    expect(volver).not.toHaveBeenCalled();
    expect(tomar).not.toHaveBeenCalled();
  });

  // Estos cuatro llevan el «ocupado» por dentro: se provoca dejando su
  // petición en vuelo, y entonces Escape no cierra
  const enVuelo = () => new Promise(() => {});
  it.each([
    ['HandicapRequestModal', (cerrar) => <HandicapRequestModal isOpen user={usuario} onClose={cerrar} onSaved={vi.fn()} />,
      () => fireEvent.click(screen.getByRole('button', { name: 'handicapModal.fetchRfeg' }))],
    ['AdminEditCompetitionModal', (cerrar) => <AdminEditCompetitionModal competition={competicionAdmin} onSubmit={enVuelo} onCancel={cerrar} />,
      () => fireEvent.click(screen.getByRole('button', { name: 'competitions.editModal.save' }))],
    ['EditUserModal', (cerrar) => <EditUserModal user={usuarioAdmin} onSubmit={enVuelo} onCancel={cerrar} />,
      () => fireEvent.click(screen.getByRole('button', { name: 'editModal.save' }))],
    ['ManageAccountModal', (cerrar) => <ManageAccountModal user={usuarioAdmin} onToggleActive={enVuelo} onDelete={vi.fn()} onCancel={cerrar} />,
      () => fireEvent.click(screen.getByRole('button', { name: 'manageModal.confirmDeactivate' }))],
  ])('%s no se cierra con Escape mientras guarda', async (_, pintar, ocupar) => {
    const cerrar = vi.fn();
    montar(pintar(cerrar));

    ocupar();
    await waitFor(() => expect(screen.getByRole('dialog')).toHaveAttribute('aria-busy', 'true'));
    escape();

    expect(cerrar).not.toHaveBeenCalled();
  });
});

