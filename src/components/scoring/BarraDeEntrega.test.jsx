import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BarraDeEntrega from './BarraDeEntrega';

/**
 * FE #745 · al acabar el partido, entregar la tarjeta. El botón vivía solo en
 * la pestaña Tarjeta y la pantalla abre en Anotar: quien acababa el 18 no veía
 * nada que le dijera que faltaba entregar, y los partidos se quedaban abiertos.
 * Esta barra va fija abajo en las tres pestañas.
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => (opts ? `${key} ${JSON.stringify(opts)}` : key),
  }),
}));

describe('BarraDeEntrega', () => {
  it('B1: acabado y listo, dice el resultado y entrega con un toque', () => {
    const entregar = vi.fn();
    render(<BarraDeEntrega estado="entregar" marcador="2UP Europa" onEntregar={entregar} />);

    expect(screen.getByText('submit.matchOver')).toBeInTheDocument();
    expect(screen.getByText('2UP Europa')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'submit.button' }));
    expect(entregar).toHaveBeenCalledTimes(1);
  });

  it('B2: mientras se envía, el botón no se puede volver a pulsar', () => {
    render(<BarraDeEntrega estado="entregar" marcador="2UP Europa" onEntregar={vi.fn()} enviando />);

    expect(screen.getByRole('button', { name: 'submit.button' })).toBeDisabled();
  });

  it('B3: acabado con hoyos sin validar, lo dice y no ofrece entregar', () => {
    render(<BarraDeEntrega estado="faltaValidar" marcador="AS" />);

    expect(screen.getByText('submit.notReady')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('B4: entregada, dice a quién se espera', () => {
    render(<BarraDeEntrega estado="entregada" pendientes={['Luna Noche']} />);

    expect(screen.getByText('submit.alreadySubmitted')).toBeInTheDocument();
    expect(screen.getByText(/submit\.waitingForPlayers/)).toHaveTextContent('Luna Noche');
  });

  it('B5: en foursomes la tarjeta es de la pareja', () => {
    render(<BarraDeEntrega estado="entregada" esFoursomes pendientes={['Luna', 'Óscar']} />);

    expect(screen.getByText('submit.pairSubmitted')).toBeInTheDocument();
    expect(screen.getByText(/submit\.waitingForPair/)).toHaveTextContent('Luna / Óscar');
  });

  it('B6: con el partido completado ya no se espera a nadie', () => {
    render(<BarraDeEntrega estado="entregada" completado pendientes={['Luna Noche']} />);

    expect(screen.getByText('submit.matchCompleted')).toBeInTheDocument();
    expect(screen.queryByText(/submit\.waitingFor/)).not.toBeInTheDocument();
  });

  // Ronda 2 de pruebas · decidido no es acabado: se puede seguir jugando, y
  // quien entrega a mitad deja fuera de su tarjeta los hoyos que anote después
  it('B7: decidido con hoyos por jugar, dice que se puede seguir', () => {
    render(<BarraDeEntrega estado="entregar" marcador="10&8 Europa" onEntregar={vi.fn()} sePuedeSeguir />);

    expect(screen.getByText('submit.keepPlaying')).toBeInTheDocument();
  });

  it('B8: sin hoyos por jugar, no', () => {
    render(<BarraDeEntrega estado="entregar" marcador="2UP Europa" onEntregar={vi.fn()} />);

    expect(screen.queryByText('submit.keepPlaying')).toBeNull();
  });
});
