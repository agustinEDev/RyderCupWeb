import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (clave, valores) => (valores ? `${clave}|${JSON.stringify(valores)}` : clave),
  }),
}));
vi.mock('../golf_course/TeeColorBadge', () => ({
  default: ({ color }) => <span data-testid={`color-${color}`}>{color}</span>,
}));

import BloqueoDePartidos from './BloqueoDePartidos';

/**
 * Por qué una sesión con los sobres abiertos no tiene partidos (BE #361).
 *
 * Lo que la pantalla tiene que decir es A QUIÉN le falta QUÉ, no que falló:
 * con doce jugadores, «no se ha podido» deja al organizador sin saber a quién
 * arreglar.
 *
 *   #   caso                                   | qué dice
 *   ----|--------------------------------------|---------------------------------
 *   B1  a uno le falta el género               | su nombre y «le falta el género»
 *   B2  a otro el color en ese campo           | su nombre, el color y «no lo tiene»
 *   B3  otro motivo (sin jugadores)            | la frase de ese motivo
 *   B4  un motivo que esta versión no conoce   | una frase genérica, nunca la clave
 *   B5  sin motivo                             | nada
 *   B6  quien no puede generar                 | sin «pulsa Generar»: no tiene el botón
 */

const BLOQUEO = {
  reason: 'PLAYERS_WITHOUT_TEE',
  players: [
    { userId: 'u1', name: 'Bea Dos', missing: 'GENDER', teeColor: null },
    { userId: 'u2', name: 'Carla Tres', missing: 'TEE_COLOR', teeColor: 'WHITE' },
  ],
};

describe('BloqueoDePartidos', () => {
  it('B1: dice a quién le falta el género', () => {
    render(<BloqueoDePartidos bloqueo={BLOQUEO} />);

    const fila = screen.getByTestId('falta-u1');
    expect(fila).toHaveTextContent('Bea Dos');
    expect(fila).toHaveTextContent('generationBlock.missing.GENDER');
  });

  it('B2: y a quién el color en este campo, con el color', () => {
    render(<BloqueoDePartidos bloqueo={BLOQUEO} />);

    const fila = screen.getByTestId('falta-u2');
    expect(fila).toHaveTextContent('Carla Tres');
    expect(fila).toHaveTextContent('generationBlock.missing.TEE_COLOR');
    expect(screen.getByTestId('color-WHITE')).toBeInTheDocument();
  });

  it('B3: otro motivo sin jugadores dice el suyo', () => {
    render(<BloqueoDePartidos bloqueo={{ reason: 'NOT_ENOUGH_PLAYERS', players: [] }} />);

    expect(screen.getByTestId('bloqueo-de-partidos')).toHaveTextContent(
      'generationBlock.reason.NOT_ENOUGH_PLAYERS'
    );
  });

  it('B4: un motivo que esta versión no conoce no enseña la clave', () => {
    render(<BloqueoDePartidos bloqueo={{ reason: 'ALGO_NUEVO', players: [] }} />);

    const aviso = screen.getByTestId('bloqueo-de-partidos');
    expect(aviso).toHaveTextContent('generationBlock.reason.UNEXPECTED');
    expect(aviso).not.toHaveTextContent('ALGO_NUEVO');
  });

  it('B8: abiertos con las inscripciones reabiertas, dice eso (RyderCupAM, revisión de la #711)', () => {
    render(<BloqueoDePartidos bloqueo={{ reason: 'ENROLLMENT_OPEN', players: [] }} />);

    expect(screen.getByTestId('bloqueo-de-partidos')).toHaveTextContent(
      'generationBlock.reason.ENROLLMENT_OPEN'
    );
  });

  it('B9: dice quién está emparejado sin la inscripción aprobada (BE #360)', () => {
    render(
      <BloqueoDePartidos
        bloqueo={{
          reason: 'NOT_ENOUGH_PLAYERS',
          players: [{ userId: 'u9', name: 'Iván Ido', missing: 'ENROLLMENT', teeColor: null }],
        }}
      />
    );

    expect(screen.getByTestId('falta-u9')).toHaveTextContent('Iván Ido');
    expect(screen.getByTestId('falta-u9')).toHaveTextContent('generationBlock.missing.ENROLLMENT');
  });

  it('B5: sin motivo no pinta nada', () => {
    const { container } = render(<BloqueoDePartidos bloqueo={null} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('B6: «pulsa Generar» solo se lo dice a quien puede pulsarlo', () => {
    const { rerender } = render(<BloqueoDePartidos bloqueo={BLOQUEO} puedeReintentar />);
    expect(screen.getByTestId('bloqueo-de-partidos')).toHaveTextContent('generationBlock.retry');

    rerender(<BloqueoDePartidos bloqueo={BLOQUEO} />);
    expect(screen.getByTestId('bloqueo-de-partidos')).not.toHaveTextContent('generationBlock.retry');
  });

  it('B7: cada motivo y cada falta que se pinta tiene su texto en los dos idiomas', async () => {
    // Con el `t` de mentira no se ve: una clave que falta en el json sale
    // cruda al organizador, como «generationBlock.reason.PLAYERS_WITHOUT_TEE»
    const idiomas = ['es', 'en'];
    for (const idioma of idiomas) {
      const textos = (await import(`../../i18n/locales/${idioma}/schedule.json`)).default;
      for (const motivo of [
        'PLAYERS_WITHOUT_TEE',
        'NOT_ENOUGH_PLAYERS',
        'NO_TEAMS',
        'NO_GOLF_COURSE',
        'UNEXPECTED',
        'ENROLLMENT_OPEN',
      ]) {
        expect(textos.generationBlock.reason[motivo], `${idioma}: ${motivo}`).toBeTruthy();
      }
      for (const falta of ['GENDER', 'TEE_COLOR', 'ENROLLMENT', 'OTHER']) {
        expect(textos.generationBlock.missing[falta], `${idioma}: ${falta}`).toBeTruthy();
      }
    }
  });

  it('B8: una falta que esta versión no conoce dice algo, no solo el nombre', () => {
    render(
      <BloqueoDePartidos
        bloqueo={{
          reason: 'PLAYERS_WITHOUT_TEE',
          players: [{ userId: 'u9', name: 'Ana Alba', missing: 'HANDICAP', teeColor: null }],
        }}
      />
    );

    expect(screen.getByTestId('falta-u9')).toHaveTextContent('generationBlock.missing.OTHER');
  });
});

