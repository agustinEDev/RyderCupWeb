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
const mockRetirar = vi.fn();
const mockBorrar = vi.fn();
vi.mock('../../composition', () => ({
  retireTeeGroupPlayerUseCase: { execute: (...a) => mockRetirar(...a) },
  deleteTeeGroupHoleUseCase: { execute: (...a) => mockBorrar(...a) },
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
    mockRetirar.mockResolvedValue({});
    mockBorrar.mockResolvedValue({});
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

    it('revisor: si «Validar lo anotado» falla, la confirmación se cierra', async () => {
      mockValidar.mockRejectedValueOnce(Object.assign(new Error('x'), { errorCode: 'PLAYER_HAS_MARKER' }));
      pintar({ organiza: true, scoringView: vista('STABLEFORD', conMarcador(null)) });

      const ana = within(screen.getByTestId('tarjeta-ana'));
      fireEvent.click(ana.getByRole('button', { name: 'partida.validateScored {"jugador":"ANA"}' }));
      fireEvent.click(ana.getByRole('button', { name: 'partida.yes' }));

      await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith('partida.errors.PLAYER_HAS_MARKER'));
      expect(ana.queryByRole('button', { name: 'partida.yes' })).toBeNull();
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

  // QA del 21 oct 2026 (T1-T3): el hándicap de juego junto al nombre, como en match play
  describe('hándicap de juego junto al nombre', () => {
    const hoyos = () => Array.from({ length: 18 }, (_, i) => hoyo(i + 1));

    it('T1: «HCP 10» a la vista y el largo para el lector de pantalla', () => {
      pintar();

      const hcp = within(screen.getByTestId('tarjeta-ana')).getByTestId('hcp-de-juego-ana');
      expect(within(hcp).getByText('scorecard.playingHandicapShort {"value":"10"}')).toHaveAttribute('aria-hidden', 'true');
      expect(within(hcp).getByText('scorecard.playingHandicap {"value":"10"}')).toHaveClass('sr-only');
    });

    it('T1d: cada tarjeta, el suyo: el de Bea no es el de Ana', () => {
      pintar({
        scoringView: vista('STABLEFORD', [
          jugador('ana', 'JUGANDO', hoyos()),
          jugador('bea', 'JUGANDO', hoyos(), { playing_handicap: 3 }),
        ]),
      });

      expect(within(screen.getByTestId('tarjeta-bea')).getByTestId('hcp-de-juego-bea')).toHaveTextContent(
        'scorecard.playingHandicapShort {"value":"3"}'
      );
      expect(within(screen.getByTestId('tarjeta-ana')).getByTestId('hcp-de-juego-ana')).toHaveTextContent(
        'scorecard.playingHandicapShort {"value":"10"}'
      );
    });

    it('T1e: al llegar otra vista (el sondeo), el hándicap es el de la nueva', () => {
      const conHcp = (valor) =>
        vista('STABLEFORD', [jugador('ana', 'JUGANDO', hoyos()), jugador('bea', 'JUGANDO', hoyos(), { playing_handicap: valor })]);
      const { rerender } = pintar({ scoringView: conHcp(3) });

      rerender(<TarjetasDeLaPartida scoringView={conHcp(7)} userId="ana" organiza={false} onCambio={vi.fn()} />);

      expect(screen.getByTestId('hcp-de-juego-bea')).toHaveTextContent('scorecard.playingHandicapShort {"value":"7"}');
    });

    it('T4: una tarjeta cuyo jugador no está en `players`: sin hándicap ni par, y sin romperse', () => {
      const completa = vista('STABLEFORD', [jugador('ana', 'JUGANDO', hoyos()), jugador('bea', 'JUGANDO', hoyos())]);
      pintar({ scoringView: { ...completa, players: completa.players.filter((p) => p.userId !== 'bea') } });

      const bea = within(screen.getByTestId('tarjeta-bea'));
      expect(bea.getByText('BEA')).toBeInTheDocument();
      expect(bea.queryByTestId('hcp-de-juego-bea')).toBeNull();
      expect(bea.getByTestId('hoyo-bea-1')).toHaveTextContent(/^1·$/);
      expect(within(screen.getByTestId('tarjeta-ana')).getByTestId('hoyo-ana-1')).toHaveTextContent(/^14·$/);
    });

    it('T1b: un plus se escribe con «+» (se guarda negativo)', () => {
      pintar({ scoringView: vista('STABLEFORD', [jugador('ana', 'JUGANDO', hoyos(), { playing_handicap: -5 })]) });

      expect(screen.getByTestId('hcp-de-juego-ana')).toHaveTextContent('scorecard.playingHandicapShort {"value":"+5"}');
    });

    it('T1c: el cero también se enseña, sin signo', () => {
      pintar({ scoringView: vista('MEDAL', [jugador('ana', 'JUGANDO', hoyos(), { playing_handicap: 0 })]) });

      expect(screen.getByTestId('hcp-de-juego-ana')).toHaveTextContent('scorecard.playingHandicapShort {"value":"0"}');
    });

    it('T2: en la línea del nombre, que se corta; el hándicap no', () => {
      pintar();

      const hcp = screen.getByTestId('hcp-de-juego-ana');
      const nombre = within(screen.getByTestId('tarjeta-ana')).getByText('ANA');
      expect(hcp.parentElement).toBe(nombre.parentElement);
      expect(nombre).toHaveClass('min-w-0', 'truncate');
      expect(hcp).toHaveClass('shrink-0', 'whitespace-nowrap');
      expect(nombre.parentElement).toHaveClass('flex', 'min-w-0', 'max-w-full');
    });

    it('T3: sin hándicap de juego, nada', () => {
      pintar({ scoringView: vista('STABLEFORD', [jugador('ana', 'JUGANDO', hoyos(), { playing_handicap: null })]) });

      expect(screen.queryByTestId('hcp-de-juego-ana')).toBeNull();
      expect(screen.getByTestId('tarjeta-ana')).not.toHaveTextContent('playingHandicap');
    });
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

  it('regresión (12 oct 2026): «Retirada» / «No presentada» para ellas en Tarjetas', () => {
    const vacios = Array.from({ length: 18 }, (_, i) => hoyo(i + 1));
    pintar({ scoringView: vista('STABLEFORD', [
      jugador('ana', 'RETIRADO', vacios, { tee_gender: 'FEMALE' }),
      jugador('bea', 'NO_PRESENTADO', vacios, { tee_gender: 'FEMALE' }),
      jugador('cris', 'RETIRADO', vacios, { tee_gender: 'MALE' }),
    ]) });

    expect(screen.getByTestId('tarjeta-ana')).toHaveTextContent('partida.cardStatus.RETIRADO {"context":"female"}');
    expect(screen.getByTestId('tarjeta-bea')).toHaveTextContent('partida.cardStatus.NO_PRESENTADO {"context":"female"}');
    expect(screen.getByTestId('tarjeta-cris')).not.toHaveTextContent('female');
  });

  it('QA 5.ª pasada: «No presentada» también en la acción del organizador (botón, confirmación y aviso)', async () => {
    const hoyos = Array.from({ length: 18 }, (_, i) => hoyo(i + 1));
    const jugadores = [
      jugador('ana', 'JUGANDO', hoyos, { tee_gender: 'FEMALE' }),
      jugador('cris', 'JUGANDO', hoyos, { tee_gender: 'MALE' }),
    ];
    mockNoPresentado.mockResolvedValue(vista('STABLEFORD', jugadores));
    pintar({ organiza: true, scoringView: vista('STABLEFORD', jugadores) });

    const ana = within(screen.getByTestId('tarjeta-ana'));
    const cris = within(screen.getByTestId('tarjeta-cris'));
    expect(cris.getByRole('button', { name: 'partida.noShow {"jugador":"CRIS"}' })).toHaveTextContent(/^partida\.noShowShort$/);
    const boton = ana.getByRole('button', { name: 'partida.noShow {"jugador":"ANA","context":"female"}' });
    expect(boton).toHaveTextContent('partida.noShowShort {"context":"female"}');

    fireEvent.click(boton);
    expect(screen.getByTestId('tarjeta-ana')).toHaveTextContent('partida.noShowConfirm {"jugador":"ANA","context":"female"}');
    fireEvent.click(screen.getByRole('button', { name: 'partida.yes' }));

    await waitFor(() => expect(mockToast.success).toHaveBeenCalledWith('partida.markedNoShow {"context":"female"}'));
  });

  it('#854: la de un no presentado dice NP, no «PAR · tras 0 hoyos»', () => {
    const vacios = Array.from({ length: 18 }, (_, i) => hoyo(i + 1));
    pintar({ scoringView: vista('MEDAL', [jugador('ana', 'NO_PRESENTADO', vacios), jugador('bea', 'JUGANDO', vacios)]) });

    const ana = screen.getByTestId('tarjeta-ana');
    expect(ana).toHaveTextContent('partida.noShowTotal');
    expect(ana).not.toHaveTextContent('partida.thru');
    expect(screen.getByTestId('tarjeta-bea')).toHaveTextContent('partida.thru');
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

  it('QA 3: si reabrir falla (partida completa), su texto y la confirmación se cierra', async () => {
    mockReabrir.mockRejectedValueOnce(Object.assign(new Error('detail'), { errorCode: 'GROUP_FULL' }));
    pintar({ organiza: true });

    const bea = within(screen.getByTestId('tarjeta-bea'));
    fireEvent.click(bea.getByRole('button', { name: 'partida.reopen {"jugador":"BEA"}' }));
    fireEvent.click(bea.getByRole('button', { name: 'partida.yes' }));

    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith('partida.errors.GROUP_FULL'));
    expect(bea.queryByRole('button', { name: 'partida.yes' })).toBeNull();
  });

  it('revisor: si marcar no presentado falla, la confirmación también se cierra', async () => {
    mockNoPresentado.mockRejectedValueOnce(Object.assign(new Error('x'), { errorCode: 'NOT_ORGANIZER' }));
    pintar({ organiza: true });

    const ana = within(screen.getByTestId('tarjeta-ana'));
    fireEvent.click(ana.getByRole('button', { name: 'partida.noShow {"jugador":"ANA"}' }));
    fireEvent.click(ana.getByRole('button', { name: 'partida.yes' }));

    await waitFor(() => expect(ana.queryByRole('button', { name: 'partida.yes' })).toBeNull());
    // Y el foco vuelve a quien abrió la confirmación (revisor)
    await waitFor(() => expect(document.activeElement).toBe(ana.getByRole('button', { name: 'partida.noShow {"jugador":"ANA"}' })));
  });

  it('/code-review: si la petición fue bien pero avisar falla, no se dice que falló ni se reenfoca', async () => {
    mockNoPresentado.mockResolvedValueOnce(null);
    const onCambio = vi.fn(() => { throw new Error('refresco'); });
    pintar({ organiza: true, onCambio });

    const ana = within(screen.getByTestId('tarjeta-ana'));
    fireEvent.click(ana.getByRole('button', { name: 'partida.noShow {"jugador":"ANA"}' }));
    fireEvent.click(ana.getByRole('button', { name: 'partida.yes' }));

    await waitFor(() => expect(mockToast.success).toHaveBeenCalled());
    expect(mockToast.error).not.toHaveBeenCalled();
  });

  it('/code-review: con «No», el foco vuelve al botón que la abrió', () => {
    pintar({ organiza: true });

    const ana = within(screen.getByTestId('tarjeta-ana'));
    fireEvent.click(ana.getByRole('button', { name: 'partida.noShow {"jugador":"ANA"}' }));
    fireEvent.click(ana.getByRole('button', { name: 'partida.no' }));

    expect(document.activeElement).toBe(ana.getByRole('button', { name: 'partida.noShow {"jugador":"ANA"}' }));
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

  // FE-A: lo del organizador tras RyderCupAm#553
  describe('retirar a quien jugó y borrar lo anotado', () => {
    const jugo = (extra = {}) => [
      jugador('ana', 'JUGANDO', hoyosDeAna, { played: true, tee_gender: 'FEMALE', ...extra }),
      jugador('bea', 'JUGANDO', Array.from({ length: 18 }, (_, i) => hoyo(i + 1))),
    ];

    it('8: si jugó, «Retirar» y no «No presentado»; a quien no, al revés', () => {
      pintar({ organiza: true, scoringView: vista('STABLEFORD', jugo()) });

      const ana = within(screen.getByTestId('tarjeta-ana'));
      expect(ana.getByRole('button', { name: 'partida.retirePlayer {"jugador":"ANA","context":"female"}' })).toBeInTheDocument();
      expect(ana.queryByRole('button', { name: /partida.noShow/ })).toBeNull();
      const bea = within(screen.getByTestId('tarjeta-bea'));
      expect(bea.getByRole('button', { name: /partida.noShow/ })).toBeInTheDocument();
      expect(bea.queryByRole('button', { name: /partida.retirePlayer/ })).toBeNull();
    });

    it('8: retirar, con confirmación; «No» no hace nada; «Sí» retira y avisa en femenino', async () => {
      const onCambio = vi.fn();
      pintar({ organiza: true, onCambio, scoringView: vista('STABLEFORD', jugo()) });
      const ana = within(screen.getByTestId('tarjeta-ana'));
      const boton = () => ana.getByRole('button', { name: /partida.retirePlayer / });

      fireEvent.click(boton());
      expect(ana.getByText(/partida.retirePlayerConfirm/)).toHaveTextContent('"context":"female"');
      fireEvent.click(ana.getByRole('button', { name: 'partida.no' }));
      expect(mockRetirar).not.toHaveBeenCalled();

      fireEvent.click(boton());
      fireEvent.click(ana.getByRole('button', { name: 'partida.yes' }));
      await waitFor(() => expect(mockRetirar).toHaveBeenCalledWith('g-1', 'ana'));
      expect(mockToast.success).toHaveBeenCalledWith('partida.retiredByOrganiser {"context":"female"}');
      expect(onCambio).toHaveBeenCalled();
    });

    it('10: PLAYER_HAS_STROKES al marcar no presentado: su texto y se relee (saldrá «Retirar»)', async () => {
      mockNoPresentado.mockRejectedValue(Object.assign(new Error('x'), { errorCode: 'PLAYER_HAS_STROKES' }));
      const onCambio = vi.fn();
      pintar({ organiza: true, onCambio });
      const ana = within(screen.getByTestId('tarjeta-ana'));

      fireEvent.click(ana.getByRole('button', { name: /partida.noShow / }));
      fireEvent.click(ana.getByRole('button', { name: 'partida.yes' }));

      await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith('partida.errors.PLAYER_HAS_STROKES'));
      expect(onCambio).toHaveBeenCalled();
    });

    it('10: SCORECARD_ALREADY_OPEN al reabrir: sin error rojo, aviso y se relee', async () => {
      mockReabrir.mockRejectedValue(Object.assign(new Error('x'), { errorCode: 'SCORECARD_ALREADY_OPEN' }));
      const onCambio = vi.fn();
      pintar({ organiza: true, onCambio });
      const bea = within(screen.getByTestId('tarjeta-bea'));

      fireEvent.click(bea.getByRole('button', { name: 'partida.reopen {"jugador":"BEA"}' }));
      fireEvent.click(bea.getByRole('button', { name: 'partida.yes' }));

      await waitFor(() => expect(mockToast.info).toHaveBeenCalledWith('partida.errors.SCORECARD_ALREADY_OPEN'));
      expect(mockToast.error).not.toHaveBeenCalled();
      expect(onCambio).toHaveBeenCalled();
      expect(bea.queryByRole('button', { name: 'partida.yes' })).toBeNull();
    });

    it('9: «Borrar lo anotado» ofrece solo los lados con algo; con los dos, también «los dos»', () => {
      pintar({ organiza: true });
      fireEvent.click(screen.getByTestId('hoyo-ana-1'));
      fireEvent.click(screen.getByRole('button', { name: 'partida.deleteScored' }));

      const hoja = within(screen.getByTestId('corregir-ana-1'));
      expect(hoja.getByRole('button', { name: 'partida.deleteSide.own' })).toBeInTheDocument();
      expect(hoja.getByRole('button', { name: 'partida.deleteSide.marker' })).toBeInTheDocument();
      expect(hoja.getByRole('button', { name: 'partida.deleteSide.both' })).toBeInTheDocument();
    });

    it('9: con solo lo del jugador, solo ese lado', () => {
      const deAna = [hoyo(1, { own_score: 4, own_submitted: true }), ...hoyosDeAna.slice(1)];
      pintar({ organiza: true, scoringView: vista('STABLEFORD', [jugador('ana', 'JUGANDO', deAna)]) });
      fireEvent.click(screen.getByTestId('hoyo-ana-1'));
      fireEvent.click(screen.getByRole('button', { name: 'partida.deleteScored' }));

      const hoja = within(screen.getByTestId('corregir-ana-1'));
      expect(hoja.getByRole('button', { name: 'partida.deleteSide.own' })).toBeInTheDocument();
      expect(hoja.queryByRole('button', { name: 'partida.deleteSide.marker' })).toBeNull();
      expect(hoja.queryByRole('button', { name: 'partida.deleteSide.both' })).toBeNull();
    });

    it('9: un hoyo sin nada anotado no ofrece borrar', () => {
      pintar({ organiza: true });
      fireEvent.click(screen.getByTestId('hoyo-ana-5'));

      expect(screen.queryByRole('button', { name: 'partida.deleteScored' })).toBeNull();
    });

    it('9: borrar pide confirmar; «No» no borra; «Sí» borra ese lado, avisa y cierra', async () => {
      const onCambio = vi.fn();
      pintar({ organiza: true, onCambio });
      fireEvent.click(screen.getByTestId('hoyo-ana-2'));
      fireEvent.click(screen.getByRole('button', { name: 'partida.deleteScored' }));
      fireEvent.click(screen.getByRole('button', { name: 'partida.deleteSide.marker' }));

      const hoja = within(screen.getByTestId('corregir-ana-2'));
      expect(hoja.getByText(/partida.deleteConfirm\./)).toHaveTextContent('"hoyo":2');
      fireEvent.click(hoja.getByRole('button', { name: 'partida.no' }));
      expect(mockBorrar).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: 'partida.deleteSide.marker' }));
      fireEvent.click(hoja.getByRole('button', { name: 'partida.yes' }));
      await waitFor(() => expect(mockBorrar).toHaveBeenCalledWith('g-1', 'ana', 2, 'marker'));
      expect(mockToast.success).toHaveBeenCalledWith('partida.deleted');
      expect(onCambio).toHaveBeenCalled();
      await waitFor(() => expect(screen.queryByTestId('corregir-ana-2')).toBeNull());
    });

    it('revisor: mientras se elige qué borrar, no se corrige ni se guarda', () => {
      pintar({ organiza: true });
      fireEvent.click(screen.getByTestId('hoyo-ana-1'));
      fireEvent.click(screen.getByRole('button', { name: 'partida.deleteScored' }));

      expect(screen.queryByRole('combobox', { name: 'partida.ownSide' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'partida.save' })).toBeNull();
    });

    it('revisor: los lados para borrar, con lo de ahora (si llega un golpe con la hoja abierta)', () => {
      const deAna = [hoyo(1, { marker_score: 4, marker_submitted: true }), ...hoyosDeAna.slice(1)];
      const { rerender } = pintar({ organiza: true, scoringView: vista('STABLEFORD', [jugador('ana', 'JUGANDO', deAna)]) });
      fireEvent.click(screen.getByTestId('hoyo-ana-1'));

      const ahora = [hoyo(1, { own_score: 5, own_submitted: true, marker_score: 4, marker_submitted: true, status: 'MISMATCH' }), ...hoyosDeAna.slice(1)];
      rerender(<TarjetasDeLaPartida scoringView={vista('STABLEFORD', [jugador('ana', 'JUGANDO', ahora)])} userId="ana" organiza onCambio={vi.fn()} />);
      fireEvent.click(screen.getByRole('button', { name: 'partida.deleteScored' }));

      expect(screen.getByRole('button', { name: 'partida.deleteSide.own' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'partida.deleteSide.both' })).toBeInTheDocument();
    });

    it('revisor: tras borrar, el foco vuelve a la celda del hoyo', async () => {
      pintar({ organiza: true });
      fireEvent.click(screen.getByTestId('hoyo-ana-1'));
      fireEvent.click(screen.getByRole('button', { name: 'partida.deleteScored' }));
      fireEvent.click(screen.getByRole('button', { name: 'partida.deleteSide.own' }));
      fireEvent.click(within(screen.getByTestId('corregir-ana-1')).getByRole('button', { name: 'partida.yes' }));

      await waitFor(() => expect(document.activeElement).toBe(screen.getByTestId('hoyo-ana-1')));
    });

    it('revisor: tras un fallo que relee, el foco va a la tarjeta (su botón desaparece)', async () => {
      mockReabrir.mockRejectedValue(Object.assign(new Error('x'), { errorCode: 'SCORECARD_ALREADY_OPEN' }));
      pintar({ organiza: true });
      const bea = within(screen.getByTestId('tarjeta-bea'));
      fireEvent.click(bea.getByRole('button', { name: 'partida.reopen {"jugador":"BEA"}' }));
      fireEvent.click(bea.getByRole('button', { name: 'partida.yes' }));

      await waitFor(() => expect(document.activeElement).toBe(screen.getByTestId('tarjeta-bea')));
    });

    it('/code-review: si el lado elegido ya no está, no se confirma: vuelve a elegir', () => {
      const { rerender } = pintar({ organiza: true });
      fireEvent.click(screen.getByTestId('hoyo-ana-1'));
      fireEvent.click(screen.getByRole('button', { name: 'partida.deleteScored' }));
      fireEvent.click(screen.getByRole('button', { name: 'partida.deleteSide.both' }));

      const soloSuyo = [hoyo(1, { own_score: 5, own_submitted: true }), ...hoyosDeAna.slice(1)];
      rerender(<TarjetasDeLaPartida scoringView={vista('STABLEFORD', [jugador('ana', 'JUGANDO', soloSuyo)])} userId="ana" organiza onCambio={vi.fn()} />);

      expect(screen.queryByText(/partida.deleteConfirm/)).toBeNull();
      expect(screen.getByRole('button', { name: 'partida.deleteSide.own' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'partida.deleteSide.both' })).toBeNull();
    });

    it('/code-review: el foco sigue cada paso de borrar', () => {
      pintar({ organiza: true });
      fireEvent.click(screen.getByTestId('hoyo-ana-1'));
      fireEvent.click(screen.getByRole('button', { name: 'partida.deleteScored' }));
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'partida.deleteSide.own' }));

      fireEvent.click(screen.getByRole('button', { name: 'partida.deleteSide.own' }));
      const hoja = within(screen.getByTestId('corregir-ana-1'));
      expect(document.activeElement).toBe(hoja.getByRole('button', { name: 'partida.no' }));

      fireEvent.click(hoja.getByRole('button', { name: 'partida.no' }));
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'partida.deleteSide.own' }));

      fireEvent.click(hoja.getByRole('button', { name: 'partida.cancel' }));
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'partida.deleteScored' }));
    });

    it('/code-review: mientras se borra, «No» está desactivado', async () => {
      let soltar;
      mockBorrar.mockReturnValue(new Promise((r) => (soltar = r)));
      pintar({ organiza: true });
      fireEvent.click(screen.getByTestId('hoyo-ana-1'));
      fireEvent.click(screen.getByRole('button', { name: 'partida.deleteScored' }));
      fireEvent.click(screen.getByRole('button', { name: 'partida.deleteSide.own' }));
      const hoja = within(screen.getByTestId('corregir-ana-1'));
      fireEvent.click(hoja.getByRole('button', { name: 'partida.yes' }));

      expect(hoja.getByRole('button', { name: 'partida.no' })).toBeDisabled();
      soltar({});
      await waitFor(() => expect(screen.queryByTestId('corregir-ana-1')).toBeNull());
    });

    it('/code-review: tras retirar con éxito, el foco va a la tarjeta', async () => {
      pintar({ organiza: true, scoringView: vista('STABLEFORD', jugo()) });
      const ana = within(screen.getByTestId('tarjeta-ana'));
      fireEvent.click(ana.getByRole('button', { name: /partida.retirePlayer / }));
      fireEvent.click(ana.getByRole('button', { name: 'partida.yes' }));

      await waitFor(() => expect(document.activeElement).toBe(screen.getByTestId('tarjeta-ana')));
    });

    it('9: si borrar falla, la hoja sigue abierta con lo que había', async () => {
      mockBorrar.mockRejectedValue(Object.assign(new Error('x'), { errorCode: 'GROUP_NOT_SCORING' }));
      pintar({ organiza: true });
      fireEvent.click(screen.getByTestId('hoyo-ana-1'));
      fireEvent.click(screen.getByRole('button', { name: 'partida.deleteScored' }));
      fireEvent.click(screen.getByRole('button', { name: 'partida.deleteSide.both' }));
      fireEvent.click(within(screen.getByTestId('corregir-ana-1')).getByRole('button', { name: 'partida.yes' }));

      await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith('partida.errors.GROUP_NOT_SCORING'));
      expect(screen.getByTestId('corregir-ana-1')).toBeInTheDocument();
    });
  });
});
