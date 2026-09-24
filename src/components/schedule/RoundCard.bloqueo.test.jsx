import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (clave) => clave }),
}));
vi.mock('../golf_course/TeeColorBadge', () => ({
  default: ({ color }) => <span>{color}</span>,
}));

import RoundCard from './RoundCard';

/**
 * La sesión del calendario cuenta por qué no tiene partidos (BE #361), sin
 * tener que desplegarla: es lo primero que el organizador tiene que ver.
 *
 *   #   caso                                          | qué pasa
 *   ----|---------------------------------------------|--------------------------
 *   R1  esperando partidos y con motivo               | el motivo, y «Generar» para reintentar
 *   R2  sin motivo                                    | nada
 */

const RONDA = {
  id: 'r1',
  roundDate: '2026-10-03',
  sessionType: 'MORNING',
  matchFormat: 'SINGLES',
  status: 'PENDING_MATCHES',
  golfCourseId: 'g1',
  matches: [],
  matchGenerationBlock: {
    reason: 'PLAYERS_WITHOUT_TEE',
    players: [{ userId: 'u1', name: 'Bea Dos', missing: 'GENDER', teeColor: null }],
  },
};

const pintar = (ronda) =>
  render(
    <RoundCard
      round={ronda}
      canEdit
      isExpanded={false}
      onToggleExpand={() => {}}
      onGenerateMatches={() => {}}
      golfCourses={[{ id: 'g1', name: 'Altea' }]}
      playerNameMap={{}}
      playerHandicapMap={{}}
      teamNames={{}}
      t={(clave) => clave}
    />
  );

describe('RoundCard · por qué no tiene partidos', () => {
  it('R1: enseña el motivo sin desplegarla, y «Generar» sigue para reintentar', () => {
    pintar(RONDA);

    expect(screen.getByTestId('bloqueo-de-partidos')).toHaveTextContent('Bea Dos');
    expect(screen.getByTitle('matches.generate')).toBeInTheDocument();
  });

  it('R2: sin motivo no hay aviso', () => {
    pintar({ ...RONDA, matchGenerationBlock: null });

    expect(screen.queryByTestId('bloqueo-de-partidos')).not.toBeInTheDocument();
  });

  it('R3: a quien solo mira no le manda a pulsar nada', () => {
    render(
      <RoundCard
        round={RONDA}
        canEdit={false}
        isExpanded={false}
        onToggleExpand={() => {}}
        golfCourses={[]}
        playerNameMap={{}}
        playerHandicapMap={{}}
        teamNames={{}}
        t={(clave) => clave}
      />
    );

    expect(screen.getByTestId('bloqueo-de-partidos')).not.toHaveTextContent('generationBlock.retry');
  });
});


/**
 * En modo Ryder, «Generar» solo como reintento (FE #711). Antes de abrirse los
 * sobres empareja por hándicap, y con los partidos hechos los capitanes ya no
 * pueden entregar: los sobres se saltaban sin querer.
 *
 *   #   caso                                               | «Generar»
 *   ----|--------------------------------------------------|-----------
 *   G1  Ryder, esperando partidos, sin motivo (sin abrir)  | no
 *   G2  Ryder, con motivo (abiertos y sin partidos)        | sí, reintento
 *   G3  manual                                             | sí, como siempre
 */
describe('RoundCard · «Generar» en modo Ryder (FE #711)', () => {
  const tarjeta = (ronda, soloReintento) =>
    render(
      <RoundCard
        round={ronda}
        canEdit
        soloReintento={soloReintento}
        isExpanded={false}
        onToggleExpand={() => {}}
        onGenerateMatches={() => {}}
        golfCourses={[{ id: 'g1', name: 'Altea' }]}
        playerNameMap={{}}
        playerHandicapMap={{}}
        teamNames={{}}
        t={(clave) => clave}
      />
    );

  it('G1: en Ryder, con los sobres sin abrir, no se ofrece', () => {
    tarjeta({ ...RONDA, matchGenerationBlock: null }, true);

    expect(screen.queryByTitle('matches.generate')).not.toBeInTheDocument();
  });

  it('G2: en Ryder, abiertos y sin partidos, se ofrece para reintentar', () => {
    tarjeta(RONDA, true);

    expect(screen.getByTitle('matches.generate')).toBeInTheDocument();
  });

  it('G3: en modo manual se ofrece como siempre', () => {
    tarjeta({ ...RONDA, matchGenerationBlock: null }, false);

    expect(screen.getByTitle('matches.generate')).toBeInTheDocument();
  });
});
