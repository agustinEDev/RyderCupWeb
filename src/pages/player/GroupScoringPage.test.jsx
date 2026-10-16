import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

/**
 * La pantalla de anotar una partida de stroke play (FE #824, PR 7). La tabla
 * aprobada el 11 oct 2026 (los casos de la cola y del vaciado están en sus
 * tests; los de las pestañas, en las suyas):
 *
 *   1   abrir                                 | cabecera: partida, hora y tipo
 *   2   antes de que abra la anotación        | «se abre a las …», sin casilla
 *   3   Anotar                                | mi golpe y el de quien marco; Medal sin recogida
 *   6   guardar un hoyo                       | con quien marco; solo, con su propio id
 *   9   entregar                              | la barra: entregar / faltan / entregada
 *   10  retirarse                             | con confirmación
 *   11  Clasificación de la franja            | solo con su pestaña abierta
 *   12  Tarjetas                              | las de la partida
 *   13  quien no juega                        | sin Anotar: Tarjetas y Clasificación
 *   15  el organizador                        | herramientas en Tarjetas
 *   18  errores                               | traducidos
 */
const mockParams = { groupId: 'g-1' };
let mockBusqueda = new URLSearchParams('competition=c-1');
vi.mock('react-router', () => ({
  useParams: () => mockParams,
  useSearchParams: () => [mockBusqueda],
  useNavigate: () => vi.fn(),
  Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => (opts ? `${key} ${JSON.stringify(opts)}` : key),
    i18n: { language: 'es' },
  }),
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'ana', is_admin: false }, loading: false }),
}));

let mockRoles = { isAdmin: false, isCreator: false, isLoading: false };
vi.mock('../../hooks/useUserRoles', () => ({ useUserRoles: (id) => (id ? mockRoles : { isAdmin: false, isCreator: false, isLoading: false }) }));

const mockToast = { error: vi.fn(), success: vi.fn() };
vi.mock('../../utils/toast', () => ({ default: mockToast }));

const mockRetirarse = vi.fn();
vi.mock('../../composition', () => ({
  retireFromTeeGroupUseCase: { execute: (...a) => mockRetirarse(...a) },
}));

const llamadas = vi.hoisted(() => ({ useScoring: null, casilla: null, clasificacion: null, tarjetas: null, selector: null }));
let mockHook;
vi.mock('../../hooks/useScoring', () => ({
  useScoring: (...args) => {
    llamadas.useScoring = args;
    return mockHook;
  },
}));
vi.mock('../../components/layout/HeaderAuth', () => ({ default: () => <div /> }));
const mapaHoyo = vi.hoisted(() => ({
  args: null,
  ventana: null,
  valor: { abierto: false, abrir: () => {}, cerrar: () => {}, mapaDelCampo: null },
}));
vi.mock('../../hooks/useMapaDelHoyo', () => ({
  useMapaDelHoyo: (args) => {
    mapaHoyo.args = args;
    return mapaHoyo.valor;
  },
}));
vi.mock('../../components/scoring/mapa/VentanaDelMapa', () => ({
  default: (props) => {
    mapaHoyo.ventana = props;
    return null;
  },
}));

vi.mock('../../components/scoring/HoleInput', () => ({
  default: (props) => {
    llamadas.casilla = props;
    return <div data-testid="hole-input" />;
  },
}));
vi.mock('../../components/scoring/HoleSelector', () => ({
  default: (props) => {
    llamadas.selector = props;
    return <div data-testid="hole-selector" />;
  },
}));
vi.mock('../../components/scoring/ClasificacionDeLaFranja', () => ({
  default: (props) => {
    llamadas.clasificacion = props;
    return <div data-testid="clasificacion" data-activa={String(props.activa)} />;
  },
}));
vi.mock('../../components/scoring/TarjetasDeLaPartida', () => ({
  default: (props) => {
    llamadas.tarjetas = props;
    return <div data-testid="tarjetas" />;
  },
}));

const GroupScoringPage = (await import('./GroupScoringPage')).default;
const { ORIGEN_PARTIDA_DE_FRANJA } = await import('../../hooks/origenesDeAnotacion');
const { default: TeeGroupScoringMapper } = await import('../../infrastructure/mappers/TeeGroupScoringMapper');

