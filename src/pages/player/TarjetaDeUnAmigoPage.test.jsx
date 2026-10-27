/**
 * La tarjeta de un amigo, en solo lectura (release social 2, tabla del 27 oct 2026).
 *
 * | #   | Caso                                              | Resultado                                  |
 * |-----|---------------------------------------------------|--------------------------------------------|
 * | F4  | Partida de stroke play de un amigo                | Sus tarjetas, sin anotar; la suya, marcada |
 * | F4  | Partido de Ryder de un amigo                      | La tarjeta del partido, sin anotar         |
 * | F4  | «Ver clasificación»                               | A la clasificación, en su fila             |
 * | F10 | Quien mira juega en ella                          | A su anotación                             |
 * | F6  | 403 (ningún amigo con evento juega en ella)        | «Solo la ven quienes participan» + Volver  |
 * | -   | 404 / otro fallo                                  | No existe / reintentar                     |
 * | -   | No anota: ni el hook de anotación ni su sondeo    | Una sola carga                             |
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import TarjetaDeUnAmigoPage from './TarjetaDeUnAmigoPage';
import es from '../../i18n/locales/es/scoring.json';
import en from '../../i18n/locales/en/scoring.json';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => (opts?.number !== undefined ? `${key} ${opts.number}` : key),
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

// La de solo lectura no anota: si tocara el hook de anotación (sondeo, cola
// sin conexión), este test lo diría
vi.mock('../../hooks/useScoring', () => ({
  useScoring: () => {
    throw new Error('read-only must not use the scoring hook');
  },
}));

const tarjetas = vi.fn();
vi.mock('../../components/scoring/TarjetasDeLaPartida', () => ({
  default: (props) => {
    tarjetas(props);
    return <div data-testid="tarjetas-de-la-partida" data-user={props.userId} />;
  },
}));

const tarjetaRyder = vi.fn();
vi.mock('../../components/scoring/ScorecardTable', () => ({
  default: (props) => {
    tarjetaRyder(props);
    return <div data-testid="scorecard-table" data-user={props.currentUserId} />;
  },
}));

const verPartida = vi.fn();
const verPartido = vi.fn();
vi.mock('../../composition', () => ({
  getTeeGroupScoringViewUseCase: { execute: (...a) => verPartida(...a) },
  getScoringViewUseCase: { execute: (...a) => verPartido(...a) },
}));

const vista = (jugadores = ['u2', 'u3'], extra = {}) => ({
  matchId: 'g-7',
  matchNumber: 3,
  players: jugadores.map((userId) => ({ userId, name: userId })),
  holes: [],
  scores: [],
  teamAName: 'Europa',
  teamBName: 'América',
  matchFormat: 'SINGLES',
  withdrawnPlayerIds: [],
  ...extra,
});

const fallo = (status) => Object.assign(new Error('x'), { status });

const Donde = () => {
  const location = useLocation();
  return <div data-testid="donde">{`${location.pathname}${location.search}`}</div>;
};

const pinta = (ruta) =>
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/competitions/:id/groups/:groupId" element={<TarjetaDeUnAmigoPage tipo="partida" />} />
        <Route path="/competitions/:id/matches/:matchId" element={<TarjetaDeUnAmigoPage tipo="partido" />} />
        <Route path="*" element={<Donde />} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TarjetaDeUnAmigoPage — una partida de stroke play', () => {
  it('F4: sus tarjetas, sin anotar, con la de su amigo marcada', async () => {
    verPartida.mockResolvedValue(vista());

    pinta('/competitions/c-1/groups/g-7?jugador=u2');

    expect(await screen.findByTestId('tarjetas-de-la-partida')).toHaveAttribute('data-user', 'u2');
    expect(verPartida).toHaveBeenCalledWith('g-7');
    expect(tarjetas).toHaveBeenLastCalledWith(expect.objectContaining({ organiza: false }));
    expect(screen.getByTestId('tarjeta-solo-lectura')).toBeInTheDocument();
  });

  it('F4: «Ver clasificación» lleva a la clasificación, en su fila', async () => {
    verPartida.mockResolvedValue(vista());
    pinta('/competitions/c-1/groups/g-7?jugador=u2');

    fireEvent.click(await screen.findByTestId('tarjeta-ver-clasificacion'));

    expect(screen.getByTestId('donde')).toHaveTextContent('/competitions/c-1/leaderboard?jugador=u2');
  });

  it('F10: quien juega en ella va a su anotación', async () => {
    verPartida.mockResolvedValue(vista(['u2', 'me']));

    pinta('/competitions/c-1/groups/g-7?jugador=u2');

    expect(await screen.findByTestId('donde')).toHaveTextContent(
      '/player/groups/g-7/scoring?competition=c-1'
    );
  });

  it('sin decir de quién, ninguna marcada', async () => {
    verPartida.mockResolvedValue(vista());

    pinta('/competitions/c-1/groups/g-7');

    expect(await screen.findByTestId('tarjetas-de-la-partida')).not.toHaveAttribute('data-user');
  });
});

describe('TarjetaDeUnAmigoPage — un partido de Ryder', () => {
  it('F4: la tarjeta del partido, sin anotar, con su amigo', async () => {
    verPartido.mockResolvedValue(vista(['u2', 'u3'], { scores: [{ holeNumber: 1 }] }));

    pinta('/competitions/c-1/matches/m-9?jugador=u2');

    expect(await screen.findByTestId('scorecard-table')).toHaveAttribute('data-user', 'u2');
    expect(verPartido).toHaveBeenCalledWith('m-9');
    expect(tarjetaRyder).toHaveBeenLastCalledWith(
      expect.objectContaining({ scores: [{ holeNumber: 1 }], teamAName: 'Europa' })
    );
  });

  it('F10: quien juega en él va a su anotación', async () => {
    verPartido.mockResolvedValue(vista(['me', 'u2']));

    pinta('/competitions/c-1/matches/m-9?jugador=u2');

    expect(await screen.findByTestId('donde')).toHaveTextContent('/player/matches/m-9/scoring');
  });
});

describe('TarjetaDeUnAmigoPage — lo que no se puede ver', () => {
  it('F6: 403, «solo la ven quienes participan», con Volver', async () => {
    verPartida.mockRejectedValue(fallo(403));

    pinta('/competitions/c-1/groups/g-7?jugador=u2');

    expect(await screen.findByTestId('tarjeta-prohibida')).toHaveTextContent('friendCard.forbidden');
    expect(screen.getByTestId('tarjeta-volver')).toBeInTheDocument();
  });

  it('404: no existe', async () => {
    verPartido.mockRejectedValue(fallo(404));

    pinta('/competitions/c-1/matches/m-9');

    expect(await screen.findByTestId('tarjeta-no-existe')).toBeInTheDocument();
  });

  it('otro fallo: se reintenta', async () => {
    verPartida.mockRejectedValueOnce(fallo(500)).mockResolvedValueOnce(vista());
    pinta('/competitions/c-1/groups/g-7?jugador=u2');

    fireEvent.click(await screen.findByTestId('tarjeta-reintentar'));

    expect(await screen.findByTestId('tarjetas-de-la-partida')).toBeInTheDocument();
    expect(verPartida).toHaveBeenCalledTimes(2);
  });
});

describe('TarjetaDeUnAmigoPage — textos', () => {
  it.each([
    ['es', es],
    ['en', en],
  ])('%s: todos los de la pantalla', (_, textos) => {
    for (const clave of ['readOnly', 'forbidden', 'notFound', 'error', 'retry', 'back', 'standings', 'groupTitle', 'matchTitle']) {
      expect(textos.friendCard[clave]).toBeTruthy();
    }
  });

  it('es: «Esta partida solo la ven quienes participan»', () => {
    expect(es.friendCard.forbidden).toBe('Esta partida solo la ven quienes participan');
  });
});
