import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AssignTeamsModal from './AssignTeamsModal';

/**
 * «Reasignar equipos» no deshace el draft de un clic (#710, e2e del 24 sep).
 *
 * Con el draft hecho y los partidos generados, el modal abría en «Automática»
 * sin decir nada, y el modo manual empezaba vacío: «Faltan 4 jugadores por
 * asignar». Rehacer los equipos que eligieron los capitanes era pulsar un botón.
 *
 *   #   caso                                  | al abrir
 *   ----|--------------------------------------|--------------------------------
 *   R1  sin equipos todavía                   | automático, como siempre
 *   R2  con equipos ya repartidos             | manual, con los equipos de ahora
 *   R3  con equipos ya repartidos             | avisa de que los sustituye
 *   R4  sin tocar nada y confirmar            | manda los mismos equipos
 */
vi.mock('framer-motion', () => {
  const DE_ANIMACION = new Set(['initial', 'animate', 'exit', 'transition']);
  const Div = ({ children, ...props }) => (
    <div {...Object.fromEntries(Object.entries(props).filter(([k]) => !DE_ANIMACION.has(k)))}>
      {children}
    </div>
  );
  return { motion: new Proxy({}, { get: () => Div }) };
});

const t = (clave, params) => (params?.count !== undefined ? `${clave}_${params.count}` : clave);

const INSCRITOS = [
  { userId: 'ana', userName: 'Ana Alba', status: 'APPROVED', userHandicap: 8 },
  { userId: 'bea', userName: 'Bea Blanco', status: 'APPROVED', userHandicap: 12 },
  { userId: 'carla', userName: 'Carla Cruz', status: 'APPROVED', userHandicap: 15 },
  { userId: 'dani', userName: 'Dani Díaz', status: 'APPROVED', userHandicap: 20 },
];

const EQUIPOS = { teamAPlayerIds: ['ana', 'dani'], teamBPlayerIds: ['bea', 'carla'] };

const pintar = (props = {}) =>
  render(
    <AssignTeamsModal
      isOpen
      onClose={vi.fn()}
      onConfirm={vi.fn()}
      enrollments={INSCRITOS}
      isProcessing={false}
      teamNames={{ teamA: 'Europa', teamB: 'América' }}
      captains={{ teamA: 'ana', teamB: 'bea' }}
      t={t}
      {...props}
    />
  );

describe('AssignTeamsModal · reasignar con equipos ya hechos (#710)', () => {
  it('R1: sin equipos todavía, abre en automático como siempre', () => {
    pintar({ hasTeams: false });

    expect(screen.getByDisplayValue('automatic')).toBeChecked();
    expect(screen.queryByTestId('reasignar-aviso')).not.toBeInTheDocument();
  });

  it('R2: con equipos, abre en manual con los equipos de ahora', () => {
    pintar({ hasTeams: true, currentTeams: EQUIPOS });

    expect(screen.getByDisplayValue('manual')).toBeChecked();
    expect(screen.queryByText(/teams\.everyoneNeedsTeam/)).not.toBeInTheDocument();
  });

  it('R3: y avisa de que el reparto nuevo sustituye al de ahora', () => {
    pintar({ hasTeams: true, currentTeams: EQUIPOS });

    expect(screen.getByTestId('reasignar-aviso')).toHaveTextContent('teams.replaceWarning');
  });

  it('R4: confirmar sin tocar nada manda los mismos equipos, no un reparto nuevo', () => {
    const onConfirm = vi.fn();
    pintar({ hasTeams: true, currentTeams: EQUIPOS, onConfirm });

    fireEvent.submit(screen.getByDisplayValue('manual').closest('form'));

    expect(onConfirm).toHaveBeenCalledWith({
      mode: 'manual',
      team_a_player_ids: ['ana', 'dani'],
      team_b_player_ids: ['bea', 'carla'],
    });
  });

  it('R6: un retirado que sigue en el reparto guardado no se manda (revisión local)', () => {
    // El reparto no se toca al darse de baja: con él dentro, el servidor
    // rechazaba el reparto y el organizador no tenía cómo quitarlo
    const onConfirm = vi.fn();
    pintar({
      hasTeams: true,
      currentTeams: { teamAPlayerIds: ['ana', 'dani', 'eva'], teamBPlayerIds: ['bea', 'carla'] },
      onConfirm,
    });

    fireEvent.submit(screen.getByDisplayValue('manual').closest('form'));

    expect(onConfirm.mock.calls[0][0].team_a_player_ids).toEqual(['ana', 'dani']);
  });

  it('R5: las dos traducciones del aviso existen', async () => {
    for (const idioma of ['es', 'en']) {
      const textos = (await import(`../../i18n/locales/${idioma}/schedule.json`)).default;
      expect(textos.teams.replaceWarning, idioma).toBeTruthy();
    }
  });

  it('R7: con las inscripciones sin cargar no se reasigna: mandaría equipos vacíos (CodeRabbit)', () => {
    const onConfirm = vi.fn();
    pintar({ hasTeams: true, currentTeams: EQUIPOS, onConfirm, inscritosSinCargar: true });

    expect(screen.getByTestId('reasignar-sin-inscritos')).toHaveTextContent(
      'teams.enrollmentsNotLoaded'
    );
    fireEvent.submit(screen.getByDisplayValue('manual').closest('form'));
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
