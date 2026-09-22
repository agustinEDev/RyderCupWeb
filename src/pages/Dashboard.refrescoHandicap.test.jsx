import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, cleanup, fireEvent } from '@testing-library/react';

/**
 * El refresco del hándicap al entrar, en segundo plano (FE #677).
 *
 * El login lo hacía antes de contestar y esperaba a la RFEG: hasta 20 s, y el
 * 21 sep un minuto (RyderCupAM#340). Ahora el login lo LANZA sin esperarlo, y
 * el panel solo abre el modal cuando el resultado lo pide, o lo relanza si el
 * apunte sigue puesto. Aquí va con el módulo de verdad, solo con la API falsa.
 */

const refresco = vi.fn();
vi.mock('../composition', () => ({
  listUserCompetitionsUseCase: { execute: () => Promise.resolve([]) },
  getPlayerStatsUseCase: { execute: () => Promise.resolve(null) },
  getRecentMatchesUseCase: { execute: () => Promise.resolve([]) },
  getUpcomingMatchesUseCase: {
    executeWithCompleteness: () => Promise.resolve({ matches: [], complete: true }),
  },
  getScoringViewUseCase: { execute: () => new Promise(() => {}) },
  refreshOwnHandicapUseCase: { execute: (...args) => refresco(...args) },
}));

const consultaSesion = vi.fn();
vi.mock('../services/sesionCompartida', async () => ({
  ...(await vi.importActual('../services/sesionCompartida')),
  consultaLaSesion: (...args) => consultaSesion(...args),
}));

const recargarUsuario = vi.fn();
// Objeto CONSTANTE: los efectos del panel dependen de `user`, y uno nuevo en
// cada render los relanzaría sin parar
const sesion = {
  user: { id: 'u-1', first_name: 'Ana', email: 'a@b.c', country_code: 'ES', handicap: 12.4 },
  loading: false,
  refetch: (...args) => recargarUsuario(...args),
};
vi.mock('../hooks/useAuth', () => ({ useAuth: () => sesion }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (clave) => clave, i18n: { language: 'es' }, ready: true }),
}));

vi.mock('react-router', () => ({
  useNavigate: () => () => {},
  useLocation: () => ({ pathname: '/dashboard' }),
  Navigate: () => null,
}));

// Un componente ESTABLE por etiqueta: si cada acceso devolviera uno nuevo, React
// lo tomaría por otro tipo y remontaría el panel entero en cada render, dejando
// desconectado lo que el test acaba de encontrar
vi.mock('framer-motion', () => {
  const Caja = ({ children }) => <div>{children}</div>;
  return { motion: new Proxy({}, { get: () => Caja }) };
});

vi.mock('../hooks/useEntryMotion', () => ({ useEntryMotion: () => ({ animateEntry: false }) }));

// Deja rastro de con qué se abre: lo que se mira es el motivo
vi.doMock('../components/profile/HandicapRequestModal', () => ({
  default: ({ isOpen, handicapActual }) =>
    isOpen ? <div data-testid="modal-handicap" data-handicap={String(handicapActual)} /> : null,
}));

// Deja rastro del recordatorio y un botón para abrir el modal desde él
vi.doMock('../components/dashboard/PendingActionsCard', () => ({
  default: ({ handicapPending, onHandicapAction }) => (
    <div data-testid="recordatorio" data-pendiente={String(handicapPending)}>
      <button type="button" onClick={onHandicapAction}>configurar</button>
    </div>
  ),
}));

for (const ruta of [
  '../components/layout/HeaderAuth',
  '../components/ui/Avatar',
  '../components/EmailVerificationBanner',
  '../components/dashboard/PlayerStatsCards',
  '../components/dashboard/NextMatchBanner',
  '../components/dashboard/RecentMatches',
  '../components/quick_match/CreateQuickMatchModal',
  '../components/ui/FullScreenLoader',
]) {
  vi.doMock(ruta, () => ({ default: () => null }));
}

const guardado = {};
globalThis.localStorage = {
  getItem: (clave) => guardado[clave] ?? null,
  setItem: (clave, valor) => {
    guardado[clave] = String(valor);
  },
  removeItem: (clave) => {
    delete guardado[clave];
  },
  clear: () => {
    for (const clave of Object.keys(guardado)) delete guardado[clave];
  },
};

const Dashboard = (await import('./Dashboard')).default;
const { reiniciaElRefrescoDeHandicap } = await import('../services/refrescoDeHandicap');

const panelPintado = () => screen.findByText('quickActions.title');

