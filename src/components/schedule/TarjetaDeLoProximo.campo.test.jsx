/**
 * El campo donde se juega, en cada tarjeta de «Mis Próximos Partidos» (16 oct,
 * BE #573): debajo de la fecha, pequeño y gris; sin nombre, ni la línea.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (clave, p) => (p ? `${clave} ${JSON.stringify(p)}` : clave), i18n: { language: 'es-ES' } }),
}));

const TarjetaDeLoProximo = (await import('./TarjetaDeLoProximo')).default;

const pintar = (extra) =>
  render(
    <MemoryRouter>
      <TarjetaDeLoProximo
        partido={{
          id: 'm-1',
          competitionId: 'c-1',
          competitionName: 'Ryder del club',
          tournamentType: 'RYDER_CUP',
          roundDate: '2026-10-20',
          sessionType: 'MORNING',
          matchFormat: 'SINGLES',
          status: 'SCHEDULED',
          partnerNames: [],
          opponentNames: ['Rival'],
          ...extra,
        }}
        puedeAnotar
      />
    </MemoryRouter>
  );

describe('TarjetaDeLoProximo · el campo', () => {
  it('con nombre, sale bajo la fecha', () => {
    pintar({ golfCourseName: 'Golf de Meis - Par 72' });

    expect(screen.getByTestId('campo')).toHaveTextContent('Golf de Meis - Par 72');
    // Bajo la fecha: el siguiente a «cuándo»
    expect(screen.getByTestId('cuando').nextElementSibling).toBe(screen.getByTestId('campo'));
  });

  it.each([null, undefined, ''])('sin nombre (%s), ni la línea', (golfCourseName) => {
    pintar({ golfCourseName });

    expect(screen.queryByTestId('campo')).toBeNull();
  });

  it('también en una partida de stroke play', () => {
    pintar({ esPartidaDeFranja: true, tournamentType: 'MEDAL', teeTime: '08:10', matchNumber: 1, golfCourseName: 'Golf de Meis' });

    expect(screen.getByTestId('campo')).toHaveTextContent('Golf de Meis');
  });
});
