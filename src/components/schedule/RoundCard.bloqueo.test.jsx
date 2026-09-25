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

  it('G5: con la competición aún reabierta no se ofrece: el servidor lo rechazaría', () => {
    render(
      <RoundCard
        round={{ ...RONDA, matchGenerationBlock: { reason: 'ENROLLMENT_OPEN', players: [] } }}
        canEdit
        soloReintento
        competicionCerrada={false}
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

    expect(screen.queryByTitle('matches.generate')).not.toBeInTheDocument();
    expect(screen.queryByText('generationBlock.retry')).not.toBeInTheDocument();
  });
});



/**
 * Quién descansa en la sesión (#710). Con equipos desiguales el que sobra se
 * quedaba sin partido y nadie lo decía.
 */
describe('RoundCard · quién descansa', () => {
  const nombres = new Map([
    ['u3', 'Óscar Noche'],
    ['u4', 'Luna Noche'],
  ]);
  const conPartidos = (restingPlayerIds) => ({
    ...RONDA,
    status: 'SCHEDULED',
    matchGenerationBlock: null,
    restingPlayerIds,
  });
  const pintarCon = (ronda) =>
    render(
      <RoundCard
        round={ronda}
        canEdit
        isExpanded={false}
        onToggleExpand={() => {}}
        onGenerateMatches={() => {}}
        golfCourses={[{ id: 'g1', name: 'Altea' }]}
        playerNameMap={nombres}
        playerHandicapMap={{}}
        teamNames={{}}
        t={(clave, opts) => `${clave}${opts ? JSON.stringify(opts) : ''}`}
      />
    );

  it('D2: el que descansa se nombra sin desplegar la sesión', () => {
    pintarCon(conPartidos(['u3']));

    const aviso = screen.getByTestId('descansan');
    expect(aviso).toHaveTextContent('rounds.resting');
    expect(aviso).toHaveTextContent('Óscar Noche');
    expect(aviso).toHaveTextContent('"count":1');
  });

  it('D3: con dos, los dos y en plural', () => {
    pintarCon(conPartidos(['u3', 'u4']));

    expect(screen.getByTestId('descansan')).toHaveTextContent('Óscar Noche, Luna Noche');
    expect(screen.getByTestId('descansan')).toHaveTextContent('"count":2');
  });

  it('D6: si no se sabe su nombre, se cuenta igual (CodeRabbit)', () => {
    pintarCon(conPartidos(['u3', 'desconocido']));

    const aviso = screen.getByTestId('descansan');
    expect(aviso).toHaveTextContent('"count":2');
    expect(aviso).toHaveTextContent('Óscar Noche, rounds.unknownPlayer');
  });

  it('D4: si no descansa nadie, no hay aviso', () => {
    pintarCon(conPartidos([]));

    expect(screen.queryByTestId('descansan')).not.toBeInTheDocument();
  });

  it('D5: las dos traducciones existen, en singular y plural', async () => {
    for (const idioma of ['es', 'en']) {
      const textos = (await import(`../../i18n/locales/${idioma}/schedule.json`)).default;
      expect(textos.rounds.resting_one, idioma).toContain('{{names}}');
      expect(textos.rounds.resting_other, idioma).toContain('{{names}}');
    }
  });
});
