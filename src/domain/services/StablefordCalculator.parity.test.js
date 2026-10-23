import { describe, it, expect } from 'vitest';
import StablefordCalculator from './StablefordCalculator';
import MatchPlayStrokeAllocator from './MatchPlayStrokeAllocator';
import fixtures from './__fixtures__/backendStandingsParity.json';

/**
 * Paridad de la clasificación de la partida rápida con el backend: orden,
 * puesto y empate, con el desempate por menor hándicap índice exacto (H).
 *
 * `backendStandingsParity.json` NO está escrito a mano: lo genera el propio
 * `PublishQuickMatchResultUseCase` de Python. Si este fichero falla tras tocar
 * el backend, se regenera el JSON y se arregla el cliente hasta que cuadre.
 *
 * Qué se compara y qué no. El backend deja fuera de la clasificación a quien
 * no cuenta (menos de 18 hoyos entre los de 18, conjuntos de nueve distintos),
 * y sin puesto a quien queda solo. La tabla de la partida rápida del cliente no
 * aplica esa regla, a propósito: pinta a todos con lo que llevan. Así que:
 *
 * - Se clasifica en el cliente SOLO a los que el backend hace contar
 *   (`unfinished: false`) y se compara el orden, el puesto y el empate de esos.
 * - Los escenarios en los que el backend no da ningún puesto (cuenta uno solo,
 *   o ninguno) no tienen nada que comparar: se excluyen por su nombre, abajo, y
 *   un test vigila que la lista de excluidos no crezca sin querer.
 */
const SIN_NADA_QUE_COMPARAR = {
  'stableford solo uno cuenta: sin puesto':
    'cuenta uno solo y el backend no le da puesto; el cliente no aplica esa regla',
  'stableford conjuntos distintos de nueve: no cuenta nadie':
    'no cuenta nadie: el backend no clasifica y el cliente no aplica la regla de los nueve',
};

const holeScoresDe = (scores) =>
  Object.entries(scores).flatMap(([participantId, porHoyo]) =>
    Object.entries(porHoyo ?? {}).map(([hoyo, score]) => ({
      participantId,
      holeNumber: Number(hoyo),
      score,
    }))
  );

const comparables = fixtures.scenarios.filter((s) => !(s.name in SIN_NADA_QUE_COMPARAR));

describe('StablefordCalculator - paridad de la clasificación con el backend (H)', () => {
  it('only the scenarios with no position at all are left out, and they exist', () => {
    const nombres = fixtures.scenarios.map((s) => s.name);
    for (const excluido of Object.keys(SIN_NADA_QUE_COMPARAR)) {
      expect(nombres).toContain(excluido);
      const escenario = fixtures.scenarios.find((s) => s.name === excluido);
      expect(Object.values(escenario.expected).every((e) => e.position === null)).toBe(true);
    }
    expect(comparables).toHaveLength(fixtures.scenarios.length - 2);
  });

  it.each(comparables.map((s) => [s.name, s]))('%s', (_name, scenario) => {
    const cuentan = scenario.participants.filter(
      (p) => !scenario.expected[p.participantId].unfinished
    );
    const holeScores = holeScoresDe(scenario.scores);

    const allocation = MatchPlayStrokeAllocator.resolve({
      participantStrokes: [],
      participants: cuentan,
      holes: scenario.holes,
      tees: scenario.tees,
      matchFormat: null,
      allowancePercentage: scenario.allowancePercentage,
      playMode: scenario.playMode,
    });
    const rank =
      scenario.scoringFormat === 'MEDAL'
        ? StablefordCalculator.rankParticipantsByMedal
        : StablefordCalculator.rankParticipants;
    const ranking = rank(cuentan, scenario.holes, holeScores, allocation, scenario.tees);

    // El orden: por puesto del backend; a igual puesto (empate) cualquier
    // orden vale, así que se compara como conjunto por puesto
    const delCliente = ranking.map((r) => ({
      id: r.participantId,
      position: r.position,
      tied: r.tied,
    }));
    const delBackend = cuentan.map((p) => ({
      id: p.participantId,
      position: scenario.expected[p.participantId].position,
      tied: scenario.expected[p.participantId].tied,
    }));
    const porPuesto = (filas) =>
      [...filas].sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));

    expect(porPuesto(delCliente)).toEqual(porPuesto(delBackend));
    // Y el orden de la tabla respeta los puestos
    expect(ranking.map((r) => r.position)).toEqual(
      [...ranking.map((r) => r.position)].sort((a, b) => a - b)
    );

    // Lo que el backend publica de cada uno, con las mismas cuentas
    for (const fila of ranking) {
      const esperado = scenario.expected[fila.participantId];
      expect(fila.holesPlayed).toBe(esperado.holesPlayed);
      expect(fila.totalStrokes).toBe(esperado.grossStrokes);
      if (scenario.scoringFormat === 'MEDAL') {
        expect(fila.netStrokes).toBe(esperado.netStrokes);
        expect(fila.netStrokes - fila.parPlayed).toBe(esperado.toPar);
      } else {
        expect(fila.stablefordPoints).toBe(esperado.points);
      }
    }
  });
});
