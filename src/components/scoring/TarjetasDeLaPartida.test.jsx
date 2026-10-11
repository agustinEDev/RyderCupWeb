import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

/**
 * Casos 12 y 15 de la PR 7 (FE #824): las tarjetas de la partida, hoyo a hoyo,
 * y lo que hace con ellas el organizador (corregir un hoyo, reabrir, no
 * presentado), con confirmación las dos últimas.
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (clave, params) => (params ? `${clave} ${JSON.stringify(params)}` : clave),
    i18n: { language: 'es' },
  }),
}));

const mockToast = { error: vi.fn(), success: vi.fn(), info: vi.fn() };
vi.mock('../../utils/toast', () => ({ default: mockToast }));

const mockCorregir = vi.fn();
const mockReabrir = vi.fn();
const mockNoPresentado = vi.fn();
const mockValidar = vi.fn();
vi.mock('../../composition', () => ({
  correctTeeGroupHoleUseCase: { execute: (...a) => mockCorregir(...a) },
  reopenTeeGroupCardUseCase: { execute: (...a) => mockReabrir(...a) },
  markTeeGroupNoShowUseCase: { execute: (...a) => mockNoPresentado(...a) },
  validateTeeGroupScoredHolesUseCase: { execute: (...a) => mockValidar(...a) },
}));

const TarjetasDeLaPartida = (await import('./TarjetasDeLaPartida')).default;
const { default: TeeGroupScoringMapper } = await import('../../infrastructure/mappers/TeeGroupScoringMapper');

const hoyo = (hole, extra = {}) => ({
  hole, par: hole % 2 ? 4 : 3, strokes_received: 0, own_score: null, own_submitted: false,
  marker_score: null, marker_submitted: false, status: 'PENDING', ...extra,
});
const totales = (extra = {}) => ({ thru: 2, points: 5, gross_points: 4, gross: 9, net: 8, to_par_net: 1, to_par_gross: 2, complete: false, ...extra });
const jugador = (userId, cardStatus, holes, extra = {}) => ({
  user_id: userId, name: userId.toUpperCase(), playing_handicap: 10, tee_color: 'YELLOW', card_status: cardStatus,
  marks_user_id: null, marked_by_user_id: null, holes, totals: totales(), ...extra,
});
const hoyosDeAna = [
  hoyo(1, { own_score: 5, own_submitted: true, marker_score: 5, marker_submitted: true, status: 'MATCH' }),
  hoyo(2, { own_score: 4, own_submitted: true, marker_score: 5, marker_submitted: true, status: 'MISMATCH' }),
  hoyo(3, { own_score: null, own_submitted: true, marker_score: null, marker_submitted: true, status: 'MATCH' }),
  ...Array.from({ length: 15 }, (_, i) => hoyo(i + 4)),
];
const vista = (tipo = 'STABLEFORD', players) =>
  TeeGroupScoringMapper.toScoringViewDTO({
    group_id: 'g-1', round_id: 'r-1', number: 1, tee_time: '08:00', status: 'IN_PROGRESS', scoring_opens_at: null,
    tournament_type: tipo, picked_up_allowed: tipo === 'STABLEFORD', i_mark_user_id: null,
    players: players ?? [
      jugador('ana', 'JUGANDO', hoyosDeAna),
      jugador('bea', 'ENTREGADA', Array.from({ length: 18 }, (_, i) => hoyo(i + 1)), { totals: totales({ points: 30, to_par_net: -3 }) }),
    ],
  });

const pintar = (props = {}) => render(<TarjetasDeLaPartida scoringView={vista()} userId="ana" organiza={false} onCambio={vi.fn()} {...props} />);

describe('TarjetasDeLaPartida (FE #824, PR 7)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCorregir.mockResolvedValue({});
    mockReabrir.mockResolvedValue({});
    mockNoPresentado.mockResolvedValue({});
    mockValidar.mockResolvedValue({});
  });

  // QA del 11 oct 2026 (casos 11, 13, 17, 24 y 4)
  describe('el marcador que se va', () => {
    // El 4, con su golpe y sin el del marcador: algo que validar de una vez
    const deAna = [...hoyosDeAna.slice(0, 3), hoyo(4, { own_score: 4, own_submitted: true }), ...hoyosDeAna.slice(4)];
    const conMarcador = (marcador, estadoDelMarcador = 'JUGANDO') => [
      jugador('ana', 'JUGANDO', deAna, { marked_by_user_id: marcador }),
      jugador('bea', estadoDelMarcador, Array.from({ length: 18 }, (_, i) => hoyo(i + 1)), { marks_user_id: 'ana' }),
    ];

    it('11: sin nadie que le marque, el organizador ve el aviso y «Validar lo anotado»', () => {
      pintar({ organiza: true, scoringView: vista('STABLEFORD', conMarcador(null)) });

      expect(within(screen.getByTestId('tarjeta-ana')).getByText('partida.noMarkerInPlay')).toBeInTheDocument();
      expect(within(screen.getByTestId('tarjeta-ana')).getByRole('button', { name: 'partida.validateScored {"jugador":"ANA"}' })).toBeInTheDocument();
    });

    it('11: también si su marcador ya entregó', () => {
      pintar({ organiza: true, scoringView: vista('STABLEFORD', conMarcador('bea', 'ENTREGADA')) });

      expect(within(screen.getByTestId('tarjeta-ana')).getByRole('button', { name: /partida.validateScored/ })).toBeInTheDocument();
    });

    it('11: sin ningún hoyo solo suyo, no hay nada que validar de una vez (revisor)', () => {
      const hoyos = Array.from({ length: 18 }, (_, i) => hoyo(i + 1));
      pintar({ organiza: true, scoringView: vista('STABLEFORD', [jugador('ana', 'JUGANDO', hoyos)]) });

      expect(screen.queryByRole('button', { name: /partida.validateScored/ })).toBeNull();
      expect(screen.getByText('partida.noMarkerInPlay')).toBeInTheDocument();
    });

    it('11: con un marcador que juega, nada', () => {
      pintar({ organiza: true, scoringView: vista('STABLEFORD', conMarcador('bea')) });

      const ana = within(screen.getByTestId('tarjeta-ana'));
      expect(ana.queryByRole('button', { name: /partida.validateScored/ })).toBeNull();
      expect(ana.queryByText('partida.noMarkerInPlay')).toBeNull();
    });

    it('11: quien no organiza no lo ve', () => {
      pintar({ scoringView: vista('STABLEFORD', conMarcador(null)) });

      expect(screen.queryByRole('button', { name: /partida.validateScored/ })).toBeNull();
    });

    it('11: con confirmación, y después cuántos hoyos se validaron', async () => {
      const onCambio = vi.fn();
      // Ana: el 1 y el 3 tienen los dos lados; ninguno solo con el suyo
      const hoyos = [hoyo(1, { own_score: 4, own_submitted: true }), hoyo(2, { own_score: 5, own_submitted: true }), ...hoyosDeAna.slice(2)];
      pintar({ organiza: true, onCambio, scoringView: vista('STABLEFORD', [jugador('ana', 'JUGANDO', hoyos)]) });

      fireEvent.click(screen.getByRole('button', { name: 'partida.validateScored {"jugador":"ANA"}' }));
      expect(mockValidar).not.toHaveBeenCalled();
      expect(screen.getByText('partida.validateScoredConfirm {"jugador":"ANA","count":2}')).toHaveClass('w-full');
      fireEvent.click(screen.getByRole('button', { name: 'partida.yes' }));

      await waitFor(() => expect(mockValidar).toHaveBeenCalledWith('g-1', 'ana'));
      expect(mockToast.success).toHaveBeenCalledWith('partida.scoredValidated {"count":2}');
      expect(onCambio).toHaveBeenCalled();
    });

    it('13: si al marcar un no presentado viene alguien a acompañar, se dice', async () => {
      mockNoPresentado.mockResolvedValue(
        vista('STABLEFORD', [
          jugador('ana', 'NO_PRESENTADO', hoyosDeAna),
          jugador('bea', 'JUGANDO', hoyosDeAna, { marks_user_id: 'cris', marked_by_user_id: 'cris' }),
          jugador('cris', 'JUGANDO', hoyosDeAna, { marks_user_id: 'bea', marked_by_user_id: 'bea', brought_in: true }),
        ])
      );
      pintar({ organiza: true, scoringView: vista('STABLEFORD', conMarcador('bea')) });

      fireEvent.click(within(screen.getByTestId('tarjeta-ana')).getByRole('button', { name: 'partida.noShow {"jugador":"ANA"}' }));
      fireEvent.click(screen.getByRole('button', { name: 'partida.yes' }));

      await waitFor(() => expect(mockToast.info).toHaveBeenCalledWith('partida.broughtInToast {"viene":"CRIS","jugador":"BEA"}'));
    });

    it('13: se nombra a quien acompaña (al que marca), no a cualquiera que siga jugando', async () => {
      mockNoPresentado.mockResolvedValue(
        vista('STABLEFORD', [
          jugador('ana', 'NO_PRESENTADO', hoyosDeAna),
          jugador('bea', 'ENTREGADA', hoyosDeAna),
          jugador('cris', 'JUGANDO', hoyosDeAna, { marks_user_id: 'dani', marked_by_user_id: 'dani' }),
          jugador('dani', 'JUGANDO', hoyosDeAna, { marks_user_id: 'cris', marked_by_user_id: 'cris', brought_in: true }),
        ])
      );
      pintar({ organiza: true, scoringView: vista('STABLEFORD', conMarcador('bea')) });

      fireEvent.click(within(screen.getByTestId('tarjeta-ana')).getByRole('button', { name: 'partida.noShow {"jugador":"ANA"}' }));
      fireEvent.click(screen.getByRole('button', { name: 'partida.yes' }));

      await waitFor(() => expect(mockToast.info).toHaveBeenCalledWith('partida.broughtInToast {"viene":"DANI","jugador":"CRIS"}'));
    });

    it('13: quien ya había venido antes no se anuncia otra vez', async () => {
      const yaEstaba = [
        jugador('ana', 'JUGANDO', hoyosDeAna, { marked_by_user_id: 'bea' }),
        jugador('bea', 'JUGANDO', hoyosDeAna, { marks_user_id: 'ana', brought_in: true }),
        jugador('cris', 'JUGANDO', hoyosDeAna),
      ];
      mockNoPresentado.mockResolvedValue(vista('STABLEFORD', yaEstaba.map((j) => (j.user_id === 'cris' ? { ...j, card_status: 'NO_PRESENTADO' } : j))));
      pintar({ organiza: true, scoringView: vista('STABLEFORD', yaEstaba) });

      fireEvent.click(within(screen.getByTestId('tarjeta-cris')).getByRole('button', { name: 'partida.noShow {"jugador":"CRIS"}' }));
      fireEvent.click(screen.getByRole('button', { name: 'partida.yes' }));

      await waitFor(() => expect(mockToast.success).toHaveBeenCalledWith('partida.markedNoShow'));
      expect(mockToast.info).not.toHaveBeenCalled();
    });

    it('13: sin nadie que venga, solo el aviso de siempre', async () => {
      mockNoPresentado.mockResolvedValue(vista('STABLEFORD', conMarcador('bea')));
      pintar({ organiza: true, scoringView: vista('STABLEFORD', conMarcador('bea')) });

      fireEvent.click(within(screen.getByTestId('tarjeta-ana')).getByRole('button', { name: 'partida.noShow {"jugador":"ANA"}' }));
      fireEvent.click(screen.getByRole('button', { name: 'partida.yes' }));

      await waitFor(() => expect(mockToast.success).toHaveBeenCalledWith('partida.markedNoShow'));
      expect(mockToast.info).not.toHaveBeenCalled();
    });

    it('24: la tarjeta de un no presentado no enseña golpes', () => {
      pintar({ scoringView: vista('STABLEFORD', [jugador('ana', 'NO_PRESENTADO', hoyosDeAna)]) });

      expect(screen.queryByTestId('hoyo-ana-1')).toBeNull();
      expect(screen.getByTestId('tarjeta-ana')).toHaveTextContent('partida.cardStatus.NO_PRESENTADO');
    });

    it('17: dejar un lado «sin golpe» no borra: se explica por qué no se guarda', () => {
      pintar({ organiza: true });
      fireEvent.click(screen.getByTestId('hoyo-ana-1'));

      fireEvent.change(screen.getByRole('combobox', { name: 'partida.ownSide' }), { target: { value: '' } });

      expect(screen.getByRole('button', { name: 'partida.save' })).toBeDisabled();
      expect(screen.getByText('partida.cannotClear')).toBeInTheDocument();
    });

    it('17: sin tocar nada, sin la explicación', () => {
      pintar({ organiza: true });
      fireEvent.click(screen.getByTestId('hoyo-ana-1'));

      expect(screen.queryByText('partida.cannotClear')).toBeNull();
    });

    it('4: el organizador corrige en filas de seis: cada hoyo se puede tocar (44 px a 360)', () => {
      pintar({ organiza: true });

      expect(screen.getByTestId('hoyo-ana-1').parentElement).toHaveClass('grid-cols-6');
      expect(screen.getAllByTestId(/^hoyo-ana-/)).toHaveLength(18);
    });

    it('4: quien solo mira, en las dos filas de nueve de siempre', () => {
      pintar();

      expect(screen.getByTestId('hoyo-ana-1').parentElement).toHaveClass('grid-cols-9');
    });
  });

  it('12: una tarjeta por jugador, con su estado y su total (Stableford: puntos)', () => {
    pintar();

    const ana = screen.getByTestId('tarjeta-ana');
    expect(ana).toHaveTextContent('ANA');
    expect(ana).toHaveTextContent('partida.cardStatus.JUGANDO');
    expect(ana).toHaveTextContent('partida.points {"count":5}');
    expect(ana).toHaveTextContent('partida.thru {"count":2}');
    expect(screen.getByTestId('tarjeta-bea')).toHaveTextContent('partida.cardStatus.ENTREGADA');
    expect(screen.getByTestId('tarjeta-bea')).toHaveTextContent('partida.points {"count":30}');
  });

  it('12b: Medal, el neto respecto al par', () => {
    pintar({ scoringView: vista('MEDAL') });

    expect(screen.getByTestId('tarjeta-ana')).toHaveTextContent('+1');
    expect(screen.getByTestId('tarjeta-bea')).toHaveTextContent('-3');
  });

  it('12c: hoyo a hoyo, validado, en desacuerdo (los dos golpes) y recogida', () => {
    pintar();

    const ana = within(screen.getByTestId('tarjeta-ana'));
    expect(ana.getByTestId('hoyo-ana-1')).toHaveTextContent('5');
    expect(ana.getByTestId('hoyo-ana-1')).toHaveAttribute('data-estado', 'match');
    expect(ana.getByTestId('hoyo-ana-2')).toHaveTextContent('4/5');
    expect(ana.getByTestId('hoyo-ana-2')).toHaveAttribute('data-estado', 'mismatch');
    expect(ana.getByTestId('hoyo-ana-3')).toHaveTextContent('—');
    expect(ana.getByTestId('hoyo-ana-4')).toHaveAttribute('data-estado', 'pending');
  });

  it('13: quien no organiza no tiene herramientas', () => {
    pintar();

    expect(screen.queryByRole('button', { name: /partida.reopen|partida.noShow|partida.correct/ })).toBeNull();
  });

  it('15: el organizador corrige un hoyo: solo los lados que cambia', async () => {
    const onCambio = vi.fn();
    pintar({ organiza: true, onCambio });

    fireEvent.click(screen.getByRole('button', { name: /partida\.correct \{"jugador":"ANA","hoyo":2,/ }));
    const editor = screen.getByTestId('corregir-ana-2');
    expect(within(editor).getByRole('combobox', { name: 'partida.ownSide' })).toHaveValue('4');
    expect(within(editor).getByRole('combobox', { name: 'partida.markerSide' })).toHaveValue('5');
    fireEvent.change(within(editor).getByRole('combobox', { name: 'partida.ownSide' }), { target: { value: '5' } });
    fireEvent.click(within(editor).getByRole('button', { name: 'partida.save' }));

    await waitFor(() => expect(mockCorregir).toHaveBeenCalledWith('g-1', 'ana', 2, { ownScore: 5 }));
    expect(onCambio).toHaveBeenCalled();
    expect(mockToast.success).toHaveBeenCalledWith('partida.corrected');
    expect(screen.queryByTestId('corregir-ana-2')).toBeNull();
  });

  it('15b: recogida se ofrece en Stableford (y se manda nula); en Medal no', () => {
    pintar({ organiza: true });
    fireEvent.click(screen.getByRole('button', { name: /partida\.correct \{"jugador":"ANA","hoyo":4,/ }));
    const opciones = within(screen.getByRole('combobox', { name: 'partida.ownSide' })).getAllByRole('option').map((o) => o.value);
    expect(opciones).toContain('RECOGIDA');
    expect(opciones).toContain('15');
    expect(opciones).not.toContain('16');
  });

  it('15c: en Medal no hay recogida', () => {
    pintar({ organiza: true, scoringView: vista('MEDAL') });
    fireEvent.click(screen.getByRole('button', { name: /partida\.correct \{"jugador":"ANA","hoyo":4,/ }));

    expect(within(screen.getByRole('combobox', { name: 'partida.ownSide' })).getAllByRole('option').map((o) => o.value)).not.toContain('RECOGIDA');
  });

  it('15d: recogida se manda nula', async () => {
    pintar({ organiza: true });
    fireEvent.click(screen.getByRole('button', { name: /partida\.correct \{"jugador":"ANA","hoyo":4,/ }));
    fireEvent.change(screen.getByRole('combobox', { name: 'partida.markerSide' }), { target: { value: 'RECOGIDA' } });
    fireEvent.click(screen.getByRole('button', { name: 'partida.save' }));

    await waitFor(() => expect(mockCorregir).toHaveBeenCalledWith('g-1', 'ana', 4, { markerScore: null }));
  });

  it('15d2: si solo cambia el lado del marcador, el del jugador no se manda', async () => {
    pintar({ organiza: true });
    fireEvent.click(screen.getByRole('button', { name: /partida\.correct \{"jugador":"ANA","hoyo":2,/ }));
    fireEvent.change(screen.getByRole('combobox', { name: 'partida.markerSide' }), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'partida.save' }));

    await waitFor(() => expect(mockCorregir).toHaveBeenCalledWith('g-1', 'ana', 2, { markerScore: 4 }));
  });

  it('la celda que se corrige dice también qué hay anotado (revisor)', () => {
    pintar({ organiza: true });

    expect(screen.getByRole('button', { name: 'partida.correct {"jugador":"ANA","hoyo":2,"golpe":"4/5"}' })).toBeInTheDocument();
  });

  it('15e: sin cambios no se manda nada', () => {
    pintar({ organiza: true });
    fireEvent.click(screen.getByRole('button', { name: /partida\.correct \{"jugador":"ANA","hoyo":2,/ }));

    expect(screen.getByRole('button', { name: 'partida.save' })).toBeDisabled();
  });

  it('15f: una tarjeta entregada no se corrige: primero se reabre, con confirmación', async () => {
    const onCambio = vi.fn();
    pintar({ organiza: true, onCambio });

    const bea = within(screen.getByTestId('tarjeta-bea'));
    expect(bea.queryByRole('button', { name: /partida.correct/ })).toBeNull();
    fireEvent.click(bea.getByRole('button', { name: 'partida.reopen {"jugador":"BEA"}' }));
    expect(mockReabrir).not.toHaveBeenCalled();
    fireEvent.click(bea.getByRole('button', { name: 'partida.yes' }));

    await waitFor(() => expect(mockReabrir).toHaveBeenCalledWith('g-1', 'bea'));
    expect(onCambio).toHaveBeenCalled();
  });

  it('15g: no presentado, a quien sigue jugando, con confirmación; «No» no hace nada', async () => {
    pintar({ organiza: true });

    const ana = within(screen.getByTestId('tarjeta-ana'));
    expect(ana.queryByRole('button', { name: /partida.reopen/ })).toBeNull();
    fireEvent.click(ana.getByRole('button', { name: 'partida.noShow {"jugador":"ANA"}' }));
    fireEvent.click(ana.getByRole('button', { name: 'partida.no' }));
    expect(mockNoPresentado).not.toHaveBeenCalled();

    fireEvent.click(ana.getByRole('button', { name: 'partida.noShow {"jugador":"ANA"}' }));
    fireEvent.click(ana.getByRole('button', { name: 'partida.yes' }));
    await waitFor(() => expect(mockNoPresentado).toHaveBeenCalledWith('g-1', 'ana'));
  });

  it('15h: un error del servidor, traducido, y no se da por hecho', async () => {
    mockReabrir.mockRejectedValue(Object.assign(new Error('x'), { errorCode: 'SCORING_NOT_OPEN_YET' }));
    const onCambio = vi.fn();
    pintar({ organiza: true, onCambio });

    const bea = within(screen.getByTestId('tarjeta-bea'));
    fireEvent.click(bea.getByRole('button', { name: 'partida.reopen {"jugador":"BEA"}' }));
    fireEvent.click(bea.getByRole('button', { name: 'partida.yes' }));

    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith('partida.errors.SCORING_NOT_OPEN_YET'));
    expect(onCambio).not.toHaveBeenCalled();
  });
});