describe('Dashboard · refresco del hándicap al entrar (FE #677)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Una petición colgada de un test no puede quedarse "en vuelo" para el siguiente
    reiniciaElRefrescoDeHandicap();
  });

  // Sin esto el panel del test anterior sigue montado y `findByText` encuentra
  // su copia, ya desmontada: pasa solo y falla en grupo
  afterEach(cleanup);

  it('D1: con el apunte pendiente, lo relanza una vez; si no hace falta pedirlo y cambió, recarga la sesión y no abre nada', async () => {
    localStorage.setItem('refrescar_handicap', 'true');
    refresco.mockResolvedValue({ needsHandicap: false, handicap: 18 });

    render(<Dashboard />);

    await waitFor(() => expect(consultaSesion).toHaveBeenCalledWith({ forzar: true }));
    expect(refresco).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('modal-handicap')).not.toBeInTheDocument();
    expect(localStorage.getItem('refrescar_handicap')).toBeNull();
  });

  it('D2: si hace falta y no tiene ninguno, abre el modal sin hándicap', async () => {
    localStorage.setItem('refrescar_handicap', 'true');
    refresco.mockResolvedValue({ needsHandicap: true, handicap: null });

    render(<Dashboard />);

    expect(await screen.findByTestId('modal-handicap')).toHaveAttribute('data-handicap', 'null');
  });

  it('D3: si hace falta y ya tiene uno, el modal lo sabe', async () => {
    localStorage.setItem('refrescar_handicap', 'true');
    refresco.mockResolvedValue({ needsHandicap: true, handicap: 18 });

    render(<Dashboard />);

    expect(await screen.findByTestId('modal-handicap')).toHaveAttribute('data-handicap', '18');
  });

  it('D4: sin el apunte no lo pide', async () => {
    render(<Dashboard />);

    await panelPintado();
    expect(refresco).not.toHaveBeenCalled();
  });

  it('D5: si nuestra API falla no afirma nada, y el apunte se queda para la próxima', async () => {
    localStorage.setItem('refrescar_handicap', 'true');
    refresco.mockRejectedValue(new Error('sin cobertura'));

    render(<Dashboard />);

    await waitFor(() => expect(refresco).toHaveBeenCalled());
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.queryByTestId('modal-handicap')).not.toBeInTheDocument();
    expect(localStorage.getItem('refrescar_handicap')).toBe('true');
  });

  it('D6: una RFEG que no contesta no retiene el panel', async () => {
    localStorage.setItem('refrescar_handicap', 'true');
    refresco.mockReturnValue(new Promise(() => {}));

    render(<Dashboard />);

    expect(await panelPintado()).toBeInTheDocument();
  });

  it('D8: si la RFEG devuelve el mismo hándicap, no recarga el usuario', async () => {
    // Recargarlo relanza las cuatro peticiones del panel: en el refresco diario
    // de siempre, que devuelve lo mismo, eso es pedirlo todo dos veces
    localStorage.setItem('refrescar_handicap', 'true');
    refresco.mockResolvedValue({ needsHandicap: false, handicap: 12.4 });

    render(<Dashboard />);

    await waitFor(() => expect(localStorage.getItem('refrescar_handicap')).toBeNull());
    expect(consultaSesion).not.toHaveBeenCalled();
  });

  it('D9: si el usuario cambia con el refresco en vuelo, se pide una sola vez y no se pierde la respuesta', async () => {
    localStorage.setItem('refrescar_handicap', 'true');
    let responder;
    refresco.mockReturnValue(new Promise((resolver) => { responder = resolver; }));

    const { rerender } = render(<Dashboard />);
    await waitFor(() => expect(refresco).toHaveBeenCalledTimes(1));

    // Llega el usuario recién pedido: otro objeto, mismos datos
    const anterior = sesion.user;
    sesion.user = { ...anterior };
    rerender(<Dashboard />);
    await act(async () => {
      responder({ needsHandicap: true, handicap: null });
    });

    try {
      expect(refresco).toHaveBeenCalledTimes(1);
      expect(await screen.findByTestId('modal-handicap')).toBeInTheDocument();
    } finally {
      sesion.user = anterior;
    }
  });

  it('D10: si falló, se vuelve a intentar cuando cambia el usuario, sin esperar a otro montaje', async () => {
    localStorage.setItem('refrescar_handicap', 'true');
    refresco.mockRejectedValueOnce(new Error('sin cobertura'));
    refresco.mockResolvedValueOnce({ needsHandicap: true, handicap: null });

    const { rerender } = render(<Dashboard />);
    await waitFor(() => expect(refresco).toHaveBeenCalledTimes(1));
    await act(async () => {
      await Promise.resolve();
    });

    const anterior = sesion.user;
    sesion.user = { ...anterior };
    try {
      rerender(<Dashboard />);
      expect(await screen.findByTestId('modal-handicap')).toBeInTheDocument();
      expect(refresco).toHaveBeenCalledTimes(2);
    } finally {
      sesion.user = anterior;
    }
  });

  it('D11: si el panel se cierra antes de la respuesta, el siguiente la encuentra', async () => {
    // Nadie ha visto el resultado todavía: se guarda y lo abre el próximo panel
    localStorage.setItem('refrescar_handicap', 'true');
    let responder;
    refresco.mockReturnValue(new Promise((resolver) => { responder = resolver; }));

    const { unmount } = render(<Dashboard />);
    await waitFor(() => expect(refresco).toHaveBeenCalledTimes(1));
    unmount();
    await act(async () => {
      responder({ needsHandicap: true, handicap: null });
    });
    render(<Dashboard />);

    expect(await screen.findByTestId('modal-handicap')).toBeInTheDocument();
    expect(refresco).toHaveBeenCalledTimes(1);
  });

  it('D14: si el login lo lanzó y se fue a otra página, al abrir el panel sale el modal sin volver a pedirlo', async () => {
    localStorage.setItem('pedir_handicap', JSON.stringify({ handicap: 18 }));

    render(<Dashboard />);

    expect(await screen.findByTestId('modal-handicap')).toHaveAttribute('data-handicap', '18');
    expect(refresco).not.toHaveBeenCalled();
    expect(localStorage.getItem('pedir_handicap')).toBeNull();
  });

  it('D12: un 4xx no se va a arreglar solo: se borra el apunte y no se reintenta', async () => {
    // Un 404 (el endpoint no existe, o el usuario ya no) repetido en cada
    // visita al panel sería un POST fallido tras otro, para nada
    localStorage.setItem('refrescar_handicap', 'true');
    refresco.mockRejectedValue(Object.assign(new Error('Not Found'), { status: 404 }));

    const { rerender } = render(<Dashboard />);
    await waitFor(() => expect(localStorage.getItem('refrescar_handicap')).toBeNull());

    const anterior = sesion.user;
    sesion.user = { ...anterior };
    try {
      rerender(<Dashboard />);
      await act(async () => {
        await Promise.resolve();
      });
      expect(refresco).toHaveBeenCalledTimes(1);
    } finally {
      sesion.user = anterior;
    }
  });

  it('D13: un 5xx sí puede arreglarse solo: el apunte se queda', async () => {
    localStorage.setItem('refrescar_handicap', 'true');
    refresco.mockRejectedValue(Object.assign(new Error('Service Unavailable'), { status: 503 }));

    render(<Dashboard />);

    await waitFor(() => expect(refresco).toHaveBeenCalled());
    await act(async () => {
      await Promise.resolve();
    });
    expect(localStorage.getItem('refrescar_handicap')).toBe('true');
  });

  it('D7: un apunte viejo de needs_handicap ya no abre nada por sí solo', async () => {
    // Lo escribía la versión anterior; su información es de otro día
    localStorage.setItem('needs_handicap', 'true');

    render(<Dashboard />);

    await panelPintado();
    expect(screen.queryByTestId('modal-handicap')).not.toBeInTheDocument();
    expect(localStorage.getItem('needs_handicap')).toBeNull();
  });

  it('D15: si un refresco dice que ya no hace falta, el recordatorio se retira con el panel abierto', async () => {
    localStorage.setItem('handicap_pending', 'true');
    localStorage.setItem('refrescar_handicap', 'true');
    refresco.mockResolvedValue({ needsHandicap: false, handicap: 12.4 });

    render(<Dashboard />);

    await waitFor(() =>
      expect(screen.getByTestId('recordatorio')).toHaveAttribute('data-pendiente', 'false')
    );
  });

  it('D16: abrir el modal desde el recordatorio le pasa el hándicap guardado', async () => {
    // Tras una recarga no hay resultado de refresco a mano: sin esto, el modal
    // volvía a decir «no tienes hándicap» a quien tiene 12.4
    localStorage.setItem('handicap_pending', 'true');

    render(<Dashboard />);
    fireEvent.click(await screen.findByText('configurar'));

    expect(await screen.findByTestId('modal-handicap')).toHaveAttribute('data-handicap', '12.4');
  });
});
