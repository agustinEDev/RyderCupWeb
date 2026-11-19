import { describe, it, expect, vi } from 'vitest';
import { accionesDeAnotarRapida } from './useDialogosDeCierreRapida';

/**
 * Los topes de anterior y siguiente, sin depender de que el botón esté
 * apagado: si un día se pinta encendido, el hoyo sigue sin salirse de la
 * vuelta.
 *
 *   hoyo actual | botón      | qué pide
 *   ------------|------------|----------------
 *   1 de 18     | Anterior   | nada
 *   18 de 18    | Siguiente  | nada
 *   9 de 18     | Anterior   | el 8
 *   9 de 18     | Siguiente  | el 10
 */
const acciones = (currentHole, totalHoles = 18) => {
  const setCurrentHole = vi.fn();
  const resultado = accionesDeAnotarRapida({
    dialogos: {
      setShowFinishConfirm: vi.fn(),
      setShowCancelConfirm: vi.fn(),
      setCancelFailedKey: vi.fn(),
      setFinishFailedKey: vi.fn(),
    },
    currentHole,
    totalHoles,
    setCurrentHole,
    submitScore: vi.fn(),
    completeMatch: vi.fn(),
    cancelMatch: vi.fn(),
    refetch: vi.fn(),
  });
  return { ...resultado, setCurrentHole };
};

describe('accionesDeAnotarRapida · los topes de la vuelta', () => {
  it('en el primer hoyo, «Anterior» no pide nada', () => {
    const { handlePrevHole, setCurrentHole } = acciones(1);
    handlePrevHole();
    expect(setCurrentHole).not.toHaveBeenCalled();
  });

  it('en el último hoyo, «Siguiente» no pide nada', () => {
    const { handleNextHole, setCurrentHole } = acciones(18);
    handleNextHole();
    expect(setCurrentHole).not.toHaveBeenCalled();
  });

  it('en medio, «Anterior» pide el de antes', () => {
    const { handlePrevHole, setCurrentHole } = acciones(9);
    handlePrevHole();
    expect(setCurrentHole).toHaveBeenCalledWith(8);
  });

  it('en medio, «Siguiente» pide el de después', () => {
    const { handleNextHole, setCurrentHole } = acciones(9);
    handleNextHole();
    expect(setCurrentHole).toHaveBeenCalledWith(10);
  });
});