const hoyo = (hole) => ({ hole, par: 4, strokes_received: 0, own_score: null, own_submitted: false, marker_score: null, marker_submitted: false, status: 'PENDING' });
const jugador = (userId, marks, extra = {}) => ({
  user_id: userId, name: userId.toUpperCase(), playing_handicap: 10, tee_color: 'YELLOW', card_status: 'JUGANDO',
  marks_user_id: marks, marked_by_user_id: marks, holes: Array.from({ length: 18 }, (_, i) => hoyo(i + 1)),
  totals: { thru: 0, points: 0, gross_points: 0, gross: 0, net: 0, to_par_net: 0, to_par_gross: 0, complete: false }, ...extra,
});
const vista = (extra = {}, players) =>
  TeeGroupScoringMapper.toScoringViewDTO({
    group_id: 'g-1', round_id: 'r-1', number: 2, tee_time: '08:10', status: 'IN_PROGRESS', scoring_opens_at: '2020-01-01T06:00:00Z',
    tournament_type: 'STABLEFORD', picked_up_allowed: true, i_mark_user_id: 'bea',
    players: players ?? [jugador('ana', 'bea'), jugador('bea', 'ana')], ...extra,
  });
const hook = (extra = {}) => {
  const scoringView = extra.scoringView ?? vista();
  return {
    scoringView, scoresVisibles: scoringView.scores, currentHole: 1, isLoading: false, error: null, origenDelError: null,
    isSubmitting: false, matchSummary: null, isOffline: false, isSessionBlocked: false, pendingQueueSize: 0, noGuardados: {},
    avisoDelVaciado: null, pintadoDeMemoria: false, isMatchPlayer: true, canScore: true, hasSubmitted: false,
    isOwnScoreLocked: false, isMarkerScoreLocked: false, isFullyLocked: false, validatedHoles: 0, totalHoles: 18,
    holesToSubmit: 18, canSubmitScorecard: false, partidoAcabado: false, setCurrentHole: vi.fn(), submitScore: vi.fn(),
    submitScorecard: vi.fn().mockResolvedValue(), takeOverSession: vi.fn(), refetch: vi.fn(), ...extra,
  };
};

