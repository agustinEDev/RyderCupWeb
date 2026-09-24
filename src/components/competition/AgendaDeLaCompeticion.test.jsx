import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (clave, valores) => (valores ? `${clave}|${JSON.stringify(valores)}` : clave),
    i18n: { language: 'es' },
  }),
}));

const mockVerAgenda = vi.fn();
const mockCampos = vi.fn();
const mockCrear = vi.fn();
const mockCambiar = vi.fn();
const mockQuitar = vi.fn();
vi.mock('../../composition', () => ({
  getScheduleUseCase: { execute: (...a) => mockVerAgenda(...a) },
  getCompetitionGolfCoursesUseCase: { execute: (...a) => mockCampos(...a) },
  createRoundUseCase: { execute: (...a) => mockCrear(...a) },
  updateRoundUseCase: { execute: (...a) => mockCambiar(...a) },
  deleteRoundUseCase: { execute: (...a) => mockQuitar(...a) },
}));
const mockToastError = vi.fn();
vi.mock('../../utils/toast', () => ({
  default: { error: (...a) => mockToastError(...a), success: vi.fn() },
}));

import AgendaDeLaCompeticion from './AgendaDeLaCompeticion';

/**
 * El torneo es su agenda (FE #654): la ficha la enseña, y el organizador la
 * cambia ahí mismo, sin la pantalla de «Gestionar Calendario».
 *
 *   #     caso                                                   | qué pasa
 *   ------|------------------------------------------------------|----------------------------------
 *   AG1   los días, en orden, con cada sesión                    | franja y formato
 *   AG2   un solo campo en todo el torneo                        | se dice una vez, no en cada sesión
 *   AG2b  varios campos                                          | cada sesión dice el suyo
 *   AG3   cuántos partidos salen                                 | sin generar: la cuenta; generados: los que hay
 *   AG4   quien solo mira                                        | sin nada que tocar
 *   AG5   el organizador cambia el formato de un toque           | PUT match_format y se vuelve a leer
 *   AG6   una sesión con partidos                                | no se toca
 *   AG7   quitar una sesión                                      | DELETE
 *   AG8   añadir una sesión en una franja libre                  | POST con el día, la franja y un campo
 *   AG9   sin ninguna sesión                                     | se avisa, sin bloquear: se puede añadir
 *   AG10  cambiar el campo de una sesión, con varios             | PUT golf_course_id
 *   AG11  el servidor rechaza un cambio                          | su motivo, y la agenda como estaba
 *   AG12  la agenda no se puede leer                             | dice eso, NO que no hay sesiones
 */

const ALTEA = { golf_course: { id: 'g1', name: 'Altea' } };
const MEIS = { golf_course: { id: 'g2', name: 'Meis' } };

const sesion = (extra) => ({
  id: 'r1',
  roundDate: '2026-10-03',
  sessionType: 'MORNING',
  matchFormat: 'FOURSOMES',
  status: 'PENDING_TEAMS',
  golfCourseId: 'g1',
  matches: [],
  ...extra,
});

const AGENDA = {
  teamAssignment: null,
  rounds: [
    sesion({ id: 'r3', roundDate: '2026-10-04', sessionType: 'MORNING', matchFormat: 'SINGLES' }),
    sesion({ id: 'r2', sessionType: 'AFTERNOON', matchFormat: 'FOURBALL' }),
    sesion({ id: 'r1' }),
  ],
};

const pintar = (props = {}) =>
  render(
    <AgendaDeLaCompeticion
      competitionId="c1"
      startDate="2026-10-03"
      endDate="2026-10-04"
      canManage
      jugadores={12}
      {...props}
    />
  );

beforeEach(() => {
  vi.clearAllMocks();
  mockVerAgenda.mockResolvedValue(AGENDA);
  mockCampos.mockResolvedValue([ALTEA]);
  mockCrear.mockResolvedValue({ id: 'nueva' });
  mockCambiar.mockResolvedValue({ id: 'r1' });
  mockQuitar.mockResolvedValue(undefined);
});

