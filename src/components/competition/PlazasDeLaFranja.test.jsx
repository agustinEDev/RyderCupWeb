import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (clave, p) => (p ? `${clave} ${JSON.stringify(p)}` : clave), i18n: { language: 'es' } }),
}));

const { AccionDelJugador } = await import('./PlazasDeLaFranja');
const { COGER, CAMBIAR, SOLTAR } = await import('../../domain/services/PlazasEnFranjas');

/**
 * Lo que queda abierto en una franja tiene que seguir teniendo sentido cuando
 * la agenda se relee y cambia lo que se puede hacer en ella (revisor de la PR 4).
 */
const franjasPorId = {
  a: { id: 'a', roundDate: '2030-10-12', sessionType: 'MORNING' },
  b: { id: 'b', roundDate: '2030-10-13', sessionType: 'MORNING' },
  c: { id: 'c', roundDate: '2030-10-14', sessionType: 'MORNING' },
};
const props = (accion, franja = franjasPorId.c) => ({
  franja,
  accion,
  puedeElegir: true,
  userId: 'yo',
  etiqueta: (f) => ({ franja: f.sessionType, dia: f.roundDate }),
  franjasPorId,
  ocupado: false,
  hacer: vi.fn(),
  casos: { coger: { execute: vi.fn() }, soltar: { execute: vi.fn() } },
});

describe('AccionDelJugador (FE #824)', () => {
  it('si con «¿cuál dejas?» abierto la franja pasa a «coger», no se cae y lo cierra', () => {
    const { rerender } = render(<AccionDelJugador {...props({ tipo: CAMBIAR, dejar: ['a', 'b'] })} />);
    fireEvent.click(screen.getByRole('button', { name: 'franjas.switchFor' }));
    expect(screen.getByText('franjas.whichToLeave')).toBeInTheDocument();

    rerender(<AccionDelJugador {...props({ tipo: COGER })} />);

    expect(screen.queryByText('franjas.whichToLeave')).toBeNull();
    expect(screen.getByRole('button', { name: 'franjas.take' })).toBeInTheDocument();
  });

  it('si con «¿soltar?» abierto ya no es suya, la confirmación desaparece', () => {
    const { rerender } = render(<AccionDelJugador {...props({ tipo: SOLTAR }, franjasPorId.a)} />);
    fireEvent.click(screen.getByRole('button', { name: 'franjas.release' }));
    expect(screen.getByText('franjas.releaseConfirm')).toBeInTheDocument();

    rerender(<AccionDelJugador {...props({ tipo: COGER }, franjasPorId.a)} />);

    expect(screen.queryByText('franjas.releaseConfirm')).toBeNull();
  });

  it('sus botones se tocan con el dedo: 44 px de alto', () => {
    render(<AccionDelJugador {...props({ tipo: COGER })} />);

    expect(screen.getByRole('button', { name: 'franjas.take' }).className).toContain('min-h-11');
  });
});
