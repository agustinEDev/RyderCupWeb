import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import QuickMatchClassificationTable from './QuickMatchClassificationTable';
import es from '../../i18n/locales/es/quickMatch.json';

/**
 * Cómo acabó un match play de partida rápida (Agustín, 24 oct 2026): una
 * terminada dice quién ganó, con el marcador del historial; una cancelada no
 * tiene ganador. Con los textos de verdad, para leer lo que lee el jugador.
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts = {}) => {
      const busca = (clave) => clave.split('.').reduce((nodo, parte) => nodo?.[parte], es);
      const plural = opts.count === undefined ? undefined : busca(`${key}_${opts.count === 1 ? 'one' : 'other'}`);
      const texto = plural ?? busca(key) ?? key;
      return typeof texto === 'string'
        ? texto.replace(/{{(\w+)}}/g, (_, nombre) => String(opts[nombre] ?? ''))
        : key;
    },
    i18n: { language: 'es' },
  }),
}));

const participants = [
  { participantId: 'p-1', name: 'Alice', handicap: 0, team: null, isGuest: false },
  { participantId: 'p-2', name: 'Bob', handicap: 0, team: null, isGuest: false },
];

const delanteA = { status: '2UP', leadingTeam: 'A', holesPlayed: 18, holesRemaining: 0, isDecided: false };
const empatados = { status: 'AS', leadingTeam: null, holesPlayed: 18, holesRemaining: 0, isDecided: false };
const decidida = { status: '3UP', leadingTeam: 'A', holesPlayed: 16, holesRemaining: 2, isDecided: true };
const aMedias = { status: '2UP', leadingTeam: 'A', holesPlayed: 9, holesRemaining: 9, isDecided: false };

const losDiezYOcho = ['p-1', 'p-2'].flatMap((participantId) =>
  Array.from({ length: 18 }, (_, i) => ({ participantId, holeNumber: i + 1, score: 4 }))
);

const pinta = (standing, estado = {}, holeScores = losDiezYOcho) =>
  render(
    <QuickMatchClassificationTable
      holes={[]}
      holeScores={holeScores}
      participants={participants}
      currentParticipantId="p-1"
      matchFormat="SINGLES"
      standing={standing}
      {...estado}
    />
  );

const terminada = { showFinalBadge: true };
const cancelada = { showFinalBadge: true, isCancelled: true };

describe('el marcador de un match play que ya acabó', () => {
  it('L1. terminada: quién ganó y por cuánto, como el historial', () => {
    pinta(delanteA, terminada);

    expect(screen.getByText('2UP')).toBeInTheDocument();
    expect(screen.getByText('Alice ganó')).toBeInTheDocument();
    expect(screen.queryByText(/lidera/)).not.toBeInTheDocument();
    expect(screen.queryByText(/arriba/)).not.toBeInTheDocument();
  });

  it('L1. decidida antes del 18: el 3&2', () => {
    pinta(decidida, terminada);

    expect(screen.getByText('3&2')).toBeInTheDocument();
    expect(screen.getByText('Alice ganó')).toBeInTheDocument();
  });

  it('L1. ganó el bando B', () => {
    pinta({ ...delanteA, leadingTeam: 'B' }, terminada);

    expect(screen.getByText('Bob ganó')).toBeInTheDocument();
  });

  it('L2. terminada y empatada: «Empate», sin ganador', () => {
    pinta(empatados, terminada);

    expect(screen.getByText('Empate')).toBeInTheDocument();
    expect(screen.queryByText(/ganó/)).not.toBeInTheDocument();
    expect(screen.queryByText('Empatados')).not.toBeInTheDocument();
  });

  it('terminada con pocos hoyos y sin decidir: sin terminar, sin ganador', () => {
    const tresHoyos = losDiezYOcho.filter((h) => h.holeNumber <= 3);

    pinta({ ...aMedias, holesPlayed: 3, holesRemaining: 15 }, terminada, tresHoyos);

    expect(screen.getByText('2 arriba')).toBeInTheDocument();
    expect(screen.getByText('Sin terminar')).toBeInTheDocument();
    expect(screen.queryByText(/ganó/)).not.toBeInTheDocument();
  });

  it('terminada pocos hoyos pero decidida antes: ganó', () => {
    const tresHoyos = losDiezYOcho.filter((h) => h.holeNumber <= 3);

    pinta({ ...decidida, holesPlayed: 3, holesRemaining: 15 }, terminada, tresHoyos);

    expect(screen.getByText('Alice ganó')).toBeInTheDocument();
  });

  it('L3. en juego: sigue diciendo quién lidera', () => {
    pinta(aMedias);

    expect(screen.getByText('2 arriba')).toBeInTheDocument();
    expect(screen.getByText('Alice lidera')).toBeInTheDocument();
    expect(screen.queryByText(/ganó/)).not.toBeInTheDocument();
  });

  it('L4. cancelada: el marcador como quedó, sin ganador ni líder', () => {
    pinta(aMedias, cancelada);

    expect(screen.getByText('2 arriba')).toBeInTheDocument();
    expect(screen.queryByText(/ganó/)).not.toBeInTheDocument();
    expect(screen.queryByText(/lidera/)).not.toBeInTheDocument();
  });

  it('L4. cancelada y empatada: «Empatados», no «Empate»', () => {
    pinta(empatados, cancelada);

    expect(screen.getByText('Empatados')).toBeInTheDocument();
    expect(screen.queryByText('Empate')).not.toBeInTheDocument();
  });
});

describe('lo que falta por cubrir (revisión, 24 oct 2026)', () => {
  it('terminada sin ningún hoyo de los dos: sin terminar, como Actividad', () => {
    const idaYVuelta = losDiezYOcho.filter(
      (h) => (h.participantId === 'p-1') === (h.holeNumber <= 9)
    );

    pinta(null, terminada, idaYVuelta);

    expect(screen.getByText('Sin terminar')).toBeInTheDocument();
    expect(screen.queryByText(es.scoring.classification.noHolesYet)).not.toBeInTheDocument();
  });

  it('en juego y sin ningún hoyo de los dos: todavía no hay hoyos', () => {
    pinta(null, {}, losDiezYOcho.filter((h) => h.participantId === 'p-1'));

    expect(screen.getByText(es.scoring.classification.noHolesYet)).toBeInTheDocument();
  });

  it('terminada y sin nada anotado: todavía no hay hoyos', () => {
    pinta(null, terminada, []);

    expect(screen.getByText(es.scoring.classification.noHolesYet)).toBeInTheDocument();
  });

  it('el veredicto mira lo que tiene el servidor, no lo que espera en el móvil', () => {
    const delServidor = losDiezYOcho.filter((h) => h.participantId === 'p-2' || h.holeNumber <= 9);

    pinta(delanteA, { ...terminada, holeScoresDelServidor: delServidor });

    expect(screen.getByText('Sin terminar')).toBeInTheDocument();
  });
});

describe('fourball', () => {
  const cuatro = [
    { participantId: 'a1', name: 'Alice', handicap: 0, team: 'A', isGuest: false },
    { participantId: 'a2', name: 'Carol', handicap: 0, team: 'A', isGuest: false },
    { participantId: 'b1', name: 'Bob', handicap: 0, team: 'B', isGuest: false },
    { participantId: 'b2', name: 'Dan', handicap: 0, team: 'B', isGuest: false },
  ];
  const todos = ['a1', 'a2', 'b1', 'b2'].flatMap((participantId) =>
    Array.from({ length: 18 }, (_, i) => ({ participantId, holeNumber: i + 1, score: 4 }))
  );
  const pintaFourball = (standing, estado, holeScores) =>
    render(
      <QuickMatchClassificationTable
        holes={[]}
        holeScores={holeScores}
        participants={cuatro}
        currentParticipantId="a1"
        matchFormat="FOURBALL"
        standing={standing}
        {...estado}
      />
    );

  it('la pareja gana en plural', () => {
    pintaFourball(delanteA, terminada, todos);

    expect(screen.getByText('Alice & Carol ganaron')).toBeInTheDocument();
  });

  it('la pareja lidera en plural', () => {
    pintaFourball(aMedias, {}, todos);

    expect(screen.getByText('Alice & Carol lideran')).toBeInTheDocument();
  });

  it('sin la bola del compañero en la vuelta: sin terminar', () => {
    const sinCarolALaVuelta = todos.filter((h) => h.participantId !== 'a2' || h.holeNumber <= 9);

    pintaFourball(delanteA, terminada, sinCarolALaVuelta);

    expect(screen.getByText('Sin terminar')).toBeInTheDocument();
  });
});
