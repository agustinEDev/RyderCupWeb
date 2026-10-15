/**
 * Un idioma mal escrito (`es_ES` en vez de `es-ES`) hace que `Intl` lance un
 * RangeError: la tarjeta no puede tumbar la pantalla por eso (revisión de la
 * FE-B). Los nombres se unen con comas y el día sale en el idioma por defecto.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (clave, p) => (p ? `${clave} ${JSON.stringify(p)}` : clave),
    i18n: { language: 'es_ES' },
  }),
}));

const TarjetaDeLoProximo = (await import('./TarjetaDeLoProximo')).default;

describe('TarjetaDeLoProximo · idioma mal escrito', () => {
  it('se pinta igual, con los nombres separados por comas', () => {
    render(
      <MemoryRouter>
        <TarjetaDeLoProximo
          partido={{
            id: 'g-1',
            esPartidaDeFranja: true,
            competitionId: 'c-1',
            competitionName: 'Medal',
            tournamentType: 'MEDAL',
            roundDate: '2026-10-12',
            teeTime: '08:10',
            matchNumber: 1,
            status: 'SCHEDULED',
            partnerNames: ['Bea', 'Cris'],
          }}
          puedeAnotar={false}
        />
      </MemoryRouter>
    );

    expect(screen.getByTestId('con-quien')).toHaveTextContent('upcomingMatches.with {"companeros":"Bea, Cris"}');
    expect(screen.getByTestId('cuando')).toHaveTextContent(/12/);
  });
});
