import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';

/**
 * Desde «Requiere tu Atención» o Actividad (15 nov 2026): «{N} jugadores sin
 * actualizar con la RFEG en X» lleva a la ficha y la tarjeta de hándicaps se
 * trae a la vista, una vez y con la ficha ya asentada.
 *
 *   caso                                           | qué pasa
 *   -----------------------------------------------|-----------------------------------------
 *   V1 llega desde el aviso, ya asentada y leída   | se trae a la vista, una vez, y se dice que ya
 *   V2 se llega de cualquier otro sitio            | no se mueve nada
 *   V3 la ficha aún no está asentada               | espera; al asentarse, se trae
 *   V4 la zona del campo aún no se ha leído        | espera a leerla
 *   V5 se vuelve a pintar después                  | no se trae otra vez
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: 'es' } }),
}));
vi.mock('../../utils/toast', () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));
const mockCampos = vi.fn();
vi.mock('../../composition', () => ({
  launchHandicapUpdateUseCase: { execute: vi.fn() },
  scheduleHandicapUpdateUseCase: { execute: vi.fn() },
  cancelScheduledHandicapUpdateUseCase: { execute: vi.fn() },
  getCompetitionGolfCoursesUseCase: { execute: (...a) => mockCampos(...a) },
}));

const HandicapsDeLaCompeticion = (await import('./HandicapsDeLaCompeticion'))
  .default;

const VENTANA = { open: true, closesAt: null, reason: null, scheduledAt: null };

describe('HandicapsDeLaCompeticion · a la vista desde el aviso', () => {
  let traer;
  beforeEach(() => {
    traer = vi.fn();
    mockCampos.mockReset();
    mockCampos.mockResolvedValue([]);
    globalThis.Element.prototype.scrollIntoView = traer;
  });
  afterEach(() => {
    delete globalThis.Element.prototype.scrollIntoView;
  });

  const tarjeta = (props) => (
    <HandicapsDeLaCompeticion
      competitionId="c-1"
      handicapUpdate={null}
      handicapUpdateWindow={VENTANA}
      onReleer={vi.fn()}
      {...props}
    />
  );

  it('V1: Given llega desde el aviso y la ficha está asentada, When se pinta, Then se trae a la vista y se dice que ya', async () => {
    const visto = vi.fn();
    render(tarjeta({ traerALaVista: true, alTraerla: visto }));

    await waitFor(() => expect(traer).toHaveBeenCalledTimes(1));
    expect(traer.mock.instances[0].dataset.testid).toBe('handicaps');
    expect(visto).toHaveBeenCalledTimes(1);
  });

  it('V2: Given llega de otro sitio, When se pinta, Then no se mueve nada', async () => {
    render(tarjeta({}));

    await waitFor(() => expect(mockCampos).toHaveBeenCalled());
    await Promise.resolve();
    expect(traer).not.toHaveBeenCalled();
  });

  it('V3: Given la ficha aún no está asentada, When se asienta, Then se trae entonces', async () => {
    const { rerender } = render(tarjeta({ traerALaVista: false }));
    await waitFor(() => expect(mockCampos).toHaveBeenCalled());
    await Promise.resolve();
    expect(traer).not.toHaveBeenCalled();

    rerender(tarjeta({ traerALaVista: true }));

    await waitFor(() => expect(traer).toHaveBeenCalledTimes(1));
  });

  it('V4: Given la zona aún no se ha leído, When se pinta, Then espera a leerla', async () => {
    let leer;
    mockCampos.mockReturnValue(
      new Promise((r) => {
        leer = r;
      }),
    );
    render(tarjeta({ traerALaVista: true }));
    await Promise.resolve();
    expect(traer).not.toHaveBeenCalled();

    leer([]);

    await waitFor(() => expect(traer).toHaveBeenCalledTimes(1));
  });

  it('V5: Given ya se trajo, When se vuelve a pintar, Then no se trae otra vez', async () => {
    const { rerender } = render(tarjeta({ traerALaVista: true }));
    await waitFor(() => expect(traer).toHaveBeenCalledTimes(1));

    // La ficha deja de pedirlo (borra el encargo) y lo vuelve a pedir
    rerender(tarjeta({ traerALaVista: false }));
    rerender(tarjeta({ traerALaVista: true }));
    await Promise.resolve();

    expect(traer).toHaveBeenCalledTimes(1);
  });
});
