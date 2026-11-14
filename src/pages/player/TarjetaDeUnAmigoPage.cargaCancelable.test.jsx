import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router';
import TarjetaDeUnAmigoPage from './TarjetaDeUnAmigoPage';

/**
 * La tarjeta de un amigo descarta lo que llega tarde (T2).
 *
 *   #      caso                                                 | qué pasa
 *   -------|------------------------------------------------------|-----------------------------------------
 *   T2-12  cambia la partida                                    | la espera (nunca la de fallo) hasta que llega la nueva
 *   T2-12b la vista llega vacía                                 | la pantalla sin tarjeta (Reintentar/Volver), no la espera
 *   T2-13  la tarjeta pintada cambia (onCambio)                 | sin espera, la tarjeta al día
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) =>
      opts?.number !== undefined ? `${key} ${opts.number}` : key,
    i18n: { language: 'es' },
  }),
}));
vi.mock('../../hooks/useAuth', () => {
  const user = { id: 'me' };
  return { useAuth: () => ({ user, loading: false }) };
});
vi.mock('../../components/layout/HeaderAuth', () => ({
  default: () => <header data-testid="header" />,
}));
vi.mock('../../components/scoring/TarjetasDeLaPartida', () => ({
  default: ({ scoringView, onCambio }) => (
    <div
      data-testid="tarjetas-de-la-partida"
      data-numero={scoringView.matchNumber}
    >
      <button type="button" data-testid="cambia" onClick={onCambio} />
    </div>
  ),
}));
const verPartida = vi.fn();
vi.mock('../../composition', () => ({
  getTeeGroupScoringViewUseCase: { execute: (...a) => verPartida(...a) },
  getScoringViewUseCase: { execute: vi.fn() },
}));

const aMano = () => {
  let resolver;
  let rechazar;
  const promesa = new Promise((res, rej) => {
    resolver = res;
    rechazar = rej;
  });
  return { promesa, resolver, rechazar };
};
const vista = (matchNumber) => ({
  matchId: 'g',
  matchNumber,
  players: [{ userId: 'u2', name: 'u2' }],
  holes: [],
  scores: [],
  withdrawnPlayerIds: [],
});
const fallo = (status) => Object.assign(new Error('x'), { status });

const Saltar = () => {
  const navegar = useNavigate();
  return (
    <button
      type="button"
      data-testid="saltar"
      onClick={() => navegar('/competitions/c-1/groups/g-9')}
    />
  );
};
const pinta = () =>
  render(
    <MemoryRouter initialEntries={['/competitions/c-1/groups/g-7']}>
      <Saltar />
      <Routes>
        <Route
          path="/competitions/:id/groups/:groupId"
          element={<TarjetaDeUnAmigoPage tipo="partida" />}
        />
      </Routes>
    </MemoryRouter>,
  );
const enEspera = () => screen.queryByRole('status');
const conFallo = () =>
  screen.queryByTestId('tarjeta-error') ||
  screen.queryByTestId('tarjeta-no-existe') ||
  screen.queryByTestId('tarjeta-prohibida');

// Apunta toda pantalla de fallo que llegue a pintarse, aunque sea un instante
// y se quite en el mismo act: lo que se mira después ya no la vería
const FALLOS = ['tarjeta-error', 'tarjeta-no-existe', 'tarjeta-prohibida'];
const vigilaLosFallos = () => {
  const vistos = [];
  const apunta = (cambios) => {
    for (const cambio of cambios) {
      for (const nodo of cambio.addedNodes) {
        if (nodo.nodeType !== 1) continue;
        for (const el of [nodo, ...nodo.querySelectorAll('[data-testid]')]) {
          if (FALLOS.includes(el.dataset?.testid))
            vistos.push(el.dataset.testid);
        }
      }
    }
  };
  const observador = new globalThis.MutationObserver(apunta);
  observador.observe(document.body, { childList: true, subtree: true });
  return {
    vistos: () => {
      apunta(observador.takeRecords());
      return vistos;
    },
    deja: () => observador.disconnect(),
  };
};

describe('TarjetaDeUnAmigoPage: la carga descarta lo que llega tarde (T2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Sin respuestas de un caso que se queden para el siguiente
    verPartida.mockReset();
  });

  it('T2-12: al cambiar de partida, la espera y nunca la pantalla de fallo hasta que llega la nueva', async () => {
    const nueva = aMano();
    verPartida
      .mockResolvedValueOnce(vista(3))
      .mockReturnValueOnce(nueva.promesa);
    pinta();
    await screen.findByTestId('tarjetas-de-la-partida');
    const fallos = vigilaLosFallos();

    fireEvent.click(screen.getByTestId('saltar'));
    expect(enEspera()).toBeInTheDocument();
    expect(conFallo()).toBeNull();
    await act(async () => {});
    expect(enEspera()).toBeInTheDocument();
    expect(conFallo()).toBeNull();
    // Ni un instante, en ningún pintado intermedio
    expect(fallos.vistos()).toEqual([]);
    fallos.deja();

    await act(async () => nueva.resolver(vista(9)));
    expect(screen.getByTestId('tarjetas-de-la-partida')).toHaveAttribute(
      'data-numero',
      '9',
    );
  });

  it('T2-12: desde una que falló, al cambiar de partida se espera, sin el fallo de la anterior', async () => {
    const nueva = aMano();
    verPartida
      .mockRejectedValueOnce(fallo(500))
      .mockReturnValueOnce(nueva.promesa);
    pinta();
    await screen.findByTestId('tarjeta-error');

    fireEvent.click(screen.getByTestId('saltar'));

    expect(enEspera()).toBeInTheDocument();
    expect(conFallo()).toBeNull();
    await act(async () => nueva.resolver(vista(9)));
    expect(screen.getByTestId('tarjetas-de-la-partida')).toHaveAttribute(
      'data-numero',
      '9',
    );
  });

  it('T2-12: el fallo tardío de la anterior no saca la pantalla de fallo en la nueva', async () => {
    const vieja = aMano();
    const nueva = aMano();
    verPartida
      .mockReturnValueOnce(vieja.promesa)
      .mockReturnValueOnce(nueva.promesa);
    pinta();

    fireEvent.click(screen.getByTestId('saltar'));
    await act(async () => vieja.rechazar(fallo(404)));

    expect(enEspera()).toBeInTheDocument();
    expect(conFallo()).toBeNull();
    await act(async () => nueva.resolver(vista(9)));
    expect(screen.getByTestId('tarjetas-de-la-partida')).toHaveAttribute(
      'data-numero',
      '9',
    );
  });

  it('T2-12b: si la vista llega vacía, sale la pantalla sin tarjeta con Reintentar y Volver, no la espera', async () => {
    verPartida.mockResolvedValueOnce(null).mockResolvedValueOnce(vista(3));
    pinta();
    await act(async () => {});

    expect(enEspera()).toBeNull();
    expect(screen.getByTestId('tarjeta-error')).toBeInTheDocument();
    expect(screen.getByTestId('tarjeta-volver')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('tarjeta-reintentar'));
    await act(async () => {});
    expect(screen.getByTestId('tarjetas-de-la-partida')).toHaveAttribute(
      'data-numero',
      '3',
    );
  });

  it('T2-13: si la tarjeta pintada cambia, se relee sin espera y queda al día', async () => {
    const relectura = aMano();
    verPartida
      .mockResolvedValueOnce(vista(3))
      .mockReturnValueOnce(relectura.promesa);
    pinta();
    await screen.findByTestId('tarjetas-de-la-partida');

    fireEvent.click(screen.getByTestId('cambia'));

    expect(verPartida).toHaveBeenCalledTimes(2);
    expect(enEspera()).toBeNull();
    expect(screen.getByTestId('tarjetas-de-la-partida')).toHaveAttribute(
      'data-numero',
      '3',
    );
    await act(async () => relectura.resolver(vista(4)));
    expect(screen.getByTestId('tarjetas-de-la-partida')).toHaveAttribute(
      'data-numero',
      '4',
    );
  });
});