describe('AgendaDeLaCompeticion · lo que enseña', () => {
  it('AG1: los días en orden, y en cada uno sus sesiones por franja', async () => {
    pintar();

    const dias = await screen.findAllByTestId(/^agenda-dia-/);
    expect(dias.map((d) => d.dataset.testid)).toEqual([
      'agenda-dia-2026-10-03',
      'agenda-dia-2026-10-04',
    ]);
    const sabado = within(dias[0]).getAllByTestId(/^agenda-sesion-/);
    expect(sabado.map((s) => s.dataset.testid)).toEqual(['agenda-sesion-r1', 'agenda-sesion-r2']);
    expect(sabado[0]).toHaveTextContent('sessions.MORNING');
  });

  it('AG2: con un solo campo, se dice una vez arriba y no en cada sesión', async () => {
    pintar();

    expect(await screen.findByTestId('agenda-campo-unico')).toHaveTextContent('Altea');
    expect(screen.getByTestId('agenda-sesion-r1')).not.toHaveTextContent('Altea');
  });

  it('AG2b: con varios, cada sesión dice el suyo', async () => {
    mockCampos.mockResolvedValue([ALTEA, MEIS]);
    mockVerAgenda.mockResolvedValue({
      ...AGENDA,
      rounds: [sesion({ id: 'r1' }), sesion({ id: 'r2', sessionType: 'AFTERNOON', golfCourseId: 'g2' })],
    });
    pintar({ canManage: false });

    expect(await screen.findByTestId('agenda-sesion-r2')).toHaveTextContent('Meis');
    expect(screen.queryByTestId('agenda-campo-unico')).not.toBeInTheDocument();
  });

  it('AG3: sin generar dice cuántos saldrán; generados, los que hay', async () => {
    mockVerAgenda.mockResolvedValue({
      ...AGENDA,
      rounds: [
        sesion({ id: 'r1', matchFormat: 'SINGLES' }),
        sesion({
          id: 'r2',
          sessionType: 'AFTERNOON',
          status: 'SCHEDULED',
          matches: [{ id: 'm1' }, { id: 'm2' }],
        }),
      ],
    });
    pintar();

    expect(await screen.findByTestId('agenda-partidos-r1')).toHaveTextContent('"count":6');
    expect(screen.getByTestId('agenda-partidos-r2')).toHaveTextContent('"count":2');
  });

  it('AG4: quien solo mira no tiene nada que tocar', async () => {
    pintar({ canManage: false });

    await screen.findByTestId('agenda-sesion-r1');
    expect(screen.queryByTestId(/^agenda-formato-/)).not.toBeInTheDocument();
    expect(screen.queryByTestId(/^agenda-quitar-/)).not.toBeInTheDocument();
    expect(screen.queryByTestId('agenda-anadir')).not.toBeInTheDocument();
  });

  it('AG12: si no se puede leer, lo dice; no que no hay sesiones', async () => {
    mockVerAgenda.mockRejectedValue(new TypeError('Sin conexión'));
    pintar();

    expect(await screen.findByTestId('agenda-sin-cargar')).toBeInTheDocument();
    expect(screen.queryByTestId('agenda-vacia')).not.toBeInTheDocument();
  });
});

describe('AgendaDeLaCompeticion · lo que cambia el organizador', () => {
  it('AG5: el formato se cambia de un toque, y se vuelve a leer', async () => {
    pintar();

    fireEvent.click(await screen.findByTestId('agenda-formato-r1-SINGLES'));

    await waitFor(() => expect(mockCambiar).toHaveBeenCalledWith('r1', { match_format: 'SINGLES' }));
    await waitFor(() => expect(mockVerAgenda).toHaveBeenCalledTimes(2));
  });

  it('AG6: una sesión con partidos no se toca', async () => {
    mockVerAgenda.mockResolvedValue({
      ...AGENDA,
      rounds: [sesion({ id: 'r1', status: 'SCHEDULED', matches: [{ id: 'm1' }] })],
    });
    pintar();

    await screen.findByTestId('agenda-sesion-r1');
    expect(screen.queryByTestId(/^agenda-formato-r1-/)).not.toBeInTheDocument();
    expect(screen.queryByTestId('agenda-quitar-r1')).not.toBeInTheDocument();
  });

  it('AG7: quitar una sesión', async () => {
    pintar();

    fireEvent.click(await screen.findByTestId('agenda-quitar-r2'));

    await waitFor(() => expect(mockQuitar).toHaveBeenCalledWith('r2'));
  });

  it('AG8: añadir una sesión en una franja libre', async () => {
    pintar();

    fireEvent.click(await screen.findByTestId('agenda-anadir'));
    fireEvent.change(screen.getByTestId('agenda-anadir-dia'), { target: { value: '2026-10-04' } });
    fireEvent.change(screen.getByTestId('agenda-anadir-franja'), { target: { value: 'AFTERNOON' } });
    fireEvent.click(screen.getByTestId('agenda-anadir-confirmar'));

    await waitFor(() =>
      expect(mockCrear).toHaveBeenCalledWith('c1', {
        golf_course_id: 'g1',
        round_date: '2026-10-04',
        session_type: 'AFTERNOON',
        match_format: 'SINGLES',
      })
    );
  });

  it('AG8b: y solo ofrece las franjas libres de ese día', async () => {
    pintar();

    fireEvent.click(await screen.findByTestId('agenda-anadir'));
    fireEvent.change(screen.getByTestId('agenda-anadir-dia'), { target: { value: '2026-10-03' } });

    const franjas = [...screen.getByTestId('agenda-anadir-franja').options].map((o) => o.value);
    expect(franjas).toEqual(['EVENING']);
  });

  it('AG9: sin sesiones se avisa, y se puede añadir igual', async () => {
    mockVerAgenda.mockResolvedValue({ teamAssignment: null, rounds: [] });
    pintar();

    expect(await screen.findByTestId('agenda-vacia')).toBeInTheDocument();
    expect(screen.getByTestId('agenda-anadir')).toBeInTheDocument();
  });

  it('AG10: con varios campos se cambia el de una sesión', async () => {
    mockCampos.mockResolvedValue([ALTEA, MEIS]);
    pintar();

    fireEvent.change(await screen.findByTestId('agenda-campo-r1'), { target: { value: 'g2' } });

    await waitFor(() => expect(mockCambiar).toHaveBeenCalledWith('r1', { golf_course_id: 'g2' }));
  });

  it('AG11: si el servidor lo rechaza, dice por qué y la agenda sigue como estaba', async () => {
    mockCambiar.mockRejectedValue(new Error('Ya existe una sesión MORNING en la fecha'));
    pintar();

    fireEvent.click(await screen.findByTestId('agenda-formato-r1-SINGLES'));

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith('Ya existe una sesión MORNING en la fecha')
    );
    expect(mockVerAgenda).toHaveBeenCalledTimes(2);
  });
});
