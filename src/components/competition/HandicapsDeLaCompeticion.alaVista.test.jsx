import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';

/**
 * Desde «Requiere tu Atención» (15 nov 2026): «{N} jugadores sin actualizar
 * con la RFEG en X» lleva a la ficha y la tarjeta de hándicaps se trae a la vista.
 *
 *   caso                                  | qué pasa
 *   --------------------------------------|----------------------------------
 *   V1 llega desde el aviso               | la tarjeta se trae a la vista
 *   V2 se llega de cualquier otro sitio   | no se mueve nada
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: 'es' } }),
}));
vi.mock('../../utils/toast', () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));
vi.mock('../../composition', () => ({
  launchHandicapUpdateUseCase: { execute: vi.fn() },
  scheduleHandicapUpdateUseCase: { execute: vi.fn() },
  cancelScheduledHandicapUpdateUseCase: { execute: vi.fn() },
  getCompetitionGolfCoursesUseCase: { execute: vi.fn(async () => []) },
}));

const HandicapsDeLaCompeticion = (await import('./HandicapsDeLaCompeticion'))
  .default;

const VENTANA = { open: true, closesAt: null, reason: null, scheduledAt: null };

describe('HandicapsDeLaCompeticion · a la vista desde el aviso', () => {
  let traer;
  beforeEach(() => {
    traer = vi.fn();
    globalThis.Element.prototype.scrollIntoView = traer;
  });
  afterEach(() => {
    delete globalThis.Element.prototype.scrollIntoView;
  });

  const pinta = (props) =>
    render(
      <HandicapsDeLaCompeticion
        competitionId="c-1"
        handicapUpdate={null}
        handicapUpdateWindow={VENTANA}
        onReleer={vi.fn()}
        {...props}
      />,
    );

  it('V1: Given llega desde el aviso, When se pinta, Then la tarjeta se trae a la vista', () => {
    pinta({ traerALaVista: true });

    expect(traer).toHaveBeenCalledTimes(1);
    expect(traer.mock.instances[0].dataset.testid).toBe('handicaps');
  });

  it('V2: Given llega de otro sitio, When se pinta, Then no se mueve nada', () => {
    pinta({});

    expect(traer).not.toHaveBeenCalled();
  });
});