describe('GroupScoringPage (FE #824, PR 7)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBusqueda = new URLSearchParams('competition=c-1');
    mockRoles = { isAdmin: false, isCreator: false, isLoading: false };
    mockHook = hook();
    mockRetirarse.mockResolvedValue({});
  });

  it('1: anota con el origen de las partidas; cabecera con número, hora y tipo', () => {
    render(<GroupScoringPage />);

    expect(llamadas.useScoring).toEqual(['g-1', 'ana', false, ORIGEN_PARTIDA_DE_FRANJA]);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('partida.header {"numero":2,"hora":"08:10"}');
    expect(screen.getByText('partida.type.STABLEFORD')).toBeInTheDocument();
  });

  it('vuelve a la ficha de la competición si se sabe cuál es', () => {
    render(<GroupScoringPage />);

    expect(screen.getByRole('link', { name: /partida.backToCompetition/ })).toHaveAttribute('href', '/competitions/c-1');
  });

  it('2: antes de que abra, la hora y sin casilla', () => {
    mockHook = hook({ scoringView: vista({ status: 'SCHEDULED', scoring_opens_at: '2999-01-01T08:00:00+01:00' }) });
    render(<GroupScoringPage />);

    expect(screen.getByText(/notOpenYet.opensAt/)).toBeInTheDocument();
    expect(screen.queryByTestId('hole-input')).toBeNull();
  });

  it('3: la casilla, con recogida en Stableford y sin ella en Medal', () => {
    const { unmount } = render(<GroupScoringPage />);
    expect(llamadas.casilla.allowPickedUp).toBe(true);
    unmount();

    mockHook = hook({ scoringView: vista({ tournament_type: 'MEDAL', picked_up_allowed: false }) });
    render(<GroupScoringPage />);
    expect(llamadas.casilla.allowPickedUp).toBe(false);
  });

  it('6: guardar un hoyo, con quien marco', () => {
    render(<GroupScoringPage />);

    llamadas.casilla.onScoreChange({ ownScore: 5, markedScore: 4 }, 'ownScore');

    expect(mockHook.submitScore).toHaveBeenCalledWith(1, { ownScore: 5, markedPlayerId: 'bea', markedScore: 4 }, { tocado: 'ownScore' });
  });

  it('6b: solo en su partida (sin marcado): su golpe, con su propio id y sin el del marcado', () => {
    mockHook = hook({ scoringView: vista({ i_mark_user_id: null }, [jugador('ana', null)]) });
    render(<GroupScoringPage />);

    llamadas.casilla.onScoreChange({ ownScore: 5, markedScore: undefined }, 'ownScore');

    expect(mockHook.submitScore).toHaveBeenCalledWith(1, { ownScore: 5, markedPlayerId: 'ana', markedScore: undefined }, { tocado: 'ownScore' });
    expect(llamadas.casilla.isMarkerScoreLocked).toBe(true);
  });

  it.each([
    [{ canSubmitScorecard: true }, 'entregar'],
    [{ partidoAcabado: true }, 'faltaValidar'],
    [{ hasSubmitted: true }, 'entregada'],
  ])('9: la barra de entrega (%o → %s)', (extra, estado) => {
    mockHook = hook(extra);
    render(<GroupScoringPage />);

    expect(screen.getByTestId('estado-de-entrega')).toHaveAttribute('data-estado', estado);
  });

  it('9b: entregar pide confirmar y entrega', async () => {
    mockHook = hook({ canSubmitScorecard: true, validatedHoles: 18 });
    render(<GroupScoringPage />);

    fireEvent.click(within(screen.getByTestId('barra-de-entrega')).getByRole('button'));
    // En una partida el organizador la puede reabrir (2.ª pasada del QA)
    expect(await screen.findByText('submit.confirmReopenable')).toBeInTheDocument();
    fireEvent.click(await screen.findByTestId('submit-confirm'));

    await waitFor(() => expect(mockHook.submitScorecard).toHaveBeenCalled());
  });

  it('10: retirarse, con confirmación; «No» no hace nada', async () => {
    render(<GroupScoringPage />);

    fireEvent.click(screen.getByRole('button', { name: 'partida.retire' }));
    fireEvent.click(screen.getByRole('button', { name: 'partida.no' }));
    expect(mockRetirarse).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'partida.retire' }));
    fireEvent.click(screen.getByRole('button', { name: 'partida.retireYes' }));
    await waitFor(() => expect(mockRetirarse).toHaveBeenCalledWith('g-1'));
    expect(mockHook.refetch).toHaveBeenCalled();
  });

  it('10b: con la tarjeta ya cerrada no hay «Retirarme»', () => {
    mockHook = hook({ hasSubmitted: true, scoringView: vista({}, [jugador('ana', 'bea', { card_status: 'ENTREGADA' }), jugador('bea', 'ana')]) });
    render(<GroupScoringPage />);

    expect(screen.queryByRole('button', { name: 'partida.retire' })).toBeNull();
  });

  it('retirado (o no presentado), ya no anota ni se le pide entregar: el servidor lo tiraría sin avisar (revisor)', () => {
    mockHook = hook({ partidoAcabado: true, scoringView: vista({}, [jugador('ana', 'bea', { card_status: 'RETIRADO' }), jugador('bea', 'ana')]) });
    render(<GroupScoringPage />);

    expect(llamadas.casilla.isOwnScoreLocked).toBe(true);
    expect(screen.queryByTestId('estado-de-entrega')).toBeNull();
  });

  it('#854: el no presentado ve por qué no anota y no tiene casilla', () => {
    llamadas.casilla = null;
    mockHook = hook({ scoringView: vista({}, [jugador('ana', 'bea', { card_status: 'NO_PRESENTADO', tee_gender: 'FEMALE' }), jugador('bea', 'ana')]) });
    render(<GroupScoringPage />);

    expect(screen.getByTestId('no-presentado')).toHaveTextContent('partida.youAreNoShowHere {"context":"female"}');
    expect(llamadas.casilla).toBeNull();
    // Ni la tira, ni pasar de hoyo, ni «Retirarme» (revisor)
    expect(screen.queryByTestId('hole-selector')).toBeNull();
    expect(screen.queryByRole('button', { name: 'input.nextHole' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'partida.retire' })).toBeNull();
  });

  it('revisor: el no presentado no ve los avisos de anotar sin conexión ni de hoyos sin guardar', async () => {
    const { default: AvisoSinConexion } = await import('../../components/ui/AvisoSinConexion');
    mockHook = hook({
      isOffline: true,
      noGuardados: { 3: { turno: 1 } },
      scoringView: vista({}, [jugador('ana', 'bea', { card_status: 'NO_PRESENTADO' }), jugador('bea', 'ana')]),
    });
    render(<><AvisoSinConexion /><GroupScoringPage /></>);

    expect(screen.queryByTestId('no-guardados')).toBeNull();
    expect(screen.queryByText(/sinConexion.anotando/)).toBeNull();
  });

  it('/code-review: ni «a salvo» con su cola: el servidor ya no se la va a guardar', () => {
    mockHook = hook({ pendingQueueSize: 2, scoringView: vista({}, [jugador('ana', 'bea', { card_status: 'NO_PRESENTADO' }), jugador('bea', 'ana')]) });
    render(<GroupScoringPage />);

    expect(screen.queryByTestId('pendientes-a-salvo')).toBeNull();
  });

  it('entregada, la barra lo dice (la tarjeta entregada no cuenta como retirada)', () => {
    mockHook = hook({ hasSubmitted: true, scoringView: vista({}, [jugador('ana', 'bea', { card_status: 'ENTREGADA' }), jugador('bea', 'ana')]) });
    render(<GroupScoringPage />);

    expect(screen.getByTestId('estado-de-entrega')).toHaveAttribute('data-estado', 'entregada');
  });

  it('si al que marco se retira, su casilla se bloquea; la mía no (revisor)', () => {
    mockHook = hook({ scoringView: vista({}, [jugador('ana', 'bea'), jugador('bea', 'ana', { card_status: 'NO_PRESENTADO' })]) });
    render(<GroupScoringPage />);

    expect(llamadas.casilla.isMarkerScoreLocked).toBe(true);
    expect(llamadas.casilla.isOwnScoreLocked).toBe(false);
  });

  it('el selector de hoyos no cuenta a quien se retiró: si no, ningún hoyo volvía a ponerse en verde (/code-review)', () => {
    mockHook = hook({ scoringView: vista({}, [jugador('ana', 'bea'), jugador('bea', 'ana'), jugador('cris', null, { card_status: 'RETIRADO' })]) });
    render(<GroupScoringPage />);

    expect(llamadas.selector.scores[0].playerScores.map((p) => p.userId)).toEqual(['ana', 'bea']);
  });

  // 3.ª pasada del QA (12 oct 2026): la retirada veía en verde los hoyos que
  // no jugó (los validaban los demás) y sin «Te anotó X»
  it('QA 3: quien se retiró ve su tarjeta en solo lectura y la tira de hoyos con la suya', () => {
    const jugado = { ...hoyo(1), own_score: 5, own_submitted: true, status: 'PENDING' };
    mockHook = hook({ scoringView: vista({}, [jugador('ana', 'bea', { card_status: 'RETIRADO', holes: [jugado, ...Array.from({ length: 17 }, (_, i) => hoyo(i + 2))] }), jugador('bea', 'cris'), jugador('cris', 'bea')]) });
    render(<GroupScoringPage />);

    expect(llamadas.casilla.isReadOnly).toBe(true);
    expect(llamadas.selector.scores[0].playerScores.map((p) => p.userId)).toEqual(['ana']);
  });

  it('revisor: la retirada lee «Te anotó» solo en los hoyos que alguien le anotó, y sigue con columna', () => {
    const anotado = { ...hoyo(1), own_score: 5, own_submitted: true, marker_score: 5, marker_submitted: true, status: 'MATCH', marker_by: 'bea', marker_by_name: 'Bea' };
    mockHook = hook({ scoringView: vista({}, [jugador('ana', 'cris', { card_status: 'RETIRADO', marked_by_user_id: null, holes: [anotado, ...Array.from({ length: 17 }, (_, i) => hoyo(i + 2))] }), jugador('bea', 'cris'), jugador('cris', 'bea')]) });
    render(<GroupScoringPage />);

    expect(llamadas.casilla.markerName).toBe('Bea');
    expect(llamadas.casilla.hasMarker).toBe(true);
  });

  it('revisor: en la tira de la retirada, los hoyos que no jugó salen vacíos, no «por validar»', () => {
    const jugado = { ...hoyo(1), own_score: 5, own_submitted: true, marker_score: 5, marker_submitted: true, status: 'MATCH' };
    mockHook = hook({ scoringView: vista({}, [jugador('ana', 'cris', { card_status: 'RETIRADO', holes: [jugado, ...Array.from({ length: 17 }, (_, i) => hoyo(i + 2))] }), jugador('bea', 'cris'), jugador('cris', 'bea')]) });
    render(<GroupScoringPage />);

    // Solo la suya, y solo el 1 con algo: la tira pinta vacío lo demás (#847)
    expect(llamadas.selector.scores.every((s) => s.playerScores.every((p) => p.userId === 'ana'))).toBe(true);
    const conAlgo = llamadas.selector.scores.filter((s) => s.playerScores.some((p) => p.ownSubmitted || p.markerSubmitted));
    expect(conAlgo.map((s) => s.holeNumber)).toEqual([1]);
  });

  it('revisor: un hoyo que nadie le anotó no lleva nombre de marcador', () => {
    mockHook = hook({ currentHole: 1, scoringView: vista({}, [jugador('ana', 'bea', { card_status: 'NO_PRESENTADO' }), jugador('bea', 'cris'), jugador('cris', 'bea')]) });
    render(<GroupScoringPage />);

    expect(llamadas.casilla.isReadOnly).toBe(true);
    expect(llamadas.casilla.markerName).toBeNull();
  });

  it('revisor: si retirarse falla, la confirmación se cierra', async () => {
    mockRetirarse.mockRejectedValueOnce(Object.assign(new Error('x'), { errorCode: 'GROUP_NOT_SCORING' }));
    render(<GroupScoringPage />);

    fireEvent.click(screen.getByRole('button', { name: 'partida.retire' }));
    fireEvent.click(screen.getByRole('button', { name: 'partida.retireYes' }));

    await waitFor(() => expect(screen.queryByRole('button', { name: 'partida.retireYes' })).toBeNull());
  });

  it('la hora de la cabecera, en HH:MM aunque llegue con segundos', () => {
    mockHook = hook({ scoringView: vista({ tee_time: '08:10:00' }) });
    render(<GroupScoringPage />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('"hora":"08:10"');
  });

  it('lo pintado sale de la memoria del móvil: se dice (FE #614, revisor)', () => {
    mockHook = hook({ pintadoDeMemoria: true });
    render(<GroupScoringPage />);

    expect(screen.getByTestId('pintado-de-memoria')).toHaveTextContent('offline.noSeActualiza');
  });

  // QA del 11 oct 2026
  describe('lo del QA', () => {
    it('7: antes de que abra habla de la partida, no del partido', () => {
      mockHook = hook({ scoringView: vista({ status: 'SCHEDULED', scoring_opens_at: '2999-01-01T08:00:00+01:00' }) });
      render(<GroupScoringPage />);

      expect(screen.getByText('partida.notOpenYet')).toBeInTheDocument();
      expect(screen.queryByText('notOpenYet.title')).toBeNull();
    });

    it('7: la barra de entregar dice «partida terminada»', () => {
      mockHook = hook({ canSubmitScorecard: true, partidoAcabado: true });
      render(<GroupScoringPage />);

      expect(screen.getByTestId('barra-de-entrega')).toHaveTextContent('submit.groupOver');
      expect(screen.getByTestId('barra-de-entrega')).not.toHaveTextContent('submit.matchOver');
    });

    it('10: sin nadie en juego que me marque, sé que valida el organizador', () => {
      mockHook = hook({ scoringView: vista({}, [jugador('ana', 'bea', { marked_by_user_id: null }), jugador('bea', 'ana', { marks_user_id: null })]) });
      render(<GroupScoringPage />);

      expect(screen.getByTestId('sin-marcador')).toHaveTextContent('partida.organiserValidates');
    });

    it('10: también si quien me marcaba ya entregó', () => {
      mockHook = hook({ scoringView: vista({}, [jugador('ana', 'bea'), jugador('bea', 'ana', { card_status: 'ENTREGADA' })]) });
      render(<GroupScoringPage />);

      expect(screen.getByTestId('sin-marcador')).toBeInTheDocument();
    });

    it('10: con marcador en juego, nada', () => {
      render(<GroupScoringPage />);

      expect(screen.queryByTestId('sin-marcador')).toBeNull();
    });

    it('15-16: la casilla sabe a quién anoto y quién me anota', () => {
      mockHook = hook({ scoringView: vista({}, [jugador('ana', 'bea', { marked_by_user_id: 'cris' }), jugador('bea', 'cris'), jugador('cris', 'ana')]) });
      render(<GroupScoringPage />);

      expect(llamadas.casilla.markedName).toBe('BEA');
      expect(llamadas.casilla.markerName).toBe('CRIS');
    });

    it('QA 2: sin nadie a quien marcar ni quien me marque, la casilla lo sabe', () => {
      mockHook = hook({ scoringView: vista({ i_mark_user_id: null }, [jugador('ana', null, { marked_by_user_id: null })]) });
      render(<GroupScoringPage />);

      expect(llamadas.casilla.marksSomeone).toBe(false);
      expect(llamadas.casilla.hasMarker).toBe(false);
    });

    it('QA 2: con los dos, la casilla tiene las dos', () => {
      render(<GroupScoringPage />);

      expect(llamadas.casilla.marksSomeone).toBe(true);
      expect(llamadas.casilla.hasMarker).toBe(true);
    });

    it('QA 2: el número del marcado lo puso otro (el marcador de antes): su nombre', () => {
      const conHoyo = (marker_by) => ({ holes: [{ ...hoyo(1), marker_score: 6, marker_submitted: true, marker_by }, ...Array.from({ length: 17 }, (_, i) => hoyo(i + 2))] });
      mockHook = hook({ scoringView: vista({}, [jugador('ana', 'bea'), jugador('bea', 'ana', conHoyo('ulises')), jugador('ulises', null, { card_status: 'RETIRADO' })]) });
      render(<GroupScoringPage />);

      expect(llamadas.casilla.markedScoredBy).toBe('ULISES');
    });

    it('QA 2: si lo puse yo, nada; si fue otro que ya no está, su nombre desde la API', async () => {
      const conHoyo = (marker_by, marker_by_name) => ({ holes: [{ ...hoyo(1), marker_score: 6, marker_submitted: true, marker_by, marker_by_name }, ...Array.from({ length: 17 }, (_, i) => hoyo(i + 2))] });
      mockHook = hook({ scoringView: vista({}, [jugador('ana', 'bea'), jugador('bea', 'ana', conHoyo('ana', 'Ana'))]) });
      const { unmount } = render(<GroupScoringPage />);
      expect(llamadas.casilla.markedScoredBy).toBeNull();
      unmount();

      mockHook = hook({ scoringView: vista({}, [jugador('ana', 'bea'), jugador('bea', 'ana', conHoyo('org', 'Paco Organizador'))]) });
      render(<GroupScoringPage />);
      expect(llamadas.casilla.markedScoredBy).toBe('Paco Organizador');
    });

    it('revisor: en solo lectura, «Te anotó» quien puso ese hoyo, no mi marcador de ahora', () => {
      const miHoyo = { holes: [{ ...hoyo(1), own_score: 5, own_submitted: true, marker_score: 5, marker_submitted: true, marker_by: 'ulises', marker_by_name: 'Ulises' }, ...Array.from({ length: 17 }, (_, i) => hoyo(i + 2))] };
      mockHook = hook({ scoringView: vista({}, [jugador('ana', 'bea', { marked_by_user_id: 'bea', ...miHoyo }), jugador('bea', 'ana')]) });
      render(<GroupScoringPage />);

      expect(llamadas.casilla.markerName).toBe('Ulises');
    });

    it('revisor: sin marcador ya, pero con números que me anotaron, la columna sigue', () => {
      const miHoyo = { holes: [{ ...hoyo(1), marker_score: 5, marker_submitted: true, marker_by: 'ulises', marker_by_name: 'Ulises' }, ...Array.from({ length: 17 }, (_, i) => hoyo(i + 2))] };
      mockHook = hook({ scoringView: vista({ i_mark_user_id: null }, [jugador('ana', null, { marked_by_user_id: null, ...miHoyo })]) });
      render(<GroupScoringPage />);

      expect(llamadas.casilla.hasMarker).toBe(true);
    });

    it('CodeRabbit: si quien me marcaba ya no juega y no me anotó este hoyo, sin columna', () => {
      mockHook = hook({ scoringView: vista({}, [jugador('ana', 'bea', { marked_by_user_id: 'bea' }), jugador('bea', 'ana', { card_status: 'RETIRADO' })]) });
      render(<GroupScoringPage />);

      expect(llamadas.casilla.hasMarker).toBe(false);
    });

    it('regresión: el organizador que no juega no publica «lo que anotes se guarda»', async () => {
      const { default: AvisoSinConexion } = await import('../../components/ui/AvisoSinConexion');
      mockHook = hook({ isOffline: true, isMatchPlayer: false, canScore: false });
      render(<><AvisoSinConexion /><GroupScoringPage /></>);

      expect(screen.queryByText(/sinConexion\.anotando/)).toBeNull();
    });

    it('revisor: sin vista aún (no se sabe quién juega), el aviso de anotar sale', async () => {
      const { default: AvisoSinConexion } = await import('../../components/ui/AvisoSinConexion');
      mockHook = hook({ scoringView: null, isOffline: true, isMatchPlayer: false, canScore: false });
      render(<><AvisoSinConexion /><GroupScoringPage /></>);

      expect(screen.getByTestId('aviso-sin-conexion')).toHaveTextContent('sinConexion.anotando');
    });

    it('revisor: sin red, se lo dice al aviso de arriba', async () => {
      const { default: AvisoSinConexion } = await import('../../components/ui/AvisoSinConexion');
      mockHook = hook({ isOffline: true, pendingQueueSize: 2 });
      render(<><AvisoSinConexion /><GroupScoringPage /></>);

      expect(screen.getByTestId('aviso-sin-conexion')).toHaveTextContent('sinConexion.anotando');
    });

    it('26: sin conexión, un solo aviso (no también el de «no se actualiza»)', () => {
      mockHook = hook({ isOffline: true, pintadoDeMemoria: true });
      render(<GroupScoringPage />);

      expect(screen.queryByTestId('pintado-de-memoria')).toBeNull();
    });
  });

  it('antes de que abra no se ofrece retirarse (revisor)', () => {
    mockHook = hook({ scoringView: vista({ status: 'SCHEDULED', scoring_opens_at: '2999-01-01T08:00:00+01:00' }) });
    render(<GroupScoringPage />);

    expect(screen.queryByRole('button', { name: 'partida.retire' })).toBeNull();
  });

  it('las pestañas controlan su panel (revisor)', () => {
    render(<GroupScoringPage />);

    const pestana = screen.getByTestId('tab-input');
    expect(pestana).toHaveAttribute('aria-controls', 'panel-input');
    expect(document.getElementById('panel-input')).toHaveAttribute('role', 'tabpanel');
  });

  it('11-12: las pestañas; la clasificación solo está activa con la suya abierta', () => {
    render(<GroupScoringPage />);
    expect(screen.getByTestId('clasificacion')).toHaveAttribute('data-activa', 'false');

    fireEvent.click(screen.getByTestId('tab-standings'));
    expect(screen.getByTestId('clasificacion')).toHaveAttribute('data-activa', 'true');
    expect(llamadas.clasificacion).toMatchObject({ roundId: 'r-1', userId: 'ana' });

    fireEvent.click(screen.getByTestId('tab-cards'));
    expect(screen.getByTestId('tarjetas')).toBeInTheDocument();
    expect(llamadas.tarjetas).toMatchObject({ userId: 'ana', organiza: false, onCambio: mockHook.refetch });
  });

  it('13: quien no juega no tiene Anotar, y abre en Tarjetas', () => {
    mockHook = hook({ isMatchPlayer: false, canScore: false });
    render(<GroupScoringPage />);

    expect(screen.queryByTestId('tab-input')).toBeNull();
    expect(screen.getByTestId('tarjetas')).toBeInTheDocument();
    expect(screen.queryByTestId('barra-de-entrega')).toBeNull();
  });

  it('15: el organizador de la competición tiene sus herramientas en Tarjetas', () => {
    mockRoles = { isAdmin: false, isCreator: true, isLoading: false };
    render(<GroupScoringPage />);
    fireEvent.click(screen.getByTestId('tab-cards'));

    expect(llamadas.tarjetas.organiza).toBe(true);
  });

  it('15c: un administrador también', () => {
    mockRoles = { isAdmin: true, isCreator: false, isLoading: false };
    render(<GroupScoringPage />);
    fireEvent.click(screen.getByTestId('tab-cards'));

    expect(llamadas.tarjetas.organiza).toBe(true);
  });

  it('15b: sin saber la competición (desde el aviso del panel), sin herramientas', () => {
    mockBusqueda = new URLSearchParams('');
    mockRoles = { isAdmin: false, isCreator: true, isLoading: false };
    render(<GroupScoringPage />);
    fireEvent.click(screen.getByTestId('tab-cards'));

    expect(llamadas.tarjetas.organiza).toBe(false);
    expect(screen.queryByRole('link', { name: /partida.backToCompetition/ })).toBeNull();
  });

  it('18: un fallo al anotar, traducido por su código', () => {
    mockHook = hook({ error: Object.assign(new Error('detail'), { errorCode: 'NOT_YOUR_MARKED_PLAYER' }), origenDelError: 'golpe' });
    render(<GroupScoringPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('partida.errors.NOT_YOUR_MARKED_PLAYER');
  });

  it('18b: retirarse falla: el motivo, traducido', async () => {
    mockRetirarse.mockRejectedValue(Object.assign(new Error('x'), { errorCode: 'GROUP_NOT_SCORING' }));
    render(<GroupScoringPage />);

    fireEvent.click(screen.getByRole('button', { name: 'partida.retire' }));
    fireEvent.click(screen.getByRole('button', { name: 'partida.retireYes' }));

    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith('partida.errors.GROUP_NOT_SCORING'));
  });
});

