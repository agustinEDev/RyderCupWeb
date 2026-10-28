/**
 * La tarjeta de un amigo con las piezas de verdad (revisor de la PR 4): la vista
 * del mapper, tal cual, en `TarjetasDeLaPartida` sin organizar. Nada para anotar
 * ni para corregir: solo leer.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import TeeGroupScoringMapper from '../../infrastructure/mappers/TeeGroupScoringMapper';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key, i18n: { language: 'es' } }),
}));
vi.mock('../../hooks/useAuth', () => {
  const user = { id: 'me' };
  return { useAuth: () => ({ user, loading: false }) };
});
vi.mock('../../components/layout/HeaderAuth', () => ({ default: () => <header /> }));

const hoyo = (n) => ({
  hole: n, par: 4, strokes_received: 0, own_score: n === 1 ? 5 : null, own_submitted: n === 1,
  marker_score: n === 1 ? 5 : null, marker_submitted: n === 1, status: n === 1 ? 'VALIDATED' : 'PENDING',
});
const jugador = (id, marca) => ({
  user_id: id, name: id.toUpperCase(), playing_handicap: 10, tee_color: 'YELLOW', tee_gender: 'MALE',
  marks_user_id: marca, holes: Array.from({ length: 18 }, (_, i) => hoyo(i + 1)),
});
const VISTA = TeeGroupScoringMapper.toScoringViewDTO({
  group_id: 'g-7', round_id: 'r-1', golf_course_id: 'gc-1', number: 3, tee_time: '09:20',
  status: 'IN_PROGRESS', scoring_opens_at: null, tournament_type: 'STABLEFORD', picked_up_allowed: true,
  i_mark_user_id: null, players: [jugador('u2', 'u3'), jugador('u3', 'u2')],
});

vi.mock('../../composition', async (importOriginal) => ({
  ...(await importOriginal()),
  getTeeGroupScoringViewUseCase: { execute: () => Promise.resolve(VISTA) },
}));

const { default: TarjetaDeUnAmigoPage } = await import('./TarjetaDeUnAmigoPage');

const pinta = (ruta) =>
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/competitions/:id/groups/:groupId" element={<TarjetaDeUnAmigoPage tipo="partida" />} />
      </Routes>
    </MemoryRouter>
  );

describe('TarjetaDeUnAmigoPage — con las tarjetas de verdad', () => {
  it('pinta las de los dos, sin un solo botón salvo Volver', async () => {
    pinta('/competitions/c-1/groups/g-7?jugador=u2');

    expect(await screen.findByText('U2')).toBeInTheDocument();
    expect(screen.getByText('U3')).toBeInTheDocument();
    const botones = screen.queryAllByRole('button').filter((b) => b.dataset.testid !== 'tarjeta-volver');
    expect(botones.map((b) => b.textContent)).toEqual([]);
  });

  it('un jugador que no está en la partida no rompe nada', async () => {
    pinta('/competitions/c-1/groups/g-7?jugador=otro');

    expect(await screen.findByText('U2')).toBeInTheDocument();
  });
});
