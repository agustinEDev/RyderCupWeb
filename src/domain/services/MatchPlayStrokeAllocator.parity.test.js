import { describe, it, expect } from 'vitest';
import MatchPlayStrokeAllocator from './MatchPlayStrokeAllocator';
import fixtures from './__fixtures__/backendParity.json';

/**
 * Paridad con el backend, medida y no supuesta.
 *
 * `backendParity.json` NO está escrito a mano: lo genera el propio
 * `StrokeAllocationService` de Python (ver el script en la descripción del
 * fichero). Cada escenario lleva las entradas y el reparto exacto que produce
 * el servidor, y aquí se comprueba que el repartidor del cliente saca lo mismo.
 *
 * Es la única garantía real de que la anotación sin conexión cuenta lo mismo
 * que el servidor. Los tests escritos a mano fijan lo que uno CREE que hacen
 * los dos; esto fija lo que hace uno de verdad.
 *
 * Si este fichero falla tras tocar el backend, hay que regenerar el JSON y
 * arreglar el cliente hasta que vuelva a cuadrar. No al revés.
 */
describe('MatchPlayStrokeAllocator - paridad con el backend', () => {
  it.each(fixtures.scenarios.map((s) => [s.name, s]))('%s', (_name, scenario) => {
    const holesByTee = Object.fromEntries(
      Object.entries(scenario.teeCards ?? {}).map(([key, order]) => [key, order])
    );

    // El backend recibe la tarjeta propia de cada barra; aquí se le añade a la
    // barra correspondiente, que es de donde la lee el cliente.
    const tees = scenario.tees.map((tee) => {
      const key = `${tee.color}|${tee.gender ?? ''}`;
      const order = holesByTee[key];
      if (!order) return tee;
      // El orden llega como hoyos de más difícil a más fácil: se reconstruye la
      // tarjeta de la barra con su stroke index
      const strokeIndexByHole = {};
      order.forEach((holeNumber, position) => {
        strokeIndexByHole[holeNumber] = position + 1;
      });
      return {
        ...tee,
        holes: scenario.holes.map((h) => ({
          holeNumber: h.holeNumber,
          par: h.par,
          strokeIndex: strokeIndexByHole[h.holeNumber],
        })),
      };
    });

    const result = MatchPlayStrokeAllocator.allocate({
      participants: scenario.participants,
      holes: scenario.holes,
      tees,
      matchFormat: scenario.matchFormat,
      allowancePercentage: scenario.allowancePercentage,
      playMode: scenario.playMode,
    });

    for (const [participantId, expected] of Object.entries(scenario.expected)) {
      const actual = result[participantId];

      expect(
        actual,
        `falta el participante ${participantId} en el reparto del cliente`
      ).toBeDefined();

      expect(
        actual.playingHandicap,
        `hándicap de juego de ${participantId} en "${scenario.name}"`
      ).toBe(expected.playingHandicap);

      // Las claves del backend llegan como texto: se comparan normalizadas
      const actualByHole = Object.fromEntries(
        Object.entries(actual.strokesByHole).map(([hole, count]) => [String(hole), count])
      );
      expect(
        actualByHole,
        `reparto por hoyo de ${participantId} en "${scenario.name}"`
      ).toEqual(expected.strokesByHole);
    }
  });
});