describe('GroupScoringPage — el mapa del hoyo (BE #532)', () => {
  beforeEach(() => {
    mockBusqueda = new URLSearchParams('competition=c-1');
    mockRoles = { isAdmin: false, isCreator: false, isLoading: false };
    mockHook = hook({ scoringView: vista({ golf_course_id: 'gc-1' }) });
    mapaHoyo.valor = { abierto: false, abrir: vi.fn(), cerrar: vi.fn(), mapaDelCampo: null };
    mapaHoyo.ventana = null;
  });

  it('pide el mapa del campo de lo que se anota', () => {
    render(<GroupScoringPage />);

    expect(mapaHoyo.args).toEqual({ golfCourseId: 'gc-1', cerrarSi: false });
  });

  it('16 oct: antes de abrir, dice a quién vas a marcar', () => {
    mockHook = hook({ scoringView: vista({ status: 'SCHEDULED', scoring_opens_at: '2999-01-01T08:00:00+01:00' }) });

    render(<GroupScoringPage />);

    expect(screen.getByTestId('anotaras-a')).toHaveTextContent('notOpenYet.youWillMark');
  });

  it('16 oct: antes de abrir y sin a quién marcar, ni la línea', () => {
    mockHook = hook({ scoringView: vista({ status: 'SCHEDULED', scoring_opens_at: '2999-01-01T08:00:00+01:00', i_mark_user_id: null }, [jugador('ana', null)]) });

    render(<GroupScoringPage />);

    expect(screen.queryByTestId('anotaras-a')).toBeNull();
  });

  it('16 oct: el campo de la partida, bajo el título; sin nombre, ni la línea', () => {
    mockHook = hook({ scoringView: vista({ golf_course_name: 'Golf de Meis - Par 72' }) });
    const { unmount } = render(<GroupScoringPage />);
    expect(screen.getByTestId('campo-de-la-partida')).toHaveTextContent('Golf de Meis - Par 72');
    unmount();

    mockHook = hook();
    render(<GroupScoringPage />);
    expect(screen.queryByTestId('campo-de-la-partida')).toBeNull();
  });

  it('T2 (16 oct): «Mapa» va entre Anterior y Siguiente, y lo abre', () => {
    render(<GroupScoringPage />);

    const boton = screen.getByRole('button', { name: 'mapa.abrir' });
    expect(boton.previousElementSibling).toHaveTextContent('input.prevHole');
    expect(boton.nextElementSibling).toHaveTextContent('input.nextHole');
    fireEvent.click(boton);
    expect(mapaHoyo.valor.abrir).toHaveBeenCalled();
  });

  it('la ventana del mapa recibe el hoyo que se anota', () => {
    render(<GroupScoringPage />);

    expect(mapaHoyo.ventana).toMatchObject({ golfCourseId: 'gc-1', numeroDeHoyo: 1, par: 4 });
    expect(mapaHoyo.ventana.mapaDelHoyo).toBe(mapaHoyo.valor);
  });

  it('F12 (16 oct): el mapa recibe los metros del hoyo desde MI barra', () => {
    const conMetros = (id, marks, base) =>
      jugador(id, marks, { holes: Array.from({ length: 18 }, (_, i) => ({ ...hoyo(i + 1), meters: base + i })) });
    mockHook = hook({ scoringView: vista({}, [conMetros('ana', 'bea', 300), conMetros('bea', 'ana', 250)]) });

    render(<GroupScoringPage />);

    expect(mapaHoyo.ventana.metros).toBe(300);
  });

  it('F12: sin metros en la vista, el mapa recibe null', () => {
    render(<GroupScoringPage />);

    expect(mapaHoyo.ventana.metros).toBeNull();
  });

  it('T1: en la tarjeta no se pide el GPS', () => {
    const watchPosition = vi.fn();
    vi.stubGlobal('navigator', { ...globalThis.navigator, geolocation: { watchPosition, clearWatch: vi.fn() } });
    try {
      render(<GroupScoringPage />);
    } finally {
      vi.unstubAllGlobals();
    }

    expect(watchPosition).not.toHaveBeenCalled();
  });
});

describe('GroupScoringPage — sesión tomada con el mapa abierto', () => {
  it('el mapa se cierra para que «Volver» salga de la anotación', () => {
    mockBusqueda = new URLSearchParams('competition=c-1');
    mockRoles = { isAdmin: false, isCreator: false, isLoading: false };
    mockHook = hook({ isSessionBlocked: true });

    render(<GroupScoringPage />);

    expect(mapaHoyo.args.cerrarSi).toBe(true);
  });
});
